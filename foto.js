/* Cadernex — foto do perfil: o entregador põe o rosto, quem envia põe a fachada do estabelecimento (ou a própria foto).
   Quem participa da corrida vê a foto do outro no cartão da corrida. */
(function(){
const BK="perfis";
let minha=null,cache={}; // cache: user_id -> {url, ate}
const ehEnt=()=>perfil&&perfil.tipo==="entregador";
async function comprimir(file){ // recorta quadrado no centro e reduz pra 512 px
  const img=await new Promise((ok,falha)=>{const u=URL.createObjectURL(file),i=new Image();i.onload=()=>{URL.revokeObjectURL(u);ok(i)};i.onerror=()=>{URL.revokeObjectURL(u);falha(new Error("img"))};i.src=u});
  const lado=Math.min(img.naturalWidth,img.naturalHeight),t=Math.min(512,lado),c=document.createElement("canvas");c.width=c.height=t;
  c.getContext("2d").drawImage(img,(img.naturalWidth-lado)/2,(img.naturalHeight-lado)/2,lado,lado,0,0,t,t);
  return await new Promise(ok=>c.toBlob(ok,"image/jpeg",0.82));
}
function textos(){return ehEnt()
  ?{t:"Sua foto",h:"Uma foto do seu rosto, de frente e com boa luz. O cliente vê quando você aceita a corrida: passa confiança e ajuda na coleta."}
  :{t:"Foto do estabelecimento",h:"A fachada da sua loja, farmácia ou restaurante (ou uma foto sua). O entregador vê quando aceita a corrida e acha o lugar mais rápido."}}
function cardRender(){
  document.querySelectorAll(".pf-foto").forEach(w=>{
    const so=w.dataset.para;w.hidden=!uid||(so==="ent"&&!ehEnt())||(so==="cli"&&ehEnt());if(w.hidden)return;
    const x=textos();w.querySelector("[data-ft]").textContent=x.t;w.querySelector("[data-fh]").textContent=x.h;
    const im=w.querySelector(".pf-av");im.innerHTML=minha?`<img src="${minha}" alt="">`:`<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">${ehEnt()?'<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>':'<path d="M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6"/>'}</svg>`;
    w.querySelector("[data-fb]").textContent=minha?"Trocar foto":"Adicionar foto";
  });
}
async function carregarMinha(){
  if(!sb||!uid||!sb.storage)return;
  const r=await sb.storage.from(BK).createSignedUrl(`${uid}/foto.jpg`,3600);
  minha=!r.error&&r.data&&r.data.signedUrl?r.data.signedUrl:null;cardRender();
}
document.addEventListener("click",e=>{const b=e.target.closest(".pf-foto [data-fb]");if(!b)return;b.closest(".pf-foto").querySelector("input[type=file]").click()});
document.addEventListener("change",async e=>{
  const inp=e.target.closest(".pf-foto input[type=file]");if(!inp)return;const file=inp.files&&inp.files[0];inp.value="";
  if(!file)return;if(!/^image\//.test(file.type)){toast("Escolha uma foto (imagem).");return}
  toast("Enviando a foto…");
  try{const blob=await comprimir(file);
    const{error}=await sb.storage.from(BK).upload(`${uid}/foto.jpg`,blob,{upsert:true,contentType:"image/jpeg"});if(error)throw error;
    minha=URL.createObjectURL(blob);cache[uid]={url:minha,ate:Date.now()+3e6};cardRender();toast("Foto salva ✓")}
  catch(err){toast(/bucket|not found|policy|row-level/i.test(String(err&&err.message))?"Falta atualizar o banco (foto.sql).":"Não deu pra enviar a foto. Confira a internet.")}
});
/* fotos nos cartões das corridas */
async function urlDe(id){
  const c=cache[id];if(c&&c.ate>Date.now())return c.url;
  const r=await sb.storage.from(BK).createSignedUrl(`${id}/foto.jpg`,3600);
  const url=!r.error&&r.data&&r.data.signedUrl?r.data.signedUrl:null;cache[id]={url,ate:Date.now()+(url?3e6:6e5)};return url;
}
function pintar(){
  if(!sb||!sb.storage)return;
  document.querySelectorAll(".av[data-av]").forEach(async el=>{
    const id=el.dataset.av;if(el.dataset.ok===id)return;el.dataset.ok=id;
    const url=await urlDe(id);if(url){el.innerHTML=`<img src="${url}" alt="" loading="lazy">`;el.hidden=false}else el.hidden=true;
  });
}
if(typeof corrRender==="function"){const _r=corrRender;corrRender=function(){_r();pintar()}}
if(typeof go==="function"){const g=go;go=function(v){g(v);if(v==="config"||v==="perfilc")cardRender()}}
const _al=window.agendaLoad;window.agendaLoad=async()=>{await _al();carregarMinha()};
if(uid)setTimeout(carregarMinha,0);
})();
