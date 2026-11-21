/* Cadernex — tela acesa pro entregador (Screen Wake Lock)
   Enquanto ele está "Disponível" ou com corrida em andamento, a tela não apaga sozinha,
   pro GPS e o alerta de corrida nova continuarem rodando. Solta a trava quando ele sai do disponível. */
(function(){
if(!("wakeLock" in navigator))return;
let trava=null,pedindo=false;
const precisa=()=>{
  if(typeof uid==="undefined"||!uid||typeof perfil==="undefined"||perfil.tipo!=="entregador"||document.hidden)return false;
  const disp=typeof meuDisp==="function"&&!!meuDisp();
  const corrida=typeof minhas!=="undefined"&&Array.isArray(minhas)&&minhas.some(c=>c.entregador_id===uid&&["aceita","coletada"].includes(c.status));
  return disp||corrida;
};
async function ajusta(){
  if(precisa()){
    if(trava||pedindo)return;pedindo=true;
    try{trava=await navigator.wakeLock.request("screen");trava.addEventListener("release",()=>{trava=null})}catch(e){}
    pedindo=false;
  }else if(trava){try{await trava.release()}catch(e){}trava=null}
}
document.addEventListener("visibilitychange",ajusta);
setInterval(ajusta,15000);
window.cxTelaAcesa=ajusta;
})();
