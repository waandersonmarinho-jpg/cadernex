/* Cadernex — painel do moderador: pagamentos com problema
   Mostra corridas e pedidos pagos cujo Pix pro entregador/loja não saiu, e corridas sem pagamento.
   O moderador manda o Pix pelo painel da Woovi e marca aqui como resolvido. */
(function(){
const el=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const quando=d=>d?new Date(d).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}):"—";
const TIPO={corrida:"Corrida paga · Pix do entregador não saiu",pedido:"Pedido do delivery · Pix da loja não saiu","sem pagamento":"Corrida sem pagamento pelo app"};
let lista=[],carregando=false;
async function carregar(){
  const c=el("pp-card");if(!c)return;
  if(!sb||!uid||!perfil.admin){c.hidden=true;return}
  c.hidden=false;caixaTeste();if(carregando)return;carregando=true;
  const r=await sb.rpc("adm_pagamentos_problemas");carregando=false;
  if(r.error){el("pp-n").textContent="!";el("pp-lista").innerHTML=`<p class="hint" style="margin:0">Não deu pra carregar. Se ainda não rodou o SQL do painel, rode no Supabase.</p>`;return}
  lista=r.data||[];pinta();
}
function pinta(){
  const n=el("pp-n");n.textContent=lista.length;n.className="pp-n "+(lista.length?"alerta":"ok");
  el("pp-lista").innerHTML=lista.length?lista.map(x=>{
    const recente=x.situacao==="enviando"&&Date.now()-new Date(x.quando)<10*60000;
    return`<div class="pp-it${recente?" aviso":""}">
      <b>${esc(TIPO[x.tipo]||x.tipo)}</b>
      <div class="row"><span>${esc(x.quem)}${x.chave?` <small class="hint">· ${esc(x.chave)}</small>`:""}</span><b class="num">${brl(Number(x.valor||0))}</b></div>
      <small class="hint">Situação: ${esc(x.situacao)}${recente?" (ainda enviando, espere uns minutos)":""} · ${quando(x.quando)}</small>
      ${x.tipo==="sem pagamento"?`<small class="hint">Confira com o cliente e o entregador. Pelo "só Pix" isso não devia acontecer.</small>`
        :`<small class="hint">Mande ${brl(Number(x.valor||0))} pelo painel da Woovi pro Pix dele e depois marque aqui.</small>
          <button class="btn" type="button" data-pptenta="${esc(x.tipo)}|${x.ref_id}">🔁 Tentar o repasse de novo</button>
          <button class="btn ghost" type="button" data-ppok="${esc(x.tipo)}|${x.ref_id}">Já mandei o Pix: marcar resolvido</button>`}
    </div>`}).join("")
    :`<p class="hint" style="margin:0">✓ Nenhum problema. Todos os Pix de entregadores e lojas saíram.</p>`;
}
/* ---------- teste de repasse: confere lojas e motoqueiros (sem mexer em dinheiro) e manda R$ 1 de teste ---------- */
let teste=null;
function caixaTeste(){const c=el("pp-card");if(!c||el("pt-box"))return;const d=document.createElement("div");d.id="pt-box";d.className="stack pt-box";
  d.innerHTML=`<div class="row"><b>🧪 Teste de repasse</b><button class="btn ghost" type="button" id="pt-run">Rodar teste</button></div>
  <small class="hint" style="margin:0">Confere se cada loja e motoqueiro está pronto pra receber o Pix: chave válida, subconta na Woovi e saldo parado. Não mexe em dinheiro.</small>
  <div class="stack" id="pt-lista"></div>`;c.appendChild(d)}
