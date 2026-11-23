/* Cadernex — avaliações no fim da entrega (todos avaliam todos)
   Entregador avalia loja e cliente; loja avalia entregador e cliente; cliente avalia loja e entregador.
   Quando uma entrega ou pedido termina, aparece uma janela única "Como foi?" com todo mundo que você pode avaliar. */
(function(){
const el=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const PAPEL={entregador:"🛵 Entregador",loja:"🏪 Loja",cliente:"🙋 Cliente"};
const NOTAS=["","Ruim","Fraco","Ok","Bom","Ótimo"];
const chave=a=>[a.para,a.corrida_id||"",a.pedido_id||""].join("|");
const ADIA="cx-av-adiadas";
let aberto=false,ultima=0;
function adiadas(){try{const o=JSON.parse(localStorage.getItem(ADIA)||"{}"),agora=Date.now();for(const k in o)if(o[k]<agora)delete o[k];return o}catch(e){return{}}}
function adiar(lista){try{const o=adiadas(),ate=Date.now()+6*36e5;lista.forEach(a=>o[chave(a)]=ate);localStorage.setItem(ADIA,JSON.stringify(o))}catch(e){}}
function css(){if(el("av-css"))return;const s=document.createElement("style");s.id="av-css";s.textContent=`
#av-bg{position:fixed;inset:0;z-index:9100;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center}
#av-box{width:100%;max-width:520px;max-height:92vh;overflow:auto;background:var(--card,#fff);border-radius:20px 20px 0 0;padding:18px 16px calc(18px + env(safe-area-inset-bottom));display:flex;flex-direction:column;gap:12px}
.av-it{padding:12px;border-radius:14px;background:var(--bg);box-shadow:inset 0 0 0 1px var(--line);display:flex;flex-direction:column;gap:6px}
.av-it small{color:var(--muted);font-size:12px}.av-it .pp{font-size:12px;font-weight:700;color:var(--muted)}
.av-st{display:flex;gap:4px;align-items:center}.av-st button{border:0;background:none;font-size:30px;line-height:1;padding:2px;cursor:pointer;color:var(--line);transition:transform .1s}
.av-st button.on{color:#f3ba2f}.av-st button:active{transform:scale(1.2)}.av-st span{margin-left:6px;font-size:13px;font-weight:700;color:var(--muted)}
.av-it textarea{width:100%;min-height:0;height:40px;resize:none;font:inherit;font-size:14px;padding:8px 10px;border-radius:10px;border:1px solid var(--line);background:var(--card,#fff);color:inherit}
.av-it textarea[hidden]{display:none}`;document.head.appendChild(s)}
async function checar(forca){
  if(aberto||typeof sb==="undefined"||!sb||typeof uid==="undefined"||!uid)return;
  if(!forca&&Date.now()-ultima<45000)return;ultima=Date.now();
  const r=await sb.rpc("avaliacoes_pendentes");if(r.error||!r.data||!r.data.length)return;
  const ad=adiadas(),lista=r.data.filter(a=>!ad[chave(a)]);if(lista.length)abrir(lista);
}
function abrir(lista){
  css();aberto=true;const notas={},txt={};
  const bg=document.createElement("div");bg.id="av-bg";bg.setAttribute("role","dialog");bg.setAttribute("aria-modal","true");bg.setAttribute("aria-label","Avaliar a entrega");
  bg.innerHTML=`<div id="av-box"><div><div class="eyebrow">Entrega concluída</div><h2 style="margin:2px 0 0">Como foi?</h2>
    <p class="hint" style="margin:4px 0 0">Sua avaliação ajuda a manter o Cadernex seguro pra todo mundo. Só a nota média aparece pros outros.</p></div>
    ${lista.map((a,i)=>`<div class="av-it" data-i="${i}"><span class="pp">${PAPEL[a.papel]||a.papel}</span><b>${esc(a.nome)}</b><small>${esc(a.resumo||"")}</small>
      <div class="av-st" role="radiogroup" aria-label="Nota para ${esc(a.nome)}">${[1,2,3,4,5].map(n=>`<button type="button" role="radio" aria-checked="false" aria-label="${n} estrela${n>1?"s":""}" data-n="${n}">★</button>`).join("")}<span></span></div>
      <textarea maxlength="200" placeholder="Conte o que aconteceu (opcional)" hidden></textarea></div>`).join("")}
    <button class="btn full" type="button" id="av-ok" disabled>Toque nas estrelas pra avaliar</button>
    <button class="btn ghost full" type="button" id="av-nao">Agora não</button></div>`;
  document.body.appendChild(bg);
  const ok=el("av-ok");
  const conta=()=>{const n=Object.keys(notas).length;ok.disabled=!n;ok.textContent=n?`Enviar ${n===lista.length?"":n+" de "+lista.length+" "}avaliaç${n>1?"ões":"ão"}`:"Toque nas estrelas pra avaliar"};
  bg.addEventListener("click",e=>{
    const b=e.target.closest(".av-st button");if(!b)return;const it=b.closest(".av-it"),i=+it.dataset.i,n=+b.dataset.n;notas[i]=n;
    it.querySelectorAll(".av-st button").forEach(x=>{const on=+x.dataset.n<=n;x.classList.toggle("on",on);x.setAttribute("aria-checked",+x.dataset.n===n?"true":"false")});
    it.querySelector(".av-st span").textContent=NOTAS[n];
    const t=it.querySelector("textarea");t.hidden=false;t.placeholder=n<=2?"O que deu errado? (ajuda o moderador)":"Quer deixar um elogio? (opcional)";conta()});
  const fecha=()=>{bg.remove();aberto=false};
  el("av-nao").onclick=()=>{adiar(lista);fecha()};
  ok.onclick=async()=>{ok.disabled=true;ok.textContent="Enviando…";let erro=0;
    for(const i of Object.keys(notas)){const a=lista[i],t=bg.querySelector(`.av-it[data-i="${i}"] textarea`).value.trim();
      const r=await sb.rpc("avaliar",{cid:a.corrida_id||null,pid:a.pedido_id||null,alvo:a.para,n:notas[i],txt:t||null});if(r.error&&!/disponível/.test(r.error.message||""))erro++}
    if(erro){ok.disabled=false;conta();toast("Não deu pra enviar agora. Confira a internet.");return}
    const sobra=lista.filter((a,i)=>notas[i]==null);if(sobra.length)adiar(sobra);
    fecha();toast("Obrigado pela avaliação ⭐");};
}
// checa ao abrir o app, ao voltar pra ele e de tempos em tempos
document.addEventListener("visibilitychange",()=>{if(!document.hidden)setTimeout(()=>checar(),1500)});
setInterval(()=>{if(!document.hidden)checar()},60000);
setTimeout(()=>checar(true),5000);
window.cxAvaliar=()=>checar(true);
// a cada atualização das corridas (entrega concluída), confere se tem alguém pra avaliar
if(typeof corrLoad==="function"){const o=corrLoad;corrLoad=async function(){const r=await o.apply(this,arguments);checar();return r}}

/* ---------- nota média pública (lista de lojas do delivery) ---------- */
const cache={};
window.cxNotas=async function(ids){
  ids=[...new Set(ids.filter(Boolean))].filter(i=>!(i in cache));
  if(ids.length&&typeof sb!=="undefined"&&sb){const r=await sb.rpc("notas_de",{ids});ids.forEach(i=>cache[i]=null);if(!r.error)(r.data||[]).forEach(x=>{if(!cache[x.id]||x.papel==="loja")cache[x.id]={media:Number(x.media),total:Number(x.total),papel:x.papel}})}
  return cache;
};
window.cxNotaTxt=id=>{const c=cache[id];return c&&c.total?`★ ${c.media.toFixed(1).replace(".",",")} (${c.total})`:""};
})();
