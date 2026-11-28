/* Cadernex — três apps no mesmo sistema: Cadernex (cliente), Cadernex Entregador (/entregador) e Cadernex Loja (/loja).
   A página de cada app é a mesma do Cadernex; aqui ela muda a entrada, o cadastro e a tela inicial conforme o app. */
(function(){
const APP=document.documentElement.dataset.app||"";
window.cxApp=APP;
if(APP!=="entregador"&&APP!=="loja"){
  // Cadernex Delivery (cliente): a página fala com quem pede; loja e entregador têm os apps deles
  const cli=()=>{const p=document.getElementById("au-inicio");if(!p||p.dataset.ap)return;p.dataset.ap="1";
    const st=document.createElement("style");st.textContent=`.ap-como{display:flex;flex-direction:column;gap:10px}.ap-como h2{margin:0}
.ap-como ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px;counter-reset:n}
.ap-como li{display:grid;grid-template-columns:34px 1fr;gap:10px;align-items:start;counter-increment:n}
.ap-como li::before{content:counter(n);width:30px;height:30px;border-radius:50%;background:var(--accent);color:#14161a;font-weight:800;display:grid;place-items:center}
.ap-como li b{display:block}.ap-como li span{color:var(--muted);font-size:14px}.ap-como .duo{display:grid;grid-template-columns:1fr 1fr;gap:8px}`;document.head.appendChild(st);
    // a cara do app do cliente: topo, cores, fotos e textos próprios
    document.documentElement.classList.add("app-cli");
    st.textContent+=`.app-cli .hx{background:radial-gradient(45% 30% at 95% 0%,rgba(240,246,255,.65),transparent 70%),radial-gradient(70% 45% at 100% 10%,rgba(180,200,225,.45),transparent 70%),linear-gradient(180deg,#5d90d8 0%,#3f78cc 28%,#2f5ea6 55%,#22406e 80%,#172233 100%)}
.app-cli .hx::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(115deg,transparent 35%,rgba(255,255,255,.22) 47%,rgba(220,232,255,.35) 50%,rgba(255,255,255,.22) 53%,transparent 65%);background-size:300% 100%;animation:clibrilho 5s ease-in-out infinite;mix-blend-mode:screen}
.app-cli .hx-txt{position:relative;z-index:1}
@keyframes clibrilho{0%{background-position:120% 0}60%,100%{background-position:-60% 0}}
@media (prefers-reduced-motion:reduce){.app-cli .hx::after{animation:none;opacity:0}}
.app-cli .hx-ph{background-image:url(delivery-hero.jpg);background-position:58% 100%;background-size:auto 100%;opacity:1;width:78%;bottom:-8px;-webkit-mask-image:linear-gradient(90deg,transparent 0%,rgba(0,0,0,.55) 14%,#000 30%),linear-gradient(180deg,#000 72%,transparent 96%);mask-image:linear-gradient(90deg,transparent 0%,rgba(0,0,0,.55) 14%,#000 30%),linear-gradient(180deg,#000 72%,transparent 96%);filter:contrast(1.08) saturate(1.1) brightness(1.04)}

.app-cli .hx-duo button{border-color:rgba(255,255,255,.22);background:rgba(14,30,60,.42);-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px)}
.app-cli .marca h1{font-size:clamp(17px,4.9vw,30px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.app-cli .marca{min-width:0;flex:1}.app-cli .marca>div{min-width:0}.app-cli header{flex-wrap:nowrap;align-items:center}
.marca img.ap-logo{width:46px;height:46px;border-radius:12px;box-shadow:0 0 0 1px var(--line)}`;
    const mi=document.querySelector(".marca img");if(mi){mi.src="icon-del-192.png";mi.className="ap-logo";mi.width=46;mi.height=46}
    const mh=document.querySelector(".marca h1");if(mh)mh.textContent="Cadernex Delivery";
    // conta de entregador ou loja aberta no app do cliente: o topo mostra o app certo de cada um
    const marcaPapel=()=>{if(typeof perfil==="undefined"||!perfil.tipo||!mi||!mh)return;
      const loja=!!(perfil.loja&&String(perfil.loja_nome||"").trim()),ent=perfil.tipo!=="cliente";
      mi.src=ent?"icon-ent-192.png":loja?"icon-loja-192.png":"icon-del-192.png";mh.textContent=ent?"Cadernex":loja?"Cadernex Loja":"Cadernex Delivery"};
    if(typeof aplicaPapel==="function"&&!aplicaPapel.cxCli){const o=aplicaPapel;window.aplicaPapel=function(){const r=o.apply(this,arguments);try{marcaPapel()}catch(e){}return r};window.aplicaPapel.cxCli=true}
    if(typeof uid!=="undefined"&&uid)marcaPapel();
    const ola=document.getElementById("ola");if(ola&&!(typeof uid!=="undefined"&&uid))ola.textContent="Pra quem pede";
    const hx=p.querySelector(".hx");if(hx){const eb=hx.querySelector(".hx-eb"),t=hx.querySelector(".hx-t");
      if(eb)eb.textContent="Goiânia · peça pelo app";if(t)t.innerHTML="Peça e<br>receba na<br><span>sua porta</span>";
      const f=hx.querySelector(".hx-foto");if(f)f.setAttribute("aria-label","Entregador Cadernex Delivery com as sacolas do pedido")}
    const c=document.createElement("section");c.className="card ap-como";
    c.innerHTML=`<span class="eyebrow">Como funciona pra você</span><h2>Peça em poucos toques</h2><ol>
      <li><div><b>Escolha o que precisa</b><span>Uma entrega de moto, bike ou frete, ou compre das lojas da cidade.</span></div></li>
      <li><div><b>Veja o valor antes</b><span>Coloque o CEP e o app mostra o preço na hora, sem surpresa.</span></div></li>
      <li><div><b>Pague por Pix</b><span>De qualquer banco. Na entrega, o entregador também pode mostrar o QR Code.</span></div></li>
      <li><div><b>Receba com código</b><span>Acompanhe pelo GPS e só passe o código quando tiver a encomenda na mão.</span></div></li></ol>
      <div class="duo"><button class="btn" type="button" data-cta="enviar">Pedir entrega</button><button class="btn ghost" type="button" data-vtlista>Ver as lojas</button></div>`;
    const car=p.querySelector("#hx-car")||p.querySelector(".hx-tiles");if(car)car.after(c);
    // na raiz o App Delivery leva pra página dele (cada app instala no seu endereço); em /delivery instala ali mesmo
    const tcl=p.querySelector("[data-appcli]");
    if(tcl&&APP!=="delivery"){const l=document.createElement("a");l.className=tcl.className;l.href="delivery.html?baixar";l.innerHTML=tcl.innerHTML;tcl.replaceWith(l)}
    if(APP==="delivery"){const ib=document.querySelector("#au-entrar .inst-box");if(ib){const b=ib.querySelector("b"),im=ib.querySelector("img");if(b)b.textContent="Baixe o Cadernex Delivery";if(im)im.src="/icon-del-192.png"}}
    ["#mk","#lj-info",'.btn.ghost[data-cta="entregador"]',"#hx-car"].forEach(x=>p.querySelectorAll(x).forEach(e=>{if(!e.closest(".ap-como"))e.style.display="none"}));
    // ---- conteúdo pro cliente final ----
    st.textContent+=`.app-cli #s-auth :is(.ap-como,.cl-sec,.cl-calc,.cl-faq){--accent:#1d6fe0;--accent-ink:#ffffff;--accent-soft:#dce9fb}
:root.app-cli[data-theme="dark"] #s-auth :is(.ap-como,.cl-sec,.cl-calc,.cl-faq){--accent:#4f95f5;--accent-ink:#ffffff;--accent-soft:#13233d}
@media (prefers-color-scheme:dark){:root.app-cli:not([data-theme="light"]) #s-auth :is(.ap-como,.cl-sec,.cl-calc,.cl-faq){--accent:#4f95f5;--accent-ink:#ffffff;--accent-soft:#13233d}}
.app-cli #s-auth .ap-como li::before{color:#fff}
.cl-sec{display:flex;flex-direction:column;gap:10px}.cl-sec>h2{margin:0}
.cl-srv{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.cl-srv button{display:flex;flex-direction:column;align-items:flex-start;gap:4px;text-align:left;padding:13px;border-radius:16px;border:1px solid var(--line);background:var(--surface);color:inherit;font:inherit;cursor:pointer;min-height:112px}
.cl-srv button i{font-style:normal;font-size:26px;line-height:1}.cl-srv button b{font-size:15px}.cl-srv button span{font-size:12.5px;color:var(--muted);line-height:1.35}.cl-srv button em{font-style:normal;font-size:12px;font-weight:700;color:var(--accent);margin-top:auto}
.cl-calc{display:flex;flex-direction:column;gap:10px}.cl-calc input[type=range]{width:100%;accent-color:var(--accent)}
.cl-km{display:flex;justify-content:space-between;align-items:baseline}.cl-km b{font:700 18px var(--display)}
.cl-val{display:grid;grid-template-columns:1fr auto;gap:4px 10px;font-size:14px}.cl-val span:nth-child(even){text-align:right;font-variant-numeric:tabular-nums}
.cl-val .tot{font-weight:800;font-size:17px;padding-top:6px;border-top:1px solid var(--line)}.cl-val .tot+span{font:800 24px var(--display);color:var(--good,#16a34a);padding-top:6px;border-top:1px solid var(--line)}
.cl-seg{display:grid;grid-template-columns:1fr 1fr;gap:8px}.cl-seg div{padding:11px;border-radius:14px;background:var(--surface);box-shadow:inset 0 0 0 1px var(--line)}
.cl-seg b{display:block;font-size:14px;margin-top:4px}.cl-seg span{font-size:12.5px;color:var(--muted);line-height:1.35}.cl-seg i{font-style:normal;font-size:22px}
.cl-faq details{border-top:1px solid var(--line);padding:10px 0}.cl-faq summary{cursor:pointer;font-weight:700;list-style:none}.cl-faq summary::-webkit-details-marker{display:none}.cl-faq summary::after{content:"+";float:right;color:var(--muted)}.cl-faq details[open] summary::after{content:"–"}.cl-faq p{margin:6px 0 0;color:var(--muted);font-size:14px;line-height:1.45}
.cl-trab{display:grid;grid-template-columns:1fr 1fr;gap:8px}.cl-trab a{display:flex;flex-direction:column;gap:3px;padding:12px;border-radius:14px;border:1px solid var(--line);text-decoration:none;color:inherit}.cl-trab a b{font-size:14px}.cl-trab a span{font-size:12px;color:var(--muted)}`;
    const mk=(cls,html)=>{const e=document.createElement("section");e.className=cls;e.innerHTML=html;return e};
    const srv=mk("cl-sec",`<span class="eyebrow">O que você pode pedir</span><h2>Tudo que você precisa levar ou comprar</h2>
      <div class="cl-srv">
        <button type="button" data-cta="enviar"><i>🛵</i><b>Entrega de moto</b><span>Documentos, chaves, comida, encomendas</span><em>A partir de R$ 8 →</em></button>
        <button type="button" data-cta="enviar"><i>🚲</i><b>Entrega de bike</b><span>Pra perto, até uns 5 km</span><em>Pedir →</em></button>
        <button type="button" data-cta="enviar"><i>🛻</i><b>Frete e mudança</b><span>Picape ou caminhão, com ajudantes</span><em>A partir de R$ 40 →</em></button>
        <button type="button" data-vtlista><i>🍔</i><b>Delivery das lojas</b><span>Lanchonete, farmácia, ferragista e mais</span><em>Ver as lojas →</em></button>
      </div>`);
    const calc=mk("card cl-calc",`<span class="eyebrow">Quanto custa</span><h2 style="margin:0">Simule sua entrega de moto</h2>
      <div class="cl-km"><span>Distância</span><b id="cl-kmv">3 km</b></div>
      <input type="range" id="cl-km" min="1" max="20" step="1" value="3" aria-label="Distância em km">
      <div class="cl-val"><span>Corrida</span><span id="cl-c">R$ 8,00</span><span>Taxa de serviço (14%)</span><span id="cl-s">R$ 1,12</span><span>Taxa do app</span><span>R$ 2,99</span><span class="tot">Você paga</span><span id="cl-t">R$ 12,11</span></div>
      <p class="hint" style="margin:0;font-size:12px">Estimativa. O valor exato aparece pelo CEP antes de confirmar o pedido.</p>
      <button class="btn full" type="button" data-cta="enviar">Pedir entrega agora</button>`);
    const seg=mk("cl-sec",`<span class="eyebrow">Por que pedir pelo Cadernex</span><h2>Seguro do começo ao fim</h2>
      <div class="cl-seg">
        <div><i>💲</i><b>Preço antes</b><span>Sem surpresa: você vê o valor antes de pedir.</span></div>
        <div><i>🔐</i><b>Código de entrega</b><span>Só você tem o código. Sem ele, não conta como entregue.</span></div>
        <div><i>📍</i><b>GPS ao vivo</b><span>Acompanhe o entregador e receba aviso em cada etapa.</span></div>
        <div><i>⭐</i><b>Entregadores avaliados</b><span>Com selfie, foto do veículo e nota dos clientes.</span></div>
      </div>`);
    const faq=mk("card cl-faq",`<span class="eyebrow">Dúvidas de quem pede</span><h2 style="margin:0 0 4px">Perguntas rápidas</h2>
      <details><summary>Como eu pago?</summary><p>Por Pix, de qualquer banco, até pela conta de outra pessoa. O QR Code aparece no app, e o entregador também pode mostrar na coleta.</p></details>
      <details><summary>E se ninguém aceitar?</summary><p>O pedido fica aberto até um entregador aceitar. Se você cancelar antes, não paga nada.</p></details>
      <details><summary>Posso cancelar o pedido?</summary><p>Pode, sem custo, enquanto a encomenda não foi coletada: é só tocar em Cancelar no pedido. Depois da coleta não dá pra cancelar pelo app; combine com o entregador pelo chat. Se você já pagou por Pix e o pedido foi cancelado antes da coleta, escreva para suporte@cadernex.com.br para pedir o estorno.</p></details>
      <details><summary>E se a entrega demorar?</summary><p>Acompanhe o entregador pelo GPS e fale com ele pelo chat da corrida. Se ninguém aceitou ainda, o pedido continua aberto e você pode cancelar sem custo. Se o atraso for grande depois da coleta, fale com o entregador e, se não resolver, relate o problema no pedido e escreva para o suporte.</p></details>
      <details><summary>E se o item chegar danificado?</summary><p>Confira a encomenda antes de passar o código de entrega: o código é o que confirma que você recebeu. Se estiver danificada, não passe o código, tire fotos e relate o problema no app. No delivery de lojas, fale também com a loja pelo pedido. O suporte analisa cada caso pelo suporte@cadernex.com.br.</p></details>
      <details><summary>Posso comprar de uma loja e retirar?</summary><p>Sim. No delivery, escolha "Retirar na loja": não tem taxa de entrega e você mostra um código no balcão.</p></details>
      <details><summary>Funciona no meu bairro?</summary><p>Funciona em qualquer bairro de Goiânia. A rapidez depende de ter entregador perto de você na hora.</p></details>
      <p style="margin:10px 0 0"><a href="perguntas.html">Ver todas as perguntas →</a></p>`);
    const trab=mk("cl-sec",`<span class="eyebrow">Trabalhe com o Cadernex</span>
      <div class="cl-trab"><a href="loja.html"><b>🏪 Tenho uma loja</b><span>Venda pelo delivery</span></a><a href="entregador.html"><b>🛵 Sou entregador</b><span>Rode e receba no Pix</span></a></div>`);
    c.after(srv);srv.after(calc);calc.after(seg);seg.after(faq);faq.after(trab);
    const pl=p.querySelector(".promo-l");if(pl)trab.after(pl);
    const brl=v=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
    const kmI=calc.querySelector("#cl-km"),conta=()=>{const k=+kmI.value,cor=Math.max(8,Math.ceil((8+1.4*Math.max(0,k-3))*2)/2),sv=Math.round(cor*14)/100;
      calc.querySelector("#cl-kmv").textContent=k+" km";calc.querySelector("#cl-c").textContent=brl(cor);calc.querySelector("#cl-s").textContent=brl(sv);calc.querySelector("#cl-t").textContent=brl(cor+sv+2.99)};
    kmI.addEventListener("input",conta);conta();
  };
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",cli);else cli();
  return;
}
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
.app-ent #a-tipo [data-tipo]:not([data-tipo=entregador]),.app-loja #a-tipo [data-tipo]:not([data-tipo=cliente]){display:none!important}
.app-ent #a-tipo,.app-loja #a-tipo{grid-template-columns:1fr!important}
.app-ent .maisbtn[data-go=pedir],.app-ent .maisbtn[data-go=pedidos]{display:none!important}
.app-loja label:has(#lj-on){display:none!important}
.ap-bx{display:none!important}
.ap-in .inst-box{justify-content:center}
.ap-in{display:flex;flex-direction:column;gap:10px;padding:14px;margin:6px 0;border-radius:18px;background:var(--surface);box-shadow:inset 0 0 0 1.5px var(--accent)}
.ap-hd{display:flex;align-items:center;gap:12px}.ap-hd img{width:56px;height:56px;border-radius:14px;box-shadow:0 0 0 1px var(--line)}
.ap-hd b{display:block;font:700 26px/1 var(--display)}.ap-hd span{font-size:13px;color:var(--muted)}
.ap-t{font:700 34px/1.05 var(--display);margin:6px 0 0}.ap-t span{color:var(--accent)}
.ap-l{margin:0;color:var(--muted);line-height:1.5}
.ap-it{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.ap-it li{padding:11px 13px;border-radius:12px;background:var(--surface);box-shadow:inset 0 0 0 1px var(--line);font-weight:600;font-size:14px}
.ap-out{text-align:center;font-size:13px;color:var(--muted);margin:2px 0 0}.ap-out a{color:inherit;font-weight:600}
.app-loja .hx{background:radial-gradient(120% 70% at 90% 0%,#1f8a5e 0%,#0f4a33 45%,#0a2c1f 100%)}
.app-loja .hx-ph{background-image:url(lojistas-flyer.jpg);background-position:100% 42%;background-size:230%}
.app-loja .hx-foto{background-image:url(delivery-hero.jpg);aspect-ratio:848/600}
.app-loja .marca h1{font-size:clamp(20px,6.6vw,32px);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.app-loja .marca{min-width:0;flex:1}.app-loja .marca>div{min-width:0}.app-loja header{flex-wrap:nowrap;align-items:center}
.marca img.ap-logo{width:46px;height:46px;border-radius:12px;box-shadow:0 0 0 1px var(--line)}
.ap-como{display:flex;flex-direction:column;gap:10px}.ap-como h2{margin:0}
.ap-como ol{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:10px;counter-reset:n}
.ap-como li{display:grid;grid-template-columns:34px 1fr;gap:10px;align-items:start;counter-increment:n}
.ap-como li::before{content:counter(n);width:30px;height:30px;border-radius:50%;background:var(--accent);color:#14161a;font-weight:800;display:grid;place-items:center}
.ap-como li b{display:block}.ap-como li span{color:var(--muted);font-size:14px}
#ap-errado{position:fixed;inset:0;z-index:9000;background:var(--bg);display:flex;align-items:center;justify-content:center;padding:24px}
#ap-errado>div{max-width:420px;width:100%;display:flex;flex-direction:column;gap:12px;text-align:center}
#ap-errado img{width:64px;height:64px;border-radius:16px;margin:0 auto}#ap-errado h2{margin:0}#ap-errado p{margin:0;color:var(--muted)}`;
document.head.appendChild(css);
function entrada(){
  const p=document.getElementById("au-inicio");if(!p||p.dataset.ap)return;p.dataset.ap="1";
  // botões amarelos: o deste app instala aqui mesmo; o App Delivery leva pro Cadernex
  p.addEventListener("click",e=>{if(e.target.closest("[data-apentrar]")){const t=document.querySelector('.au-tabs [data-aba="entrar"]');if(t)t.click()}});
  const tc=p.querySelector("[data-appcli]");if(tc){const a=document.createElement("a");a.className=tc.className;a.href="delivery.html?baixar";a.innerHTML=tc.innerHTML;tc.replaceWith(a)}
  const meu=p.querySelector(`.hx-tile[href^="${ENT?"entregador":"loja"}.html"]`);
  if(meu&&!matchMedia("(display-mode: standalone)").matches){const b=document.createElement("button");b.type="button";b.className=meu.className;b.setAttribute("data-instalar","");b.innerHTML=meu.innerHTML;meu.replaceWith(b)}
  // a loja tem a sua cara: topo, cores, foto e textos próprios (o entregador fica como está)
  if(!ENT){
  const mi=document.querySelector(".marca img");if(mi){mi.src=INFO.ico;mi.className="ap-logo";mi.width=46;mi.height=46}
  const mh=document.querySelector(".marca h1");if(mh)mh.textContent=INFO.nome;
  const T=ENT?{eb:"Para entregadores · Goiânia",t:"Rode no<br><span>seu horário</span><br>e receba no <span>Pix</span>",
      d1:["🛵 Moto, bike ou frete","Escolha o veículo e fique disponível","Criar conta →",'data-cta="entregador"'],
      d2:["💸 Pix do seu CPF","Sua parte cai direto na sua conta","Já tenho conta →","data-apentrar"],cta:"Quero ser entregador"}
    :{eb:"Para lojistas · Goiânia",t:"Sua loja<br><span>vendendo</span><br>no <span>delivery</span>",
      d1:["📋 Cardápio no celular","Fotos, categorias, cores e tamanhos","Cadastrar loja →",'data-cta="cliente"'],
      d2:["💰 Pix na hora","O pedido chega pago na conta da loja","Já tenho conta →","data-apentrar"],cta:"Cadastrar minha loja grátis"};
  const hx=p.querySelector(".hx");
  if(hx){const q=x=>hx.querySelector(x);
    if(q(".hx-eb"))q(".hx-eb").textContent=T.eb;if(q(".hx-t"))q(".hx-t").innerHTML=T.t;
    const duo=q(".hx-duo");if(duo)duo.innerHTML=[T.d1,T.d2].map(d=>`<button type="button" ${d[3]}><b>${d[0]}</b><span>${d[1]}</span><em>${d[2]}</em></button>`).join("");
    const c=q(".hx-cta");if(c){c.textContent=T.cta;c.dataset.cta=INFO.tipo}
    const f=q(".hx-foto");if(f)f.setAttribute("aria-label",ENT?"Entregador Cadernex com a bag de entrega":"Loja com delivery pelo Cadernex")}
  const como=document.createElement("section");como.className="card ap-como";
  como.innerHTML=ENT?`<span class="eyebrow">Como funciona pra você</span><h2>Do cadastro ao Pix</h2><ol>
      <li><div><b>Crie a conta</b><span>Com CPF e a foto do veículo. Moto exige 21 anos ou mais.</span></div></li>
      <li><div><b>Fique disponível</b><span>Um toque e você começa a receber corridas e entregas de lojas perto de você.</span></div></li>
      <li><div><b>Colete e entregue com código</b><span>Rota no Google Maps ou Waze. O código do cliente confirma a entrega.</span></div></li>
      <li><div><b>Receba no Pix do CPF</b><span>A sua parte cai direto na sua conta, de qualquer banco.</span></div></li></ol>
      <button class="btn full" type="button" data-cta="entregador">Criar conta de entregador</button>`
    :`<span class="eyebrow">Como funciona pra sua loja</span><h2>Do cardápio ao Pix</h2><ol>
      <li><div><b>Monte o cardápio</b><span>Fotos, preços, categorias, cores e tamanhos, tudo pelo celular.</span></div></li>
      <li><div><b>Divulgue o link da loja</b><span>No Instagram, no WhatsApp e no balcão.</span></div></li>
      <li><div><b>O pedido chega pago</b><span>Com alerta e som. O dinheiro cai na hora no Pix da loja.</span></div></li>
      <li><div><b>Entrega ou retirada</b><span>Pedido pronto, o Cadernex chama o motoboy. Ou o cliente busca no balcão com código.</span></div></li></ol>
      <button class="btn full" type="button" data-cta="cliente">Cadastrar minha loja grátis</button>`;
  const car=p.querySelector("#hx-car"),tiles=p.querySelector(".hx-tiles");
  (car||tiles||hx).after(como);
  // o que é de outro público sai da página deste app
  const sai=ENT?["#mk","#lj-info",".promo-l"]:['[data-cta="entregador"].btn.ghost',".promo-l"];
  sai.forEach(x=>p.querySelectorAll(x).forEach(e=>{if(!e.closest(".ap-como"))e.style.display="none"}));
  const mk=p.querySelector("#mk");if(mk)como.after(mk);
  }
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
document.addEventListener("click",e=>{if(!e.target.closest("#s-auth [data-cta]"))return;
  setTimeout(()=>document.querySelectorAll("#a-tipo [data-tipo]").forEach(x=>x.setAttribute("aria-checked",String(x.dataset.tipo===INFO.tipo))),0)});
let lojaIni=false;
function nomeAba(){const t=document.querySelector('.tab[data-v="lojas"]');if(ENT||!t)return;const n=[...t.childNodes].filter(x=>x.nodeType===3&&x.textContent.trim()).pop();if(n&&n.textContent!=="Minha loja")n.textContent="Minha loja"}
function depois(){
  nomeAba();
  if(typeof perfil==="undefined"||!perfil.tipo)return;
  const cli=perfil.tipo==="cliente";
  contaErrada(ENT?cli:!cli);
  if(!ENT&&cli&&!lojaIni){lojaIni=true;try{go("lojas")}catch(e){}}
  // app da Loja com a loja desligada: avisa e religa com um toque (os dados da loja continuam salvos)
  let av=document.getElementById("ap-religa");
  if(!ENT&&cli&&!perfil.loja&&String(perfil.loja_nome||"").trim()){
    if(!av){av=document.createElement("div");av.id="ap-religa";av.className="card";av.setAttribute("role","alert");
      av.style.cssText="margin:12px 16px;border:1.5px solid #f59e0b;display:flex;flex-direction:column;gap:8px";
      av.innerHTML=`<b style="font-size:16px">⚠️ Sua loja está desligada</b><span class="hint" style="margin:0">A <b></b> não aparece pros clientes e você não recebe pedidos. Os dados e o cardápio continuam salvos.</span><button class="btn" type="button">Religar minha loja</button>`;
      av.querySelector("b+span b,span b").textContent=perfil.loja_nome;
      av.querySelector("button").onclick=async()=>{try{await savePerfil({loja:true});av.remove();toast("Loja religada ✓");if(typeof aplicaPapel==="function")aplicaPapel(perfil);try{go("lojas")}catch(e){}}catch(e){toast("Não deu. Confira a internet.")}};
      const v=document.getElementById("v-lojas")||document.querySelector("main");if(v)v.prepend(av)}
  }else if(av)av.remove();
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
