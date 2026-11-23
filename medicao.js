/* Cadernex — medição de visitas (Google Analytics), só com o aceite da pessoa (LGPD)
   Sem aceite, nada é carregado. Com aceite, conta visitas e cadastros, pra saber se os anúncios funcionam.
   Cadastro concluído = página "/?bem-vindo" (conversão do Google Ads). */
(function(){
const GA="G-Q6T05VQWEV",K="cx-medicao";
const le=()=>{try{return localStorage.getItem(K)}catch(e){return null}};
const grava=v=>{try{localStorage.setItem(K,v)}catch(e){}};
let pronto=false;
function liga(){
  if(pronto)return;pronto=true;
  window.dataLayer=window.dataLayer||[];window.gtag=function(){dataLayer.push(arguments)};
  gtag("js",new Date());gtag("config",GA,{anonymize_ip:true});
  const s=document.createElement("script");s.async=true;s.src="https://www.googletagmanager.com/gtag/js?id="+GA;document.head.appendChild(s);
}
function aviso(){
  if(document.getElementById("cx-cookie"))return;
  const b=document.createElement("div");b.id="cx-cookie";b.setAttribute("role","region");b.setAttribute("aria-label","Aviso de medição");
  b.innerHTML=`<p>Usamos o Google Analytics pra contar visitas e cadastros e melhorar o Cadernex. Não usamos pra anúncios personalizados. <a href="privacidade.html">Saiba mais</a></p><div><button type="button" data-ck="nao">Recusar</button><button type="button" data-ck="sim">Aceitar</button></div>`;
  const st=document.createElement("style");st.textContent=`#cx-cookie{position:fixed;left:12px;right:12px;bottom:calc(12px + env(safe-area-inset-bottom) + var(--cx-nav,0px));z-index:8000;max-width:520px;margin:0 auto;background:#141b2d;color:#fff;border-radius:14px;padding:12px 14px;box-shadow:0 10px 30px rgba(0,0,0,.35);font-size:13px;display:flex;flex-direction:column;gap:8px}
#cx-cookie p{margin:0;line-height:1.4}#cx-cookie a{color:#f3ba2f}#cx-cookie div{display:flex;gap:8px;justify-content:flex-end}
#cx-cookie button{border:0;border-radius:10px;padding:8px 14px;font:inherit;font-weight:700;cursor:pointer}#cx-cookie [data-ck=nao]{background:transparent;color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.4)}#cx-cookie [data-ck=sim]{background:#f3ba2f;color:#141b2d}`;
  document.head.appendChild(st);document.body.appendChild(b);
  b.addEventListener("click",e=>{const x=e.target.closest("[data-ck]");if(!x)return;grava(x.dataset.ck);b.remove();if(x.dataset.ck==="sim")liga()});
}
const v=le();
if(v==="sim")liga();
else if(v!=="nao")addEventListener("load",()=>setTimeout(aviso,1500));
// cadastro concluído: registra a página /?bem-vindo e o evento sign_up
window.cxConversao=function(tipo){
  if(!pronto||typeof gtag!=="function")return;
  try{const volta=location.pathname+location.search+location.hash;
    history.replaceState(history.state,"","/?bem-vindo");
    gtag("event","page_view",{page_location:location.origin+"/?bem-vindo",page_title:"Cadastro concluído"});
    gtag("event","sign_up",{method:tipo||"app"});
    setTimeout(()=>history.replaceState(history.state,"",volta),1500);
  }catch(e){}
};
window.cxMedicaoReabrir=()=>{try{localStorage.removeItem(K)}catch(e){}aviso()};
})();
