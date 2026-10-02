/* Cadernex — "Pedir entrega" em 3 etapas: endereços, detalhes e confirmar */
(function(){
const form=$("fPedir");if(!form)return;
let etapa=1;
const MP_TAXA=(window.CORRE_CONFIG||{}).MP_TAXA||0.0099;
const val=id=>$(id).value.trim();

function valorFinal(){const k=sugerir();let v=num($("pf-valor").value);if(!v&&k!=null)v=pfJusto(k);return{k,v}}
function totalApp(v){const t=Math.round(v*0.06*100)/100;return Math.ceil((v+t)/(1-MP_TAXA)*100)/100}

function ok(n){
  if(n===1){
    if(!val("pf-cend")){toast("Coloque o endereço de coleta");$("pf-cend").focus();return false}
    if(!val("pf-cb")){toast("Coloque o bairro da coleta");$("pf-cb").focus();return false}
    if(!val("pf-eend")){toast("Coloque o endereço de entrega");$("pf-eend").focus();return false}
    if(!val("pf-eb")){toast("Coloque o bairro da entrega");$("pf-eb").focus();return false}
  }
  if(n===2){
    if(val("pf-item").length<2){toast("Diga o que vai ser levado");$("pf-item").focus();return false}
    const{v}=valorFinal();
    if(!(v>0)){toast("Coloque a distância ou quanto você paga");$("pf-km").focus();return false}
    if(v<BASE){toast("O mínimo é R$ 8,00");$("pf-valor").focus();return false}
    const q=pfTipo==="frete"&&$("pf-quando").value?new Date($("pf-quando").value):null;
    if(q&&q<Date.now()-6e5){toast("Essa data já passou");$("pf-quando").focus();return false}
  }
  return true;
}

function resumo(){
  const{k,v}=valorFinal(),fr=pfTipo==="frete",el=$("pf-resumo");
  const aj=fr?+picked($("pf-aj")):0,an=fr?Math.max(0,Math.round(num($("pf-and").value)||0)):0;
  const q=fr&&$("pf-quando").value?new Date($("pf-quando").value):null;
  el.innerHTML=`<div class="r-rota"><div><small>Buscar</small><b data-r="c"></b></div><div><small>Entregar</small><b data-r="e"></b></div></div>
    <div class="r-lin"><span>Levar</span><b data-r="i"></b></div>
    <div class="r-lin"><span>Veículo</span><b>${esc(veiNome(pfVei()))}${aj?` · ${aj} ajudante${aj>1?"s":""}`:""}${an?` · ${an} andar${an>1?"es":""}`:""}</b></div>
    ${k?`<div class="r-lin"><span>Distância</span><b>${String(k).replace(".",",")} km</b></div>`:""}
    ${q?`<div class="r-lin"><span>Quando</span><b>${q.toLocaleString("pt-BR",{weekday:"short",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</b></div>`:""}
    <div class="r-tot"><div><span>${fr?"Frete":"Entrega"}</span><br><b class="num">${brl(v)}</b></div><span style="text-align:right">Pelo app (Pix): ${brl(totalApp(v))}<br>Em dinheiro: ${brl(v)}</span></div>`;
  el.querySelector('[data-r="c"]').textContent=`${val("pf-cend")} · ${val("pf-cb")}`;
  el.querySelector('[data-r="e"]').textContent=`${val("pf-eend")} · ${val("pf-eb")}`;
  el.querySelector('[data-r="i"]').textContent=val("pf-item");
}

function ir(n,rolar){
  etapa=n;
  form.querySelectorAll(".pf-etapa").forEach(e=>e.hidden=+e.dataset.etapa!==n);
  form.querySelectorAll(".pf-passos li").forEach(li=>{const i=+li.dataset.ir;li.classList.toggle("feito",i<n);if(i===n)li.setAttribute("aria-current","step");else li.removeAttribute("aria-current")});
  if(n===3)resumo();
  if(rolar)form.scrollIntoView({behavior:"smooth",block:"start"});
}
window.pfEtapa=n=>ir(n,false);

form.addEventListener("click",e=>{
  if(e.target.closest("[data-pf-prox]")){if(ok(etapa))ir(etapa+1,true);return}
  if(e.target.closest("[data-pf-volta]")){ir(Math.max(1,etapa-1),true);return}
  const li=e.target.closest(".pf-passos li");
  if(li){const alvo=+li.dataset.ir;if(alvo<etapa){ir(alvo,true);return}for(let i=etapa;i<alvo;i++)if(!ok(i)){ir(i,true);return}ir(alvo,true)}
});
// Enter no teclado avança em vez de enviar o pedido antes da hora
form.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.tagName==="INPUT"&&etapa<3){e.preventDefault();if(ok(etapa))ir(etapa+1,true)}});
// se o envio final achar algum problema, volta pra etapa certa
form.addEventListener("submit",e=>{if(!ok(1)){e.preventDefault();e.stopImmediatePropagation();ir(1,true);return}if(!ok(2)){e.preventDefault();e.stopImmediatePropagation();ir(2,true)}},true);
// trocar entrega/frete atualiza o resumo
$("pf-tipo").addEventListener("click",()=>setTimeout(()=>{if(etapa===3)resumo()},0));
ir(1,false);
})();
