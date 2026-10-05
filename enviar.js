/* Cadernex — o que vai enviar: Comida, Documento, Encomenda ou Outros (vai junto no pedido) */
(function(){
let cat=null;
const DICA={Comida:"ex.: 2 marmitas, pizza grande",Documento:"ex.: contrato, chave, envelope",Encomenda:"ex.: caixa pequena, roupa, remédio",Outros:"ex.: o que vai ser levado"};
function marca(box,c){box.querySelectorAll("[data-cat]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.cat===c))}
function rotulo(){$("pf-item-rot").textContent=cat?"Detalhes (opcional)":"O que vai ser levado";$("pf-item").placeholder=DICA[cat]||"ex.: 2 marmitas, documento, remédio"}
$("pf-cat").addEventListener("click",e=>{const b=e.target.closest("[data-cat]");if(!b)return;cat=cat===b.dataset.cat?null:b.dataset.cat;marca($("pf-cat"),cat);rotulo()});
// o texto que vai pra corrida: "Comida: 2 marmitas" (no frete continua só o texto)
window.pfItem=()=>{const t=$("pf-item").value.trim();if(pfTipo==="frete"||!cat)return t;return(t?`${cat}: ${t}`:cat).slice(0,120)};
window.pfCatReset=()=>{cat=null;marca($("pf-cat"),null);rotulo()};
if(typeof pfTipoSet==="function"){const t0=pfTipoSet;pfTipoSet=function(t){t0(t);if(t==="frete"){cat=null;marca($("pf-cat"),null);$("pf-item-rot").textContent="O que vai ser levado"}}}
})();
