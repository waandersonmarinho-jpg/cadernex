/* Cadernex — navegação: o botão "voltar" do celular volta para a tela inicial do app (em vez de fechar o app),
   e o app lembra a tela em que você estava quando o celular fecha ele no fundo ou quando sai versão nova. */
(function(){
if(typeof go!=="function")return;
const KEY="cx-tela",VALIDO=30*60e3; // lembra por 30 minutos
const casa=()=>document.body.classList.contains("cli")?"pedir":"resumo";
let doVoltar=false,ignorarPop=false,restaurado=false,atual=null;
try{if(!history.state||!history.state.cx)history.replaceState({cx:"base"},"")}catch(e){}
const emCima=()=>!!(history.state&&history.state.cx==="top");
const g=go;
go=function(v){
  g(v);atual=v;
  if(uid)try{localStorage.setItem(KEY,JSON.stringify({u:uid,v,t:Date.now()}))}catch(e){}
  if(doVoltar)return;
  try{
    if(v===casa()){if(emCima()){ignorarPop=true;history.back()}}
    else if(emCima())history.replaceState({cx:"top",v},"");
    else history.pushState({cx:"top",v},"");
  }catch(e){}
};
addEventListener("popstate",e=>{
  if(ignorarPop){ignorarPop=false;return}
  const s=e.state||{};
  if(!uid||document.getElementById("s-app").hidden)return;
  doVoltar=true;
  try{
    if(s.cx==="top"&&s.v)go(s.v);          // avançou de novo
    else if(atual!==casa())go(casa());       // voltou: vai para a tela inicial do app
  }finally{doVoltar=false}
});
function restaura(){
  let s=null;try{s=JSON.parse(localStorage.getItem(KEY)||"null")}catch(e){}
  if(!s||s.u!==uid||Date.now()-s.t>VALIDO||!s.v||s.v===casa())return;
  const tela=document.getElementById("v-"+s.v);
  if(!tela||document.getElementById("s-app").hidden)return;
  const vis=document.querySelector(".view:not([hidden])");
  if(vis&&vis.id!=="v-"+casa())return; // já foi para outra tela sozinho (ex.: fechar turno)
  go(s.v);
}
// espera o app terminar de abrir (perfil carregado e tela inicial escolhida) e volta para a tela de antes
const ini=Date.now(),esp=setInterval(()=>{
  if(restaurado||Date.now()-ini>20000){clearInterval(esp);return}
  if(uid&&typeof papelAplicado!=="undefined"&&papelAplicado){restaurado=true;clearInterval(esp);setTimeout(restaura,150)}
},200);
})();
