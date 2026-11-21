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
  c.hidden=false;if(carregando)return;carregando=true;
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
          <button class="btn ghost" type="button" data-ppok="${esc(x.tipo)}|${x.ref_id}">Já mandei o Pix: marcar resolvido</button>`}
    </div>`}).join("")
    :`<p class="hint" style="margin:0">✓ Nenhum problema. Todos os Pix de entregadores e lojas saíram.</p>`;
}
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
