/* Cadernex — painel financeiro do moderador (Mais → Ganhos do Cadernex)
   Cada Pix pago pelo app: corrida, frete ou pedido do delivery. Mostra o volume que passou pelo app,
   o que ficou pro Cadernex (taxas), o custo estimado do Pix na Woovi e o líquido, por período. */
(function(){
const CUSTO_PIX=0.90; // custo estimado por Pix recebido na Woovi
const brl=v=>(Number(v)||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const TIPO={corrida:"🛵 Corrida",frete:"🛻 Frete",pedido:"🛍️ Pedido"};
const PER=[["hoje","Hoje"],["7d","7 dias"],["mes","Este mês"],["mesant","Mês passado"]];
let per="mes",linhas=[],mostrar=20;
function intervalo(p){const h=new Date(),d0=new Date(h.getFullYear(),h.getMonth(),h.getDate());
  if(p==="hoje")return[d0,new Date(+d0+864e5)];
  if(p==="7d")return[new Date(+d0-6*864e5),new Date(+d0+864e5)];
  if(p==="mesant")return[new Date(h.getFullYear(),h.getMonth()-1,1),new Date(h.getFullYear(),h.getMonth(),1)];
  return[new Date(h.getFullYear(),h.getMonth(),1),new Date(h.getFullYear(),h.getMonth()+1,1)]}
function css(){if(document.getElementById("fin-css"))return;const s=document.createElement("style");s.id="fin-css";s.textContent=`
.fin-per{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:0 0 12px}.fin-per::-webkit-scrollbar{display:none}
.fin-per button{flex:none;padding:7px 12px;border-radius:999px;border:1px solid var(--line);background:var(--bg);font:inherit;font-size:13px;color:inherit;cursor:pointer}
.fin-per button[aria-pressed=true]{background:var(--ink,#111);color:var(--bg,#fff);border-color:transparent}
.fin-kpi{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.fin-k{padding:12px;border-radius:14px;background:var(--bg);box-shadow:inset 0 0 0 1px var(--line);min-width:0}
.fin-k small{display:block;font-size:12px;color:var(--muted)}.fin-k b{display:block;font:700 20px var(--display);margin-top:2px;overflow-wrap:anywhere}
.fin-k.dest{grid-column:1/-1;background:rgba(22,163,74,.1);box-shadow:inset 0 0 0 1px rgba(22,163,74,.35)}.fin-k.dest b{font-size:28px;color:var(--good)}
.fin-k em{font-style:normal;font-size:12px;color:var(--muted)}
.fin-tip{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px}.fin-tip div{padding:8px;border-radius:10px;background:var(--bg);font-size:12px;text-align:center}.fin-tip b{display:block;font-size:14px}
.fin-lst{margin-top:14px;display:flex;flex-direction:column}.fin-h{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.fin-t{display:grid;grid-template-columns:1fr auto;gap:2px 10px;padding:10px 0;border-top:1px solid var(--line);font-size:14px}
.fin-t small{color:var(--muted);font-size:12px}.fin-t .v{text-align:right;font-weight:700}.fin-t .v small{display:block;font-weight:400}
.fin-st{font-size:11px;padding:1px 6px;border-radius:6px;background:rgba(220,38,38,.12);color:#dc2626;margin-left:4px}`;document.head.appendChild(s)}
async function carregar(){
  const w=$("adm-mp");if(!w)return;if(typeof perfil==="undefined"||!perfil.admin){w.hidden=true;return}
  css();w.hidden=false;const box=$("adm-mp-lista");
  const[de,ate]=intervalo(per);box.innerHTML=`<p class="hint" style="margin:0">Carregando…</p>`;
  const r=await sb.rpc("adm_financeiro",{de:de.toISOString(),ate:ate.toISOString()});
  if(r.error){box.innerHTML=`<p class="hint" style="margin:0">${/adm_financeiro/.test(r.error.message||"")?"Falta rodar o financeiro.sql no banco.":"Não carregou. Confira a internet."}</p>`;return}
  linhas=r.data||[];mostrar=20;render();
}
function render(){
  const box=$("adm-mp-lista");if(!box)return;
  const n=linhas.length,vol=linhas.reduce((s,x)=>s+Number(x.total),0),rep=linhas.reduce((s,x)=>s+Number(x.repasse),0),
    bruto=linhas.reduce((s,x)=>s+Number(x.taxa),0),pix=n*CUSTO_PIX,liq=bruto-pix;
  const por=t=>{const l=linhas.filter(x=>x.tipo===t);return{n:l.length,v:l.reduce((s,x)=>s+Number(x.taxa),0)}};
  const pend=linhas.filter(x=>!["enviado","manual","aguarda_entrega"].includes(x.repasse_status)).length;
  const lista=linhas.slice(0,mostrar).map(x=>{const d=new Date(x.quando);
    return`<div class="fin-t"><span><b>${TIPO[x.tipo]||x.tipo}${x.numero?" #"+x.numero:""}</b>${["enviado","manual"].includes(x.repasse_status)?"":x.repasse_status==="aguarda_entrega"?`<span class="fin-st" style="background:rgba(127,127,127,.15);color:var(--muted)">motoboy recebe na entrega</span>`:`<span class="fin-st">repasse ${esc(x.repasse_status||"pendente")}</span>`}<br>
      <small>${d.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})} ${d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})} · ${esc(x.pagador)} → ${esc(x.recebedor)}</small></span>
      <span class="v">+ ${brl(x.taxa)}<small>de ${brl(x.total)}</small></span></div>`}).join("");
  box.innerHTML=`<div class="fin-per" role="group" aria-label="Período">${PER.map(([k,t])=>`<button type="button" data-finp="${k}" aria-pressed="${k===per}">${t}</button>`).join("")}</div>
    ${n?`<div class="fin-kpi">
      <div class="fin-k dest"><small>Lucro líquido estimado</small><b>${brl(liq)}</b><em>Taxas ${brl(bruto)} − Pix Woovi ${brl(pix)} (${n} × ${brl(CUSTO_PIX)})</em></div>
      <div class="fin-k"><small>Transações</small><b>${n}</b><em>ticket médio ${brl(vol/n)}</em></div>
      <div class="fin-k"><small>Receita bruta (taxas)</small><b>${brl(bruto)}</b><em>${vol?((bruto/vol)*100).toFixed(1).replace(".",","):0}% do volume</em></div>
      <div class="fin-k"><small>Volume pelo app</small><b>${brl(vol)}</b><em>tudo que os clientes pagaram</em></div>
      <div class="fin-k"><small>Repassado</small><b>${brl(rep)}</b><em>${pend?`<span style="color:#dc2626">${pend} pendente${pend>1?"s":""}</span>`:"entregadores e lojas ✓"}</em></div>
    </div>
    <div class="fin-tip">${["corrida","frete","pedido"].map(t=>{const p=por(t);return`<div>${TIPO[t]}<b>${brl(p.v)}</b>${p.n} transaç${p.n===1?"ão":"ões"}</div>`}).join("")}</div>
    <div class="fin-lst"><div class="fin-h"><b>Transações</b><button class="link" type="button" data-fincsv style="padding:0">Baixar planilha (CSV)</button></div>${lista}
      ${n>mostrar?`<button class="btn ghost full" type="button" data-finmais style="margin-top:8px">Ver mais (${n-mostrar})</button>`:""}</div>
    <p class="hint" style="margin:10px 0 0;font-size:12px">Taxa = o que fica no CNPJ em cada Pix (serviço, taxa do app e comissão). O custo do Pix é uma estimativa: confira o valor exato no extrato da Woovi. Não inclui impostos.</p>`
    :`<p class="hint" style="margin:0">Nenhum pagamento pelo app nesse período.</p>`}`;
}
function csv(){
  const L=[["Data","Tipo","Número","Quem pagou","Quem recebeu","Total pago","Repasse","Taxa Cadernex","Situação do repasse"]].concat(linhas.map(x=>[new Date(x.quando).toLocaleString("pt-BR"),x.tipo,x.numero||"",x.pagador,x.recebedor,Number(x.total).toFixed(2).replace(".",","),Number(x.repasse).toFixed(2).replace(".",","),Number(x.taxa).toFixed(2).replace(".",","),x.repasse_status||"pendente"]));
  const t="﻿"+L.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(";")).join("\r\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([t],{type:"text/csv;charset=utf-8"}));a.download=`cadernex-financeiro-${per}.csv`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);
}
document.addEventListener("click",e=>{
  const p=e.target.closest("[data-finp]");if(p){per=p.dataset.finp;carregar();return}
  if(e.target.closest("[data-finmais]")){mostrar+=30;render();return}
  if(e.target.closest("[data-fincsv]"))csv();
});
window.cxFinLoad=carregar;
})();
