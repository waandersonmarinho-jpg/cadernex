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


/* ---------- CEP e distância automática ---------- */
const cepInfo={c:null,e:null},geoAuto={c:false,e:false};
const comPrazo=(url,ms=7000)=>{const ac=new AbortController(),t=setTimeout(()=>ac.abort(),ms);return fetch(url,{signal:ac.signal,headers:{"Accept-Language":"pt-BR"}}).finally(()=>clearTimeout(t))};
const so=v=>String(v||"").replace(/\D/g,"");
function esquecer(q){if(geoAuto[q]){locs[q]=null;geoAuto[q]=false}window.kmRota=null;const n=$("pf-kmnota");if(n)n.hidden=true}
async function buscaCep(q){
  const el=$(q==="c"?"pf-ccep":"pf-ecep"),cep=so(el.value);if(cep.length!==8)return;
  try{const r=await comPrazo(`https://viacep.com.br/ws/${cep}/json/`);const d=await r.json();
    if(!r.ok||d.erro){toast("CEP não encontrado. Confira ou escreva o endereço.");return}
    cepInfo[q]=d;esquecer(q);
    const end=$(q==="c"?"pf-cend":"pf-eend"),bai=$(q==="c"?"pf-cb":"pf-eb");
    if(d.logradouro){end.value=d.logradouro+", ";end.focus();try{end.setSelectionRange(end.value.length,end.value.length)}catch(e){}}
    else{end.value="";end.focus();toast("CEP da cidade toda. Escreva a rua e o número.")}
    if(d.bairro)bai.value=d.bairro;
  }catch(e){toast("Não deu pra buscar o CEP agora. Escreva o endereço.")}
}
["c","e"].forEach(q=>{
  const el=$(q==="c"?"pf-ccep":"pf-ecep");
  el.addEventListener("input",()=>{const v=so(el.value).slice(0,8);el.value=v.length>5?v.slice(0,5)+"-"+v.slice(5):v;if(v.length===8)buscaCep(q);else cepInfo[q]=null});
  [q==="c"?"pf-cend":"pf-eend",q==="c"?"pf-cb":"pf-eb"].forEach(id=>$(id).addEventListener("input",()=>esquecer(q)));
});
// cidade de referência: a do CEP, ou a do outro ponto
const cidadeDe=q=>{const i=cepInfo[q]||cepInfo[q==="c"?"e":"c"];return i?`${i.localidade} - ${i.uf}`:""};
async function geocodifica(q){
  if(locs[q])return locs[q];
  const end=val(q==="c"?"pf-cend":"pf-eend"),bai=val(q==="c"?"pf-cb":"pf-eb"),cid=cidadeDe(q);
  if(!cid||/minha localiza/i.test(end))return null;
  const tenta=async texto=>{const r=await comPrazo(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(texto)}`);const d=await r.json();return d&&d[0]?{lat:+(+d[0].lat).toFixed(6),lng:+(+d[0].lon).toFixed(6)}:null};
  let p=await tenta(`${end}, ${bai}, ${cid}`);
  if(!p){await new Promise(r=>setTimeout(r,1100));p=await tenta(`${end}, ${cid}`)}
  if(!p&&cepInfo[q]){await new Promise(r=>setTimeout(r,1100));p=await tenta(`${bai}, ${cid}`)}
  if(p){locs[q]=p;geoAuto[q]=true}
  return p;
}
async function rotaKm(a,b){
  try{const r=await comPrazo(`https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=false`,8000);const d=await r.json();
    if(d.routes&&d.routes[0])return Math.max(0.5,Math.round(d.routes[0].distance/100)/10)}catch(e){}
  return km(a.lat,a.lng,b.lat,b.lng); // sem rota: linha reta ×1.3
}
async function calculaDistancia(){
  if(window.kmRota!=null)return;
  const nota=$("pf-kmnota");
  try{const a=await geocodifica("c");if(a&&!geoAuto.c){}else await new Promise(r=>setTimeout(r,1100));
    const b=await geocodifica("e");
    if(!a||!b){nota.hidden=false;nota.style.color="var(--muted)";nota.textContent=cidadeDe("c")?"Não achei um dos endereços no mapa. Coloque a distância em km.":"Use o CEP ou \"Minha localização\" que o app calcula a distância.";return}
    const k=await rotaKm(a,b);window.kmRota=k;$("pf-km").value=String(k).replace(".",",");sugerir();
    nota.hidden=false;nota.style.color="";nota.textContent=`Distância calculada pelo app: ${String(k).replace(".",",")} km pelo caminho das ruas. Pode ajustar se precisar.`;
  }catch(e){nota.hidden=false;nota.style.color="var(--muted)";nota.textContent="Não deu pra calcular agora. Coloque a distância em km."}
}
// km digitado à mão vale mais que o calculado
$("pf-km").addEventListener("input",()=>{window.kmRota=null});

function ir(n,rolar){
  etapa=n;
  form.querySelectorAll(".pf-etapa").forEach(e=>e.hidden=+e.dataset.etapa!==n);
  form.querySelectorAll(".pf-passos li").forEach(li=>{const i=+li.dataset.ir;li.classList.toggle("feito",i<n);if(i===n)li.setAttribute("aria-current","step");else li.removeAttribute("aria-current")});
  if(n===3)resumo();
  if(rolar)form.scrollIntoView({behavior:"smooth",block:"start"});
}
window.pfEtapa=n=>ir(n,false);

form.addEventListener("click",e=>{
  const prox=e.target.closest("[data-pf-prox]");
  if(prox){if(!ok(etapa))return;
    if(etapa===1){const t=prox.textContent;prox.disabled=true;prox.textContent="Calculando a distância…";
      calculaDistancia().finally(()=>{prox.disabled=false;prox.textContent=t;ir(2,true)});return}
    ir(etapa+1,true);return}
  if(e.target.closest("[data-pf-volta]")){ir(Math.max(1,etapa-1),true);return}
  const li=e.target.closest(".pf-passos li");
  if(li){const alvo=+li.dataset.ir;if(alvo<etapa){ir(alvo,true);return}for(let i=etapa;i<alvo;i++)if(!ok(i)){ir(i,true);return}ir(alvo,true)}
});
// Enter no teclado avança em vez de enviar o pedido antes da hora
form.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.tagName==="INPUT"&&etapa<3){e.preventDefault();const b=form.querySelector(`.pf-etapa[data-etapa="${etapa}"] [data-pf-prox]`);if(b)b.click()}});
// se o envio final achar algum problema, volta pra etapa certa
form.addEventListener("submit",e=>{if(!ok(1)){e.preventDefault();e.stopImmediatePropagation();ir(1,true);return}if(!ok(2)){e.preventDefault();e.stopImmediatePropagation();ir(2,true)}},true);
// trocar entrega/frete atualiza o resumo
$("pf-tipo").addEventListener("click",()=>setTimeout(()=>{if(etapa===3)resumo()},0));
ir(1,false);
})();
