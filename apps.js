/* Cadernex — três apps no mesmo sistema: Cadernex (cliente), Cadernex Entregador (/entregador) e Cadernex Loja (/loja).
   A página de cada app é a mesma do Cadernex; aqui ela muda a entrada, o cadastro e a tela inicial conforme o app. */
(function(){
const APP=document.documentElement.dataset.app||"";
window.cxApp=APP;
if(APP!=="entregador"&&APP!=="loja")return;
const ENT=APP==="entregador";
const INFO=ENT?{nome:"Cadernex Entregador",ico:"/icon-ent-192.png",tipo:"entregador",
    t:"Faça entregas no seu horário e receba no <span>Pix do seu CPF</span>",
    l:"Moto, bike ou frete. Fique disponível com um toque, aceite as corridas perto de você e receba a sua parte direto no Pix.",
    cta:"Criar conta de entregador",itens:["🔔 Alerta de corrida nova, com som","🗺️ Rota no Google Maps ou Waze","💸 Pagamento no Pix do seu CPF","🎓 Dá pra encaixar entre a faculdade e o trabalho"]}
  :{nome:"Cadernex Loja",ico:"/icon-loja-192.png",tipo:"cliente",
    t:"O pedido chega <span>já pago</span> e o motoboy busca na sua loja",
    l:"Monte o cardápio no celular, receba os pedidos com alerta e o dinheiro cai na hora no Pix da loja. Sem mensalidade.",
    cta:"Cadastrar minha loja",itens:["🔔 Pedido novo com som e aviso no celular","🛵 Motoboy automático quando o pedido fica pronto","🏪 Retirada no balcão com código","💰 Pix direto na conta da loja"]};
document.documentElement.classList.add("app-"+(ENT?"ent":"loja"));
const css=document.createElement("style");css.textContent=`
.app-ent #au-inicio>:not(.ap-in),.app-loja #au-inicio>:not(.ap-in){display:none!important}
.app-ent #a-tipo [data-tipo]:not([data-tipo=entregador]),.app-loja #a-tipo [data-tipo]:not([data-tipo=cliente]){display:none!important}
.app-ent #a-tipo,.app-loja #a-tipo{grid-template-columns:1fr!important}
.ap-in{display:flex;flex-direction:column;gap:14px;padding:8px 0 4px}
.ap-hd{display:flex;align-items:center;gap:12px}.ap-hd img{width:56px;height:56px;border-radius:14px;box-shadow:0 0 0 1px var(--line)}
.ap-hd b{display:block;font:700 26px/1 var(--display)}.ap-hd span{font-size:13px;color:var(--muted)}
.ap-t{font:700 34px/1.05 var(--display);margin:6px 0 0}.ap-t span{color:var(--accent)}
.ap-l{margin:0;color:var(--muted);line-height:1.5}
.ap-it{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.ap-it li{padding:11px 13px;border-radius:12px;background:var(--surface);box-shadow:inset 0 0 0 1px var(--line);font-weight:600;font-size:14px}
.ap-out{text-align:center;font-size:13px;color:var(--muted);margin:2px 0 0}.ap-out a{color:inherit;font-weight:600}
#ap-errado{position:fixed;inset:0;z-index:9000;background:var(--bg);display:flex;align-items:center;justify-content:center;padding:24px}
#ap-errado>div{max-width:420px;width:100%;display:flex;flex-direction:column;gap:12px;text-align:center}
#ap-errado img{width:64px;height:64px;border-radius:16px;margin:0 auto}#ap-errado h2{margin:0}#ap-errado p{margin:0;color:var(--muted)}`;
document.head.appendChild(css);
function entrada(){
  const p=document.getElementById("au-inicio");if(!p||p.querySelector(".ap-in"))return;
  const d=document.createElement("div");d.className="ap-in";
  d.innerHTML=`<div class="ap-hd"><img src="${INFO.ico}" alt=""><div><b>${INFO.nome}</b><span>${ENT?"pra quem entrega":"pra quem vende"}</span></div></div>
    <h1 class="ap-t">${INFO.t}</h1><p class="ap-l">${INFO.l}</p>
    <ul class="ap-it">${INFO.itens.map(x=>`<li>${x}</li>`).join("")}</ul>
    <button class="btn full" type="button" data-cta="${INFO.tipo}">${INFO.cta}</button>
    <button class="btn ghost full" type="button" data-apentrar>Já tenho conta · Entrar</button>
    <p class="ap-out">Quer pedir entrega ou comprar das lojas? <a href="/">Abra o Cadernex</a></p>`;
  p.prepend(d);
  d.querySelector("[data-apentrar]").onclick=()=>{const t=document.querySelector('.au-tabs [data-aba="entrar"]');if(t)t.click()};
  // cadastro: só o tipo deste app
  document.querySelectorAll("#a-tipo [data-tipo]").forEach(x=>x.setAttribute("aria-checked",String(x.dataset.tipo===INFO.tipo)));
  const ib=document.querySelector("#au-entrar .inst-box");if(ib){const b=ib.querySelector("b"),im=ib.querySelector("img");if(b)b.textContent="Baixe o "+INFO.nome;if(im)im.src=INFO.ico}
  const ld=document.querySelector("#au-entrar .lead");if(ld)ld.textContent=ENT?"Entre na sua conta de entregador ou crie uma agora.":"Entre na conta da sua loja ou cadastre a loja agora.";
}
function contaErrada(sim){
  let o=document.getElementById("ap-errado");
  if(!sim){if(o)o.remove();return}
  if(o)return;
  o=document.createElement("div");o.id="ap-errado";o.setAttribute("role","dialog");o.setAttribute("aria-modal","true");
  o.innerHTML=`<div><img src="${INFO.ico}" alt=""><h2>${ENT?"Essa conta não é de entregador":"Essa conta é de entregador"}</h2>
    <p>${ENT?"O Cadernex Entregador é só pra quem faz entregas. Pra pedir entrega, comprar ou cuidar da sua loja, use o Cadernex.":"O Cadernex Loja é pra quem vende. Pra receber corridas, use o Cadernex Entregador."}</p>
    <a class="btn full" href="${ENT?"/":"/entregador.html"}">${ENT?"Abrir o Cadernex":"Abrir o Cadernex Entregador"}</a>
    <button class="btn ghost full" type="button" data-aptroca>Entrar com outra conta</button></div>`;
  document.body.appendChild(o);
  o.querySelector("[data-aptroca]").onclick=()=>{const s=document.getElementById("sair");if(s)s.click();o.remove()};
}
let lojaIni=false;
function depois(){
  if(typeof perfil==="undefined"||!perfil.tipo)return;
  const cli=perfil.tipo==="cliente";
  contaErrada(ENT?cli:!cli);
  if(!ENT&&cli&&!lojaIni){lojaIni=true;try{go("lojas")}catch(e){}}
}
function liga(){
  entrada();
  const ola=document.getElementById("ola");if(ola&&!(typeof uid!=="undefined"&&uid))ola.textContent=ENT?"Entregador":"Loja";
  const t=document.querySelector('.tab[data-v="lojas"]');if(!ENT&&t){const n=[...t.childNodes].find(x=>x.nodeType===3&&x.textContent.trim());if(n)n.textContent="Minha loja"}
  if(typeof aplicaPapel==="function"&&!aplicaPapel.cxApp){const orig=aplicaPapel;window.aplicaPapel=function(f){const r=orig.apply(this,arguments);try{depois()}catch(e){}return r};window.aplicaPapel.cxApp=true}
  const s=document.getElementById("sair");if(s)s.addEventListener("click",()=>{lojaIni=false;contaErrada(false)});
  if(typeof uid!=="undefined"&&uid)depois();
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",liga);else liga();
})();
