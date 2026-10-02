/* Cadernex — pagamento pelo app com Mercado Pago (6% pro Cadernex, pago pelo cliente) */
(function(){
const CFG=window.CORRE_CONFIG||{},CID=CFG.MP_CLIENT_ID,MP_TAXA=CFG.MP_TAXA||0.0099,TAXA_APP=0.06;
const ST_KEY="cx-mp-state";
let conectado=null; // entregador logado tem conta MP ligada?
const recebe={},pags={};// entregador_id -> bool ; corrida_id -> pagamento
const retorno=()=>location.origin+"/";
// mesma conta do servidor: o entregador recebe o valor inteiro
function contaTotal(valor){const t=Math.round(valor*TAXA_APP*100)/100;const total=Math.ceil((valor+t)/(1-MP_TAXA)*100)/100;return{total,taxa:Math.round((total-valor)*100)/100}}

async function erroDe(error,data){
  if(data&&data.erro)return data.erro;
  try{const j=await error.context.json();if(j&&j.erro)return j.erro}catch(e){}
  return /Failed to send|FunctionsFetchError|not found|404/i.test(String(error&&error.message))?"O pagamento pelo app ainda não foi ligado no servidor.":"Não deu certo agora. Tente de novo.";
}

/* ---------- Entregador: conectar a conta Mercado Pago ---------- */
function conectar(){
  if(!CID){toast("Falta configurar o Mercado Pago no app.");return}
  const st=(crypto.randomUUID?crypto.randomUUID():String(Math.random()).slice(2));
  try{localStorage.setItem(ST_KEY,st)}catch(e){}
  location.href=`https://auth.mercadopago.com.br/authorization?client_id=${encodeURIComponent(CID)}&response_type=code&platform_id=mp&state=${encodeURIComponent(st)}&redirect_uri=${encodeURIComponent(retorno())}`;
}
async function voltouDoMP(){ // o Mercado Pago devolve ?code=...&state=...
  const q=new URLSearchParams(location.search),code=q.get("code"),st=q.get("state");
  if(!code)return;
  history.replaceState(null,"",location.pathname+"#config");
  let esperado=null;try{esperado=localStorage.getItem(ST_KEY);localStorage.removeItem(ST_KEY)}catch(e){}
  if(!esperado||st!==esperado){toast("Conexão com o Mercado Pago não confirmada. Tente de novo.");return}
  toast("Conectando sua conta Mercado Pago…");
  const{data,error}=await sb.functions.invoke("mp-conectar",{body:{code,redirect_uri:retorno()}});
  if(error||!data||!data.ok){toast(await erroDe(error,data));return}
  conectado=true;cfgRender();toast("Conta Mercado Pago conectada ✓ Agora os clientes podem te pagar pelo app.");
  if(typeof go==="function")go("config");
}
async function statusLoad(){
  if(!sb||!uid||perfil.tipo==="cliente")return;
  const r=await sb.rpc("mp_conectado");conectado=r.error?null:!!r.data;cfgRender();pintar();
}
function cfgRender(){
  const card=$("cf-mp");if(!card)return;card.hidden=perfil.tipo==="cliente";if(card.hidden)return;
  const st=$("cf-mp-st"),b=$("cf-mp-btn"),d=$("cf-mp-off");
  if(conectado===null){st.textContent="Falta ligar o pagamento pelo app no banco (mp.sql).";b.hidden=true;d.hidden=true;return}
  b.hidden=!!conectado;d.hidden=!conectado;
  st.innerHTML=conectado?`<b class="pix-on">Conectado ✓</b> Quando o cliente paga pelo app, o valor da corrida cai inteiro na sua conta Mercado Pago.`
    :`Conecte sua conta Mercado Pago pra receber pelo app. O cliente paga por Pix e o dinheiro cai direto na sua conta. Você recebe o valor inteiro da corrida.`;
}
$("cf-mp-btn").onclick=conectar;
$("cf-mp-off").onclick=()=>{const b=$("cf-mp-off");if(b.dataset.ok!=="1"){b.dataset.ok="1";b.textContent="Toque de novo pra desconectar";return}
  b.dataset.ok="";safe(async()=>{const{error}=await sb.rpc("mp_desconectar");if(error)throw error;conectado=false;cfgRender();b.textContent="Desconectar"},"Conta desconectada")};

/* ---------- Cartões das corridas ---------- */
async function dadosLoad(){
  if(!sb||!uid||typeof minhas==="undefined")return;
  const ids=minhas.filter(c=>c.entregador_id&&["aceita","coletada","entregue"].includes(c.status)).map(c=>c.id);
  if(ids.length){const r=await sb.from("pagamentos").select("*").in("corrida_id",ids);if(!r.error)r.data.forEach(p=>pags[p.corrida_id]=p)}
  const ents=[...new Set(minhas.filter(c=>c.cliente_id===uid&&c.entregador_id).map(c=>c.entregador_id))].filter(e=>recebe[e]===undefined);
  for(const e of ents){const r=await sb.rpc("mp_recebe",{uid:e});recebe[e]=!r.error&&!!r.data}
  pintar();
}
function pintar(){
  document.querySelectorAll(".mpbox[data-mp]").forEach(el=>{
    const c=minhas.find(x=>x.id===el.dataset.mp);if(!c)return;const p=pags[c.id];
    if(el.dataset.papel==="ent"){
      el.innerHTML=p&&p.status==="pago"?`<div class="mp-pago">✓ Cliente pagou pelo app · ${brl(Number(p.valor))} na sua conta Mercado Pago</div>`
        :p&&p.status==="pendente"?`<p class="hint" style="margin:0">Cliente abriu o pagamento pelo app. Aguardando o Pix cair…</p>`
        :conectado===false?`<div class="mp-box"><b>Conecte seu Mercado Pago pra receber pelo app</b><p class="hint" style="margin:0">Sem isso, o cliente só consegue te pagar em dinheiro na entrega.</p><button class="btn full" type="button" data-go="config">Conectar Mercado Pago</button></div>`:"";
      return}
    if(p&&p.status==="pago"){el.innerHTML=`<div class="mp-pago">✓ Pago pelo app · ${brl(Number(p.total))}</div>`;return}
    if(!recebe[c.entregador_id]){el.innerHTML=`<p class="hint" style="margin:0">Esse entregador ainda não recebe pelo app. Pague ${brl(Number(c.valor))} em dinheiro na entrega.</p>`;return}
    const k=contaTotal(Number(c.valor));
    el.innerHTML=`<div class="mp-box"><div class="mp-linhas"><span>${c.tipo==="frete"?"Frete":"Entrega"}</span><span class="num">${brl(Number(c.valor))}</span><span>Taxa de serviço (Cadernex 6% + Pix)</span><span class="num">${brl(k.taxa)}</span><b>Total</b><b class="num">${brl(k.total)}</b></div>
      <button class="btn full" type="button" data-mppagar="${c.id}">Pagar ${brl(k.total)} pelo app (Pix)</button>
      <p class="hint" style="margin:0;font-size:12px">${p&&p.status==="recusado"?"O último pagamento não passou. Tente de novo. ":""}Abre o Mercado Pago, você paga no Pix e volta pro Cadernex. O entregador recebe o valor inteiro da corrida.</p></div>`;
  });
}
document.addEventListener("click",async e=>{
  const b=e.target.closest("[data-mppagar]");if(!b)return;
  b.disabled=true;const t=b.textContent;b.textContent="Abrindo o Mercado Pago…";
  const{data,error}=await sb.functions.invoke("mp-pagar",{body:{corrida_id:b.dataset.mppagar}});
  if(error||!data||!data.url){b.disabled=false;b.textContent=t;toast(await erroDe(error,data));return}
  location.href=data.url;
});
// volta do Mercado Pago
if(/#pago/.test(location.hash)){history.replaceState(null,"",location.pathname);setTimeout(()=>{toast("Pagamento enviado! Assim que o Pix cair, aparece Pago ✓ no pedido.");if(typeof go==="function")go("pedidos")},800)}

// tempo real: atualiza quando o pagamento muda
let canal=null;
function sub(){if(canal||!sb.channel)return;canal=sb.channel("pagamentos").on("postgres_changes",{event:"*",schema:"public",table:"pagamentos"},p=>{const n=p.new;if(!n||!n.corrida_id)return;const antes=pags[n.corrida_id];pags[n.corrida_id]=n;pintar();if(n.status==="pago"&&(!antes||antes.status!=="pago"))toast(n.entregador_id===uid?"💰 Cliente pagou pelo app!":"Pagamento confirmado ✓")}).subscribe()}

/* ---------- Moderador: quanto o Cadernex recebeu ---------- */
async function admLoad(){
  const w=$("adm-mp");if(!w)return;if(!perfil.admin){w.hidden=true;return}
  const r=await sb.rpc("mp_resumo");if(r.error){w.hidden=true;return}w.hidden=false;
  $("adm-mp-lista").innerHTML=r.data.length?r.data.map(x=>`<div class="row"><span>${x.mes} · ${x.corridas} corrida${x.corridas>1?"s":""}</span><b class="num">${brl(Number(x.taxa))}</b></div>`).join(""):`<p class="hint" style="margin:0">Nenhum pagamento pelo app ainda.</p>`;
}

const _r=corrRender;corrRender=function(){_r();pintar()};
const _l=corrLoad;corrLoad=async function(){await _l();dadosLoad();sub()};
if(typeof go==="function"){const g=go;go=function(v){g(v);if(v==="config"){cfgRender();statusLoad()}if(v==="mais")admLoad()}}
const _al=window.agendaLoad;window.agendaLoad=async()=>{await _al();statusLoad();voltouDoMP();admLoad()};
if(uid){statusLoad();voltouDoMP();setTimeout(()=>{dadosLoad();sub()},0)}
})();
