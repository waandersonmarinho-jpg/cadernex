/* Cadernex — foto obrigatória pra todo mundo
   Entregador: selfie (selfie.js, antes de ficar disponível). Promotor: selfie (promotor.js, antes de sacar).
   Cliente: selfie antes de pedir entrega ou delivery. Lojista: foto da fachada antes de vender pelo app.
   É uma foto de identificação, não reconhecimento facial. Fica na pasta privada "perfis", <id>/foto.jpg. */
(function(){
const BK="perfis",el=id=>document.getElementById(id);
let tem=null,de=null; // tem: true/false/null (não sabe) · de: uid da última checagem
const ehLojista=()=>typeof perfil!=="undefined"&&!!perfil.loja&&!!String(perfil.loja_nome||"").trim();
const ehEnt=()=>typeof perfil!=="undefined"&&perfil.tipo==="entregador";

async function confere(forca){
  if(typeof sb==="undefined"||!sb||!sb.storage||typeof uid==="undefined"||!uid)return null;
  if(!forca&&de===uid&&tem!==null)return tem;
  const r=await sb.storage.from(BK).list(uid,{search:"foto.jpg"});
  tem=r.error?null:(r.data||[]).some(f=>f.name==="foto.jpg");de=uid;return tem;
}
async function comprimir(file){
  if(window.cxSelfie&&cxSelfie.comprimir)return cxSelfie.comprimir(file);
  const img=await new Promise((ok,falha)=>{const u=URL.createObjectURL(file),i=new Image();i.onload=()=>{URL.revokeObjectURL(u);ok(i)};i.onerror=()=>{URL.revokeObjectURL(u);falha(new Error("img"))};i.src=u});
  const lado=Math.min(img.naturalWidth,img.naturalHeight),t=Math.min(512,lado),c=document.createElement("canvas");c.width=c.height=t;
  c.getContext("2d").drawImage(img,(img.naturalWidth-lado)/2,(img.naturalHeight-lado)/2,lado,lado,0,0,t,t);
  return await new Promise(ok=>c.toBlob(ok,"image/jpeg",0.85));
}

/* ---------- janela "falta sua foto" ---------- */
const ICO_ROSTO='<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>';
const ICO_LOJA='<svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6"/></svg>';
function estilo(){if(el("fc-css"))return;const s=document.createElement("style");s.id="fc-css";s.textContent=`
#fc-bg{position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center;padding:16px}
#fc-box{width:100%;max-width:440px;background:var(--card,#fff);color:inherit;border-radius:18px;padding:20px;display:flex;flex-direction:column;gap:12px;box-shadow:0 10px 40px rgba(0,0,0,.3)}
#fc-box .fc-av{width:84px;height:84px;border-radius:50%;margin:0 auto;display:grid;place-items:center;overflow:hidden;background:rgba(127,127,127,.15)}
#fc-box .fc-av img{width:100%;height:100%;object-fit:cover}
#fc-box h3{margin:0;text-align:center;font-size:20px}#fc-box p{margin:0;text-align:center}`;document.head.appendChild(s)}
function pede(){
  return new Promise(fim=>{
    estilo();const loja=ehLojista();
    const bg=document.createElement("div");bg.id="fc-bg";bg.setAttribute("role","dialog");bg.setAttribute("aria-modal","true");
    bg.innerHTML=`<div id="fc-box"><div class="fc-av" aria-hidden="true">${loja?ICO_LOJA:ICO_ROSTO}</div>
      <h3>${loja?"Falta a foto da fachada da loja":"Falta sua selfie"}</h3>
      <p class="hint">${loja?"Tire uma foto da frente da sua loja, com o nome aparecendo. O entregador e o cliente veem pra achar o lugar e confiar no pedido.":"Pra pedir pelo Cadernex, tire uma selfie: rosto de frente, sem óculos escuros nem boné, com boa luz. O entregador da sua corrida vê a foto na hora da entrega."}</p>
      <button class="btn full" type="button" id="fc-ok">${loja?"Tirar foto da fachada":"Tirar selfie agora"}</button>
      <button class="btn ghost full" type="button" id="fc-nao">Agora não</button>
      <input type="file" id="fc-file" accept="image/*" capture="${loja?"environment":"user"}" hidden></div>`;
    document.body.appendChild(bg);
    const sai=v=>{bg.remove();fim(v)};
    el("fc-nao").onclick=()=>sai(false);
    bg.addEventListener("click",e=>{if(e.target===bg)sai(false)});
    el("fc-ok").onclick=()=>{const f=el("fc-file");f.value="";f.click()};
    el("fc-file").onchange=async e=>{
      const file=e.target.files&&e.target.files[0];if(!file)return;
      if(!/^image\//.test(file.type)){toast("Escolha uma foto (imagem).");return}
      const b=el("fc-ok");b.disabled=true;b.textContent="Enviando a foto…";
      try{const blob=await comprimir(file);
        const{error}=await sb.storage.from(BK).upload(`${uid}/foto.jpg`,blob,{upsert:true,contentType:"image/jpeg"});if(error)throw error;
        tem=true;de=uid;toast(loja?"Foto da fachada salva ✓":"Selfie salva ✓");
        if(typeof window.cxFotoAtualiza==="function")window.cxFotoAtualiza(URL.createObjectURL(blob));
        sai(true)}
      catch(err){b.disabled=false;b.textContent="Tentar de novo";toast("Não deu pra enviar a foto. Confira a internet e tente de novo.")}
    };
  });
}
/* Garante a foto antes de seguir. Devolve true se pode continuar. */
async function garante(){
  if(ehEnt())return true;                 // entregador: selfie.js cuida
  let t=null;try{t=await confere()}catch(e){}
  if(t!==false)return true;               // tem foto, ou não deu pra checar (o servidor confere de novo)
  return await pede();
}
window.cxFotoGarante=garante;
window.cxFotoTem=()=>tem;

/* pedir entrega (fPedir) e várias entregas (fLote): sem foto, pede antes de enviar */
document.addEventListener("submit",async e=>{
  const f=e.target;if(!f||(f.id!=="fPedir"&&f.id!=="fLote"))return;
  if(f.dataset.fcOk==="1"){f.dataset.fcOk="";return}
  if(ehEnt()||tem===true&&de===uid)return;
  e.preventDefault();e.stopImmediatePropagation();
  if(await garante()){f.dataset.fcOk="1";f.requestSubmit()}
},true);

// quando trocam a foto pelo Perfil, a checagem vale de novo
document.addEventListener("change",e=>{if(e.target.closest&&e.target.closest(".pf-foto input[type=file]"))setTimeout(()=>{tem=null},4000)});
})();
