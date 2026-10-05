/* Cadernex — várias entregas de uma vez: um lugar de coleta, vários destinos (cada destino vira uma corrida) */
(function(){
const MAX_LINHAS=8;
let cat="Comida";
function linhaHTML(i){
  return `<div class="lote-l" data-l="${i}"><div class="row" style="align-items:center"><b class="eyebrow">Destino ${i+1}</b>${i?`<button class="del" type="button" data-lrm aria-label="Tirar esse destino">✕</button>`:""}</div>
    <label>Endereço de entrega<input data-f="end" placeholder="Rua, número, ponto de referência"></label>
    <div class="grid2"><label>Bairro<input data-f="bairro" placeholder="ex.: Centro"></label><label>Telefone de quem recebe<input data-f="tel" type="tel" placeholder="opcional"></label></div>
    <label>Detalhes (opcional)<input data-f="det" maxlength="80" placeholder="ex.: 2 marmitas, pagar na entrega"></label>
    <div class="grid2"><label>Distância (km)<input data-f="km" inputmode="decimal" placeholder="ex.: 3"></label><label>Você paga (R$)<input data-f="valor" inputmode="decimal" placeholder="pela tabela"></label></div></div>`;
}
const linhas=()=>$("lt-linhas").querySelectorAll(".lote-l");
function novaLinha(){const n=linhas().length;if(n>=MAX_LINHAS){toast(`Até ${MAX_LINHAS} destinos por vez`);return}
  $("lt-linhas").insertAdjacentHTML("beforeend",linhaHTML(n));atualizaBotao()}
function atualizaBotao(){const n=linhas().length;$("lt-enviar").textContent=n>1?`Pedir ${n} entregas`:"Pedir entrega"}
function abrir(on){$("lt-painel").hidden=!on;$("fPedir").hidden=on||!!perfil.bloqueado;$("lt-abrir").hidden=on;
  if(on){if(!linhas().length)novaLinha();if(!$("lt-cend").value&&perfil.end_padrao)$("lt-cend").value=perfil.end_padrao;scrollTo(0,0)}}
$("lt-abrir").onclick=()=>abrir(true);
$("lt-voltar").onclick=()=>abrir(false);
$("lt-mais").onclick=novaLinha;
$("lt-cat").addEventListener("click",e=>{const b=e.target.closest("[data-cat]");if(!b)return;cat=b.dataset.cat;$("lt-cat").querySelectorAll("[data-cat]").forEach(x=>x.setAttribute("aria-pressed",x===b))});
$("lt-linhas").addEventListener("click",e=>{const r=e.target.closest("[data-lrm]");if(!r)return;r.closest(".lote-l").remove();
  linhas().forEach((l,i)=>{l.dataset.l=i;l.querySelector(".eyebrow").textContent="Destino "+(i+1)});atualizaBotao()});
$("lt-linhas").addEventListener("input",e=>{const l=e.target.closest(".lote-l");if(!l||e.target.dataset.f!=="km")return;const k=num(e.target.value);l.querySelector('[data-f="valor"]').placeholder=k?String(justo(k).toFixed(2)).replace(".",","):"pela tabela"});
$("fLote").onsubmit=e=>{e.preventDefault();
  const cend=$("lt-cend").value.trim(),cb=$("lt-cb").value.trim();
  if(cend.length<5){toast("Coloque o endereço de onde buscar");$("lt-cend").focus();return}
  if(cb.length<2){toast("Coloque o bairro de onde buscar");$("lt-cb").focus();return}
  if(typeof dadosOk!=="undefined"&&dadosOk===false){toast("Complete seu cadastro antes");if(typeof abrirDados==="function")abrirDados();return}
  const lista=[...linhas()].map(l=>{const g=f=>{const x=l.querySelector(`[data-f="${f}"]`);return x?x.value.trim():""};
    const k=num(g("km"))||null;let valor=num(g("valor"));if(!valor&&k)valor=justo(k);
    return{end:g("end"),bairro:g("bairro"),tel:g("tel"),k,valor,item:(g("det")?`${cat}: ${g("det")}`:cat).slice(0,120)}});
  for(const[i,x]of lista.entries()){
    if(x.end.length<5){toast(`Destino ${i+1}: coloque o endereço`);return}
    if(x.bairro.length<2){toast(`Destino ${i+1}: coloque o bairro`);return}
    if(!(x.valor>=BASE)){toast(`Destino ${i+1}: coloque a distância ou o valor (mínimo R$ 8)`);return}
  }
  const abertos=(typeof minhas!=="undefined"?minhas:[]).filter(c=>c.cliente_id===uid&&["aberta","aceita","coletada"].includes(c.status)).length,lim=perfil.loja?15:10;
  if(abertos+lista.length>lim){toast(`Você pode ter até ${lim} entregas em andamento. Agora dá pra pedir mais ${Math.max(0,lim-abertos)}.`);return}
  const b=$("lt-enviar");b.disabled=true;
  safe(async()=>{let ok=0;
    try{for(const x of lista){
      const{data,error}=await sb.from("corridas").insert({coleta_bairro:cb,entrega_bairro:x.bairro,item:x.item,valor:x.valor,veiculo:"qualquer",distancia_km:x.k}).select().single();if(error)throw error;
      const r=await sb.from("corridas_det").insert({corrida_id:data.id,coleta_end:cend,entrega_end:x.end,contato:x.tel||perfil.telefone||null,obs:null});
      if(r.error){await sb.rpc("mudar_corrida",{cid:data.id,acao:"cancelar"});throw r.error}ok++}}
    finally{b.disabled=false;if(ok&&ok<lista.length)toast(`${ok} de ${lista.length} entregas foram pedidas. Confira em Pedidos.`)}
    $("lt-linhas").innerHTML="";novaLinha();abrir(false);await corrLoad();go("pedidos");
    toast(ok>1?`${ok} entregas pedidas! Avisamos quando aceitarem.`:"Entrega pedida! Avisamos quando aceitarem.")}).finally(()=>b.disabled=false);
};
// no frete não tem várias de uma vez
if(typeof pfTipoSet==="function"){const t0=pfTipoSet;pfTipoSet=function(t){t0(t);if(t==="frete"&&!$("lt-painel").hidden)abrir(false)}}
})();
