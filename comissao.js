/* Cadernex — aviso da comissão de 8% nas corridas pagas pelo app (a partir de 01/12/2026; antes 6%).
   Pagamento só por Pix pelo app: a comissão é descontada na hora. */
(function(){
const el=id=>document.getElementById(id);
const INICIO=Date.parse("2026-12-01T03:00:00Z"),FIM_AVISO=INICIO+14*864e5;
function pinta(){
  const c=el("cm-card");if(!c)return;
  let visto=false;try{visto=localStorage.getItem("cx-cm-aviso8")==="1"}catch(e){}
  if(!sb||!uid||perfil.tipo!=="entregador"||visto||Date.now()>FIM_AVISO){c.hidden=true;return}
  c.hidden=false;
  c.innerHTML=`<b>📣 ${Date.now()<INICIO?"A partir de 01/12":"Desde 01/12"}: comissão de 8% nas corridas pagas pelo app</b>
    <p class="hint" style="margin:0">Quando o cliente paga pelo app, o Cadernex fica com 8% (antes eram 6%) e o resto cai no Pix do seu CPF na hora. Exemplo: corrida de R$ 10 → você recebe R$ 9,20. <b>O pagamento agora é só pelo app: ative o Pix do seu CPF em Ganhos pra aceitar corridas.</b></p>
    <button class="link" type="button" data-cmok="1" style="align-self:flex-start">Entendi</button>`;
}
document.addEventListener("click",e=>{if(e.target.closest("[data-cmok]")){try{localStorage.setItem("cx-cm-aviso8","1")}catch(x){}el("cm-card").hidden=true}});
if(typeof go==="function"){const g=go;go=function(v){g(v);if(v==="corridas")pinta()}}
const _al=window.agendaLoad;window.agendaLoad=async()=>{await _al();pinta()};
if(uid)setTimeout(pinta,0);
})();
