/* Cadernex — pagamento pelo app: Pix pela Woovi, com divisão automática pro Pix (CPF/CNPJ) de quem recebe */
(function(){
const CFG=window.CORRE_CONFIG||{},MP_TAXA=CFG.WOOVI_TAXA||0.008,TAXA_APP=0.14,TAXA_FIXA=1.99;
let euRecebo=null; // entregador logado recebe pelo app (Pix ativo com CPF)?
const ehLoja=()=>!!(perfil.loja&&String(perfil.loja_nome||"").trim());
const recebe={},pags={};// entregador_id -> bool ; corrida_id -> pagamento
// mesma conta do servidor: o entregador recebe o valor inteiro
const taxaCli=()=>TAXA_APP;
// quem pede paga: corrida + 14% de serviço + R$ 1,99 de taxa do app (encomenda já paga: só o Pix)
function contaTotal(valor,sem6){if(sem6){const total=Math.ceil(valor/(1-MP_TAXA)*100)/100;return{total,taxa:Math.round((total-valor)*100)/100}}
  const taxa=Math.round((valor*TAXA_APP+TAXA_FIXA)*100)/100;return{total:Math.round((valor+taxa)*100)/100,taxa}}

async function erroDe(error,data){
  if(data&&data.erro)return data.erro;
  try{const j=await error.context.json();if(j&&j.erro)return j.erro}catch(e){}
  return /Failed to send|FunctionsFetchError|not found|404/i.test(String(error&&error.message))?"O pagamento pelo app ainda não foi ligado no servidor.":"Não deu certo agora. Tente de novo.";
}

/* ---------- Recebimento: Pix (CPF/CNPJ) pela Woovi ---------- */
let chave=null; // chave Pix do cadastro: CNPJ (loja) ou CPF
async function statusLoad(){
  if(!sb||!uid||perfil.tipo==="cliente")return;
  const w=await sb.rpc("woovi_recebe",{uid});euRecebo=w.error?null:!!w.data;
  const d=await sb.from("dados_pessoais").select("cpf,cnpj").eq("user_id",uid).maybeSingle();
  if(!d.error&&d.data){const cnpj=String(d.data.cnpj||"").replace(/\D/g,""),cpf=String(d.data.cpf||"").replace(/\D/g,"");
    chave=ehLoja()&&cnpj.length===14?{t:"CNPJ",v:cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,"$1.$2.$3/$4-$5")}
      :cpf.length===11?{t:"CPF",v:"***."+cpf.slice(3,6)+"."+cpf.slice(6,9)+"-**"}:null}
  cfgRender();introRender();dispRender();pintar();
}
function cfgRender(){
  const card=$("cf-mp");if(!card)return;card.hidden=perfil.tipo==="cliente"&&!ehLoja();if(card.hidden)return;
  const st=$("cf-mp-st"),ch=$("cf-mp-chave");
  if(chave){ch.hidden=false;$("cf-mp-num").textContent=chave.t+" "+chave.v}else ch.hidden=true;
  st.innerHTML=!chave?`Complete seu cadastro com CPF${ehLoja()?" ou CNPJ":""} pra receber pelo app. <button class="link" type="button" data-cad="1" style="padding:0">Completar cadastro</button>`
    :euRecebo?`<b class="pix-on">Ativo ✓</b> Recebendo pelo app na chave abaixo.`
    :`Chave cadastrada. ${perfil.tipo==="entregador"?`Ative o Pix em Ganhos pra aceitar corridas. <button class="link" type="button" data-go="resumo" style="padding:0">Ativar</button>`:"Ative o recebimento no seu delivery."}`;
}
function dispRender(){const p=$("dp-pix");if(p)p.hidden=!(perfil.tipo==="entregador"&&euRecebo)}

/* ---------- Apresentação pro entregador (até ativar o Pix) ---------- */
const INTRO_KEY="cx-mpi-depois";
function introRender(){
  const el=$("mp-intro");if(!el)return;
  let adiado=0;try{adiado=Number(localStorage.getItem(INTRO_KEY))||0}catch(e){}
  el.hidden=!(perfil.tipo==="entregador"&&euRecebo===false&&Date.now()-adiado>3*864e5);
}
$("mpi-depois").onclick=()=>{try{localStorage.setItem(INTRO_KEY,String(Date.now()))}catch(e){}introRender();toast("Tudo bem. Você ativa o Pix quando quiser em Ganhos.")};

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
      const auto=p&&/^cxa-/.test(p.correlation_id||"");
      const onde=p&&p.provedor==="woovi"?(["enviado","manual"].includes(p.repasse_status)?"Pix enviado pro seu CPF ✓":p.repasse_status==="aguarda_entrega"?"cai no Pix do seu CPF quando você entregar, com o código do cliente":/erro/.test(p.repasse_status||"")?"Pix pro seu CPF em conferência pelo Cadernex":"enviando pro seu Pix (CPF)…"):"pago pelo app";
      el.innerHTML=p&&p.status==="pago"?`<div class="mp-pago">✓ ${auto?"Entrega já paga pelo cliente no pedido":"Cliente pagou pelo app"} · ${brl(liq)} ${onde}${Number(p.comissao)>0?` <span class="hint">(${brl(Number(p.valor))} − ${Math.round(Number(p.comissao)/Number(p.valor)*100)}% do Cadernex)</span>`:""}</div>`
        :p&&p.status==="pendente"?`<p class="hint" style="margin:0">Cliente abriu o Pix pelo app. Aguardando cair… <b>Só colete depois que aparecer "Cliente pagou".</b></p>`
        :c.status==="aceita"?`<p class="hint" style="margin:0">⏳ Aguardando o cliente pagar o Pix pelo app. <b>Só colete depois que aparecer "Cliente pagou".</b></p>`
        :euRecebo===false?`<div class="mp-box"><b>Ative seu Pix pra receber pelo app</b><p class="hint" style="margin:0">O pagamento é só pelo app: sua parte cai direto no Pix do seu CPF. Sem o Pix ativo, você não consegue aceitar corridas.</p><button class="btn full" type="button" data-go="resumo">Ativar meu Pix</button></div>`:"";
      return}
    if(p&&p.status==="pago"){el.innerHTML=`<div class="mp-pago">✓ ${/^cxa-/.test(p.correlation_id||"")?"Entrega já paga pelo cliente no pedido":"Pago pelo app · "+brl(Number(p.total))}</div>`;return}
    if(!recebe[c.entregador_id]){el.innerHTML=`<p class="hint" style="margin:0">O Pix desse entregador ainda não está pronto. Fale com ele pela conversa da corrida, ou cancele e peça de novo.</p>`;return}
    const sem6=!!(window.encCorridas&&window.encCorridas.has(c.id)),k=contaTotal(Number(c.valor),sem6);
    el.innerHTML=`<div class="mp-box"><div class="mp-linhas"><span>${c.tipo==="frete"?"Frete":"Entrega"}</span><span class="num">${brl(Number(c.valor))}</span><span>${sem6?"Taxa do Pix (sem a taxa de serviço: já cobrada na compra)":"Taxas (serviço 14% + app R$ 1,99)"}</span><span class="num">${brl(k.taxa)}</span><b>Total</b><b class="num">${brl(k.total)}</b></div>
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
// volta do link de pagamento
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
// painel financeiro: financeiro.js
async function admLoad(){if(window.cxFinLoad)return cxFinLoad()}

const _r=corrRender;corrRender=function(){_r();pintar()};
const _l=corrLoad;corrLoad=async function(){await _l();dadosLoad();sub()};
if(typeof go==="function"){const g=go;go=function(v){g(v);if(v==="config"){cfgRender();statusLoad()}if(v==="mais")admLoad()}}
const _al=window.agendaLoad;window.agendaLoad=async()=>{await _al();statusLoad();admLoad()};
if(uid){statusLoad();setTimeout(()=>{dadosLoad();sub()},0)}
})();
