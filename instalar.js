/* Cadernex — botão "Baixar o app": instala direto quando o celular deixa, senão mostra o passo a passo */
(function(){
let pedido=null;
const instalado=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
const naoChrome=/SamsungBrowser|Brave|FxiOS|Firefox|OPR|EdgA|MiuiBrowser/i.test(navigator.userAgent)||!!navigator.brave;
function pintar(){document.querySelectorAll(".inst-box").forEach(b=>b.hidden=instalado())}
window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();pedido=e;pintar()});
window.addEventListener("appinstalled",()=>{pedido=null;pintar();toast("Cadernex instalado ✓ Procure o ícone na tela do celular.")});
function passos(){
  const el=$("inst-dlg");
  $("inst-passos").innerHTML=ios
    ?`<li>Abra o <b>cadernex.com.br</b> no <b>Safari</b>.</li><li>Toque em <b>Compartilhar</b> (o quadrado com a seta pra cima), embaixo.</li><li>Role e toque em <b>Adicionar à Tela de Início</b>, depois em <b>Adicionar</b>.</li>`
    :`<li>Abra o <b>cadernex.com.br</b> no <b>Chrome</b>${naoChrome?" (pelo Chrome a instalação funciona melhor)":""}.</li><li>Toque nos <b>⋮</b>, em cima à direita.</li><li>Toque em <b>Instalar app</b> ou <b>Adicionar à tela inicial</b>, depois em <b>Instalar</b>.</li><li>Se aparecer <b>Abrir app</b>, ele já está instalado: procure o ícone na lista de apps.</li>`;
  el.hidden=false;el.scrollIntoView({behavior:"smooth",block:"center"});
}
document.addEventListener("click",async e=>{
  if(e.target.closest("[data-instalar]")){
    if(pedido){pedido.prompt();const r=await pedido.userChoice.catch(()=>null);pedido=null;if(r&&r.outcome==="dismissed")toast("Tudo bem. O botão continua aqui quando quiser.");return}
    passos();return}
  if(e.target.closest("[data-inst-fechar]")||e.target.id==="inst-dlg")$("inst-dlg").hidden=true;
});
pintar();
})();
