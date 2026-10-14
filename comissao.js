/* Cadernex — aviso da comissão de 6% nas corridas pagas pelo app (a partir de 21/10/2026).
   Pix pelo app: o Mercado Pago desconta os 6% na hora. Dinheiro: sem comissão. */
(function(){
const el=id=>document.getElementById(id);
const INICIO=Date.parse("2026-10-21T03:00:00Z"),FIM_AVISO=INICIO+14*864e5;
function pinta(){
  const c=el("cm-card");if(!c)return;
  let visto=false;try{visto=localStorage.getItem("cx-cm-aviso")==="1"}catch(e){}
  if(!sb||!uid||perfil.tipo!=="entregador"||visto||Date.now()>FIM_AVISO){c.hidden=true;return}
  c.hidden=false;
  c.innerHTML=`<b>📣 ${Date.now()<INICIO?"A partir de 21/10":"Desde 21/10"}: comissão de 6% nas corridas pagas pelo app</b>
    <p class="hint" style="margin:0">Quando o cliente paga pelo app, o Cadernex fica com 6% e o resto cai na sua conta na hora. Exemplo: corrida de R$ 10 → você recebe R$ 9,40. <b>Corridas pagas em dinheiro continuam 100% suas.</b></p>
    <button class="link" type="button" data-cmok="1" style="align-self:flex-start">Entendi</button>`;
}
document.addEventListener("click",e=>{if(e.target.closest("[data-cmok]")){try{localStorage.setItem("cx-cm-aviso","1")}catch(x){}el("cm-card").hidden=true}});
if(typeof go==="function"){const g=go;go=function(v){g(v);if(v==="corridas")pinta()}}
const _al=window.agendaLoad;window.agendaLoad=async()=>{await _al();pinta()};
if(uid)setTimeout(pinta,0);
})();
