/* Cadernex — Online agora (só o moderador): todos os entregadores disponíveis, com ou sem GPS */
(function(){
const el=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const VEI={moto:"Moto",bike:"Bike",picape_p:"Picape P",picape_m:"Picape M",caminhao:"Caminhão"};
const hora=d=>new Date(d).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"});
const fone=w=>{const d=String(w||"").replace(/\D/g,"");return d.length===11?`(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`:d.length===10?`(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`:d};
let lista=[],aberto=false;try{aberto=localStorage.getItem("cx-on-aberto")==="1"}catch(e){}
function abre(){el("on-abre").setAttribute("aria-expanded",aberto);el("on-corpo").hidden=!aberto}
function pinta(){
  const gps=lista.filter(x=>x.gps).length,corr=lista.filter(x=>x.em_corrida>0).length;
  el("on-res").textContent=lista.length?`${lista.length} online · ${gps} com GPS${corr?` · ${corr} em corrida`:""}`:"Ninguém online agora";
  el("on-lista").innerHTML=lista.length?lista.map(x=>{const w=String(x.whats||"").replace(/\D/g,"");
    const tags=[x.gps?'<span class="ok">✓ GPS ligado</span>':'<span class="pend">GPS desligado (fora do mapa)</span>',
      x.em_corrida>0?`<span class="ok">Em corrida (${x.em_corrida})</span>`:'<span class="pend">Livre</span>'].join("");
    return `<div class="adm-it"><div class="cad-l1"><span class="t">${esc(x.nome||"(sem nome)")}</span><span class="cad-tp m">${esc(VEI[x.veiculo]||x.veiculo||"")}</span></div>
      <div class="s">${[x.regiao?esc(x.regiao):"",`online desde ${hora(x.desde)}`,`${x.entregas_hoje} entrega${x.entregas_hoje==1?"":"s"} hoje`].filter(Boolean).join(" · ")}</div>
      <div class="cad-tags">${tags}</div>
      <div class="cad-ac">${w?`<a href="https://wa.me/55${w}" target="_blank" rel="noopener">WhatsApp ${esc(fone(w))}</a>`:'<span class="s">Sem WhatsApp</span>'}${x.gps&&x.lat!=null?`<a href="https://www.google.com/maps?q=${x.lat},${x.lng}" target="_blank" rel="noopener">Ver no mapa</a>`:""}</div></div>`}).join("")
    :`<p class="empty">Quando um entregador tocar em "Ficar disponível", ele aparece aqui.</p>`;
  abre();
}
async function carregar(){
  const card=el("on-card");if(!card)return;
  if(!sb||!uid||!perfil.admin){card.hidden=true;return}
  card.hidden=false;
  const r=await sb.rpc("online_admin");
  if(r.error){el("on-res").textContent="Não deu pra carregar agora";abre();return}
  lista=r.data||[];pinta();
}
document.addEventListener("click",e=>{
  if(e.target.closest("#on-abre")){aberto=!aberto;try{localStorage.setItem("cx-on-aberto",aberto?"1":"0")}catch(x){}abre();return}
  if(e.target.closest("#on-atual"))carregar().then(()=>toast("Lista atualizada"));
});
if(typeof go==="function"){const g=go;go=function(v){g(v);if(v==="mais")carregar()}}
const _al=window.agendaLoad;window.agendaLoad=async()=>{await _al();carregar()};
if(uid)setTimeout(carregar,0);
setInterval(()=>{if(uid&&perfil.admin&&!document.hidden)carregar()},60000);
})();