const IC={erro:"❌",atencao:"⚠️",ok:"✅"};
function pintaTeste(){const w=el("pt-lista");if(!w||!teste)return;
  if(!teste.length){w.innerHTML=`<p class="hint" style="margin:0">Nenhuma loja ou motoqueiro com cadastro pra receber ainda.</p>`;return}
  const n={erro:0,atencao:0,ok:0};teste.forEach(x=>n[x.situacao]++);
  w.innerHTML=`<small class="hint" style="margin:0">❌ ${n.erro} com problema · ⚠️ ${n.atencao} pra conferir · ✅ ${n.ok} prontos</small>`+teste.map(x=>`<div class="pp-it pt-${x.situacao}">
    <div class="row"><b>${IC[x.situacao]} ${esc(x.nome)}</b><small class="hint">${x.papel==="loja"?"Loja":"Motoqueiro"}</small></div>
    <small class="hint">${x.chave?`Subconta: ${esc(x.chave)}${x.naWoovi===false?" (não achada)":""}`:"Sem subconta ainda"}${x.saldo!=null?` · saldo ${brl(x.saldo)}`:""}</small>
    ${x.avisos.map(a=>`<small class="pt-av">${IC[a.n]} ${esc(a.t)}</small>`).join("")}
    <button class="btn ghost" type="button" data-ptpix="${x.user_id}">Mandar R$ 1,00 de teste pro Pix</button>
  </div>`).join("")}
async function rodarTeste(b){b.disabled=true;b.textContent="Testando…";
  try{const r=await sb.functions.invoke("woovi-teste",{body:{acao:"diagnostico"}});
    if(r.error||!r.data||r.data.erro){toast((r.data&&r.data.erro)||"Não deu pra rodar. Publicou a função woovi-teste?");return}
    teste=r.data.lista||[];pintaTeste()}
  finally{b.disabled=false;b.textContent="Rodar de novo"}}
document.addEventListener("click",e=>{
  if(e.target.closest("#pt-run")){rodarTeste(e.target.closest("#pt-run"));return}
  const px=e.target.closest("[data-ptpix]");if(px){
    if(px.dataset.ok!=="1"){px.dataset.ok="1";px.textContent="Toque de novo: sai R$ 1,00 do saldo do Cadernex";return}
    px.disabled=true;px.textContent="Mandando R$ 1,00…";
    (async()=>{const r=await sb.functions.invoke("woovi-teste",{body:{acao:"pix_teste",user_id:px.dataset.ptpix}});const d=r.data||{};
      if(d.ok){px.textContent=`✅ R$ 1,00 enviado pra ${d.chave}. Peça pra pessoa confirmar que caiu.`}
      else{px.disabled=false;px.dataset.ok="";px.textContent="Mandar R$ 1,00 de teste pro Pix";
        toast(d.motivo?`Falhou (${d.etapa}): ${d.motivo}`:(d.erro||"Não deu pra mandar o teste."))}})();return}
  const te=e.target.closest("[data-pptenta]");if(te){const[tp,id]=te.dataset.pptenta.split("|");te.disabled=true;te.textContent="Tentando…";
    (async()=>{let ok=false,msg="";
      if(tp==="pedido"){const r=await sb.functions.invoke("woovi-teste",{body:{acao:"tentar",id}});const d=r.data||{};ok=!!d.ok;msg=d.erro||(d.repasse_status?`Situação agora: ${d.repasse_status}`:"")}
      else{const r=await sb.rpc("adm_repasse_tentar",{cid:id});ok=!r.error;msg=r.error?r.error.message:"Pedido enviado. Confira em 1 minuto."}
      toast(ok?(tp==="pedido"?"Repasse enviado ✓":msg):("Ainda não saiu. "+msg));te.disabled=false;te.textContent="🔁 Tentar o repasse de novo";setTimeout(carregar,tp==="pedido"?300:60000)})();return}
});
document.addEventListener("click",e=>{
  if(e.target.closest("#pp-atual")){carregar().then(()=>toast("Painel atualizado"));return}
  const b=e.target.closest("[data-ppok]");if(!b)return;
  if(b.dataset.ok!=="1"){b.dataset.ok="1";b.textContent="Toque de novo pra confirmar";return}
  const[tp,id]=b.dataset.ppok.split("|");b.disabled=true;
  safe(async()=>{const r=await sb.rpc("adm_repasse_manual",{tp,rid:id});if(r.error)throw r.error;lista=lista.filter(x=>!(x.tipo===tp&&x.ref_id===id));pinta()},"Marcado como resolvido ✓");
});
if(typeof go==="function"){const g=go;go=function(v){g(v);if(v==="mais")carregar()}}
const _al=window.agendaLoad;window.agendaLoad=async()=>{await _al();carregar()};
setInterval(()=>{if(!document.hidden&&el("pp-card")&&!el("pp-card").hidden&&document.querySelector("#v-mais:not([hidden])"))carregar()},60000);
if(uid)setTimeout(carregar,0);
})();
