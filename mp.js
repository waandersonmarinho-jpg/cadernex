/* Cadernex — pagamento pelo app: corridas por Pix na Woovi (divisão automática); Mercado Pago só nas vendas das lojas */
(function(){
const CFG=window.CORRE_CONFIG||{},CID=CFG.MP_CLIENT_ID,MP_TAXA=CFG.WOOVI_TAXA||0.008,TAXA_APP=0.10;
const ST_KEY="cx-mp-state";
let conectado=null; // loja logada tem conta MP ligada? (vendas da loja)
let euRecebo=null; // entregador logado recebe pelo app (Pix ativo com CPF)?
const ehLoja=()=>!!(perfil.loja&&String(perfil.loja_nome||"").trim());
const recebe={},pags={};// entregador_id -> bool ; corrida_id -> pagamento
const retorno=()=>location.origin+"/";
// mesma conta do servidor: o entregador recebe o valor inteiro
function contaTotal(valor,sem6){const t=sem6?0:Math.round(valor*TAXA_APP*100)/100;const total=Math.ceil((valor+t)/(1-MP_TAXA)*100)/100;return{total,taxa:Math.round((total-valor)*100)/100}}

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
  conectado=true;cfgRender();introRender();toast("Conta Mercado Pago conectada ✓ Agora os clientes podem te pagar pelo app.");
  if(typeof go==="function")go("config");
}
window.mpConectar=conectar;
async function statusLoad(){
  if(!sb||!uid||perfil.tipo==="cliente")return;
  const r=await sb.rpc("mp_conectado");conectado=r.error?null:!!r.data;
  const w=await sb.rpc("woovi_recebe",{uid});euRecebo=w.error?null:!!w.data;cfgRender();introRender();pintar();
}
function cfgRender(){
  const card=$("cf-mp");if(!card)return;card.hidden=perfil.tipo==="cliente"||!ehLoja();window.mpConectado=conectado;document.dispatchEvent(new Event("cx-mp"));if(card.hidden)return;
  const st=$("cf-mp-st"),b=$("cf-mp-btn"),d=$("cf-mp-off");
  if(conectado===null){st.textContent="O pagamento pelo app está indisponível no momento.";b.hidden=true;d.hidden=true;return}
  b.hidden=!!conectado;d.hidden=!conectado;
  st.innerHTML=conectado?`<b class="pix-on">Conectado ✓</b> As vendas da sua loja pelo app caem na sua conta Mercado Pago.`
    :`Conecte sua conta Mercado Pago pra receber as vendas da sua loja pelo app. As corridas não precisam disso: caem no seu Pix (CPF).`;
}
$("cf-mp-btn").onclick=conectar;

/* ---------- Apresentação pro entregador (até conectar) ---------- */
const INTRO_KEY="cx-mpi-depois";
function introRender(){
  const el=$("mp-intro");if(!el)return;
  let adiado=0;try{adiado=Number(localStorage.getItem(INTRO_KEY))||0}catch(e){}
  el.hidden=true; // corridas agora caem no Pix (CPF) pela Woovi: não precisa mais conectar o Mercado Pago
}
$("mpi-con").onclick=conectar;
$("mpi-depois").onclick=()=>{try{localStorage.setItem(INTRO_KEY,String(Date.now()))}catch(e){}introRender();toast("Tudo bem. O botão de conectar fica em Configurações.")};
$("cf-mp-off").onclick=()=>{const b=$("cf-mp-off");if(b.dataset.ok!=="1"){b.dataset.ok="1";b.textContent="Toque de novo pra desconectar";return}
  b.dataset.ok="";safe(async()=>{const{error}=await sb.rpc("mp_desconectar");if(error)throw error;conectado=false;cfgRender();introRender();b.textContent="Desconectar"},"Conta desconectada")};

/* ---------- Cartões das corridas ---------- */
async function dadosLoad(){
  if(!sb||!uid||typeof minhas==="undefined")return;
  const ids=minhas.filter(c=>c.entregador_id&&["aceita","coletada","entregue"].includes(c.status)).map(c=>c.id);
  if(ids.length){const r=await sb.from("pagamentos").select("*").in("corrida_id",ids);if(!r.error)r.data.forEach(p=>pags[p.corrida_id]=p)}
  const ents=[...new Set(minhas.filter(c=>c.cliente_id===uid&&c.entregador_id).map(c=>c.entregador_id))].filter(e=>recebe[e]===undefined);
  for(const e of ents){const r=await sb.rpc("woovi_recebe",{uid:e});recebe[e]=!r.error&&!!r.data}
  pintar();
}
function pintar(){
  document.querySelectorAll(".mpbox[data-mp]").forEach(el=>{
    const c=minhas.find(x=>x.id===el.dataset.mp);if(!c)return;const p=pags[c.id];
    if(el.dataset.papel==="ent"){
      const liq=Number(p&&p.valor)-Number(p&&p.comissao||0);
      const onde=p&&p.provedor==="woovi"?(["enviado","manual"].includes(p.repasse_status)?"Pix enviado pro seu CPF ✓":p.repasse_status==="erro"?"Pix pro seu CPF em conferência pelo Cadernex":"enviando pro seu Pix (CPF)…"):"na sua conta Mercado Pago";
      el.innerHTML=p&&p.status==="pago"?`<div class="mp-pago">✓ Cliente pagou pelo app · ${brl(liq)} ${onde}${Number(p.comissao)>0?` <span class="hint">(${brl(Number(p.valor))} − ${Math.round(Number(p.comissao)/Number(p.valor)*100)}% do Cadernex)</span>`:""}</div>`
        :p&&p.status==="pendente"?`<p class="hint" style="margin:0">Cliente abriu o Pix pelo app. Aguardando cair… <b>Só colete depois que aparecer "Cliente pagou".</b></p>`
        :c.status==="aceita"?`<p class="hint" style="margin:0">⏳ Aguardando o cliente pagar o Pix pelo app. <b>Só colete depois que aparecer "Cliente pagou".</b></p>`
        :euRecebo===false?`<div class="mp-box"><b>Ative seu Pix pra receber pelo app</b><p class="hint" style="margin:0">O pagamento é só pelo app: sua parte cai direto no Pix do seu CPF. Sem o Pix ativo, você não consegue aceitar corridas.</p><button class="btn full" type="button" data-go="resumo">Ativar meu Pix</button></div>`:"";
      return}
    if(p&&p.status==="pago"){el.innerHTML=`<div class="mp-pago">✓ Pago pelo app · ${brl(Number(p.total))}</div>`;return}
    if(!recebe[c.entregador_id]){el.innerHTML=`<p class="hint" style="margin:0">O Pix desse entregador ainda não está pronto. Fale com ele pela conversa da corrida, ou cancele e peça de novo.</p>`;return}
    const sem6=!!(window.encCorridas&&window.encCorridas.has(c.id)),k=contaTotal(Number(c.valor),sem6);
    el.innerHTML=`<div class="mp-box"><div class="mp-linhas"><span>${c.tipo==="frete"?"Frete":"Entrega"}</span><span class="num">${brl(Number(c.valor))}</span><span>${sem6?"Taxa do Pix (sem a taxa de serviço: já cobrada na compra)":"Taxa de serviço (Cadernex 10% + Pix)"}</span><span class="num">${brl(k.taxa)}</span><b>Total</b><b class="num">${brl(k.total)}</b></div>
      <button class="btn full" type="button" data-mppagar="${c.id}">Pagar ${brl(k.total)} pelo app (Pix)</button>
      <div class="wv-pix" data-wv="${c.id}"></div>
      <p class="hint" style="margin:0;font-size:12px">${p&&p.status==="recusado"?"O último Pix venceu ou não passou. Gere outro. ":""}Você paga um Pix só. A parte do entregador cai direto no Pix dele, na hora.</p></div>`;
    if(p&&p.provedor==="woovi"&&p.status==="pendente"&&p.brcode&&new Date(p.expira_em)>Date.now())mostraPix(c.id,{brcode:p.brcode,qrcode:p.qrcode,url:p.link});
  });
}
document.addEventListener("click",async e=>{
  const b=e.target.closest("[data-mppagar]");if(!b)return;
  b.disabled=true;const t=b.textContent;b.textContent="Gerando o Pix…";
  const{data,error}=await sb.functions.invoke("woovi-pagar",{body:{corrida_id:b.dataset.mppagar}});
  b.disabled=false;b.textContent=t;
  if(error||!data||!data.brcode){toast(await erroDe(error,data));return}
  mostraPix(b.dataset.mppagar,data);
});
// mostra o QR e o copia e cola do Pix dentro do pedido
function mostraPix(cid,d){
  const w=document.querySelector(`.wv-pix[data-wv="${cid}"]`);if(!w)return;
  const esc=x=>String(x||"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  const qr=/^https:\/\//.test(d.qrcode||"")?`<img src="${esc(d.qrcode)}" alt="QR Code do Pix" width="200" height="200" style="display:block;margin:6px auto;background:#fff;border-radius:8px">`:"";
  w.innerHTML=`${qr}<button class="btn full" type="button" data-wvcopia="${cid}">Copiar Pix copia e cola</button>
    ${/^https:\/\//.test(d.url||"")?`<a class="link" href="${esc(d.url)}" target="_blank" rel="noopener" style="display:block;text-align:center;margin-top:6px">Abrir página do Pix</a>`:""}
    <p class="hint" style="margin:4px 0 0;font-size:12px;text-align:center">Cole no app do seu banco, em Pix → Copia e cola. Vale 30 minutos.</p>`;
  w.dataset.code=d.brcode;
}
document.addEventListener("click",async e=>{
  const b=e.target.closest("[data-wvcopia]");if(!b)return;
  const w=b.closest(".wv-pix"),code=w&&w.dataset.code;if(!code)return;
  try{await navigator.clipboard.writeText(code);toast("Pix copiado ✓ Cole no app do seu banco.")}
  catch(_){prompt("Copie o código do Pix:",code)}
});
// volta do Mercado Pago
if(/#pago/.test(location.hash)){history.replaceState(null,"",location.pathname);setTimeout(()=>{toast("Pagamento enviado! Assim que o Pix cair, aparece Pago ✓ no pedido.");if(typeof go==="function")go("pedidos")},800)}

// reserva do tempo real: se o aviso do Pix atrasar (sinal fraco, app em segundo plano), confere a cada 8 s
// enquanto houver corrida aceita esperando pagamento na tela
setInterval(()=>{
  if(document.hidden||!sb||!uid||typeof minhas==="undefined")return;
  const esperando=minhas.some(c=>c.entregador_id&&["aceita","coletada"].includes(c.status)&&!(pags[c.id]&&pags[c.id].status==="pago"));
  if(esperando)dadosLoad();
},8000);
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
