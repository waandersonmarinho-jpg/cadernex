/* Cadernex — selfie obrigatória do entregador.
   No cadastro: tirar a selfie (câmera da frente) antes de salvar.
   Quem já tem cadastro e ainda não tem selfie: aviso nas Corridas e não fica disponível sem ela.
   A selfie vira a foto do perfil (pasta privada "perfis", <id>/foto.jpg). */
(function(){
const el=id=>document.getElementById(id);
const BK="perfis";
const ehEnt=()=>typeof perfil!=="undefined"&&perfil.tipo&&perfil.tipo!=="cliente";
let tem=null,arquivo=null,enviando=false;

async function comprimir(file){ // quadrado no centro, até 512 px, JPEG
  const img=await new Promise((ok,falha)=>{const u=URL.createObjectURL(file),i=new Image();i.onload=()=>{URL.revokeObjectURL(u);ok(i)};i.onerror=()=>{URL.revokeObjectURL(u);falha(new Error("img"))};i.src=u});
  const lado=Math.min(img.naturalWidth,img.naturalHeight),t=Math.min(512,lado),c=document.createElement("canvas");c.width=c.height=t;
  c.getContext("2d").drawImage(img,(img.naturalWidth-lado)/2,(img.naturalHeight-lado)/2,lado,lado,0,0,t,t);
  return await new Promise(ok=>c.toBlob(ok,"image/jpeg",0.85));
}
async function enviar(file){
  if(!file||!sb||!uid)return false;
  if(!/^image\//.test(file.type)){toast("Escolha uma foto (imagem).");return false}
  enviando=true;toast("Enviando a selfie…");
  try{const blob=await comprimir(file);
    const{error}=await sb.storage.from(BK).upload(`${uid}/foto.jpg`,blob,{upsert:true,contentType:"image/jpeg"});if(error)throw error;
    tem=true;pinta();toast("Selfie salva ✓");return true}
  catch(e){toast("Não deu pra enviar a selfie. Confira a internet e tente de novo.");return false}
  finally{enviando=false}
}
async function verificar(){
  if(!sb||!uid||!ehEnt()||!sb.storage){tem=null;pinta();return}
  const r=await sb.storage.from(BK).list(uid,{search:"foto.jpg"});
  tem=r.error?null:(r.data||[]).some(f=>f.name==="foto.jpg");pinta();
}

/* ---------- no cadastro ---------- */
const BLOCO=`<div id="sf-w" class="stack sf-w" hidden style="gap:8px">
  <div class="eyebrow">Sua selfie (obrigatória)</div>
  <div class="sf-linha"><div class="sf-av" id="sf-prev" aria-hidden="true"><svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg></div>
  <p class="hint" style="margin:0">Foto do seu rosto, de frente, sem óculos escuros nem boné, com boa luz. O cliente vê quando você aceita a corrida.</p></div>
  <button class="btn ghost full" type="button" id="sf-btn">Tirar selfie</button>
  <input type="file" id="sf-file" accept="image/*" capture="user" hidden>
</div>`;
function montar(){const v=el("dd-vei-w");if(v&&!el("sf-w"))v.insertAdjacentHTML("beforebegin",BLOCO)}
function pinta(){
  montar();const w=el("sf-w");if(w){w.hidden=!ehEnt();
    const p=el("sf-prev");if(arquivo){p.innerHTML=`<img src="${URL.createObjectURL(arquivo)}" alt="">`}
    el("sf-btn").textContent=arquivo||tem?"Tirar outra selfie":"Tirar selfie"}
  // aviso nas Corridas
  const a=el("sf-aviso");if(a)a.hidden=!(ehEnt()&&tem===false);
}
document.addEventListener("click",e=>{
  if(e.target.closest("#sf-btn")){const f=el("sf-file");f.value="";f.click();return}
  if(e.target.closest("#sf-aviso-btn")){const f=el("sf-file-av");f.value="";f.click()}
});
document.addEventListener("change",async e=>{
  if(e.target.id==="sf-file"){const f=e.target.files[0];if(f&&/^image\//.test(f.type)){arquivo=f;const m=el("dd-msg");if(m)m.textContent="";pinta()}}
  if(e.target.id==="sf-file-av"){const ok=await enviar(e.target.files[0]);if(ok&&el("sf-aviso").dataset.depois==="1"){el("sf-aviso").dataset.depois="";el("fDisp")?.requestSubmit()}}
});
// cadastro: sem selfie não salva (roda antes da foto do veículo)
document.addEventListener("submit",async e=>{
  if(e.target.id!=="fDados"||!ehEnt()||e.target.dataset.sfOk==="1"){if(e.target.id==="fDados")e.target.dataset.sfOk="";return}
  if(tem&&!arquivo)return;
  e.preventDefault();e.stopImmediatePropagation();
  const m=el("dd-msg");
  if(!arquivo){if(m)m.textContent="Tire uma selfie pra completar o cadastro.";el("sf-w")?.scrollIntoView({behavior:"smooth",block:"center"});return}
  if(enviando)return;
  const ok=await enviar(arquivo);if(!ok)return;arquivo=null;
  e.target.dataset.sfOk="1";e.target.requestSubmit();
},true);

/* ---------- quem já tem cadastro ---------- */
function montarAviso(){
  const f=el("fDisp");if(!f||el("sf-aviso"))return;
  f.insertAdjacentHTML("beforebegin",`<div class="card sf-aviso" id="sf-aviso" hidden><div class="sf-linha"><div class="sf-av" aria-hidden="true"><svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg></div>
    <div class="stack" style="gap:4px;min-width:0"><b>Falta sua selfie</b><span class="hint" style="margin:0">Agora a selfie é obrigatória pra ficar disponível. Leva 10 segundos.</span></div></div>
    <button class="btn full" type="button" id="sf-aviso-btn">Tirar selfie agora</button><input type="file" id="sf-file-av" accept="image/*" capture="user" hidden></div>`);
}
document.addEventListener("submit",e=>{
  if(e.target.id!=="fDisp"||!ehEnt()||tem!==false)return;
  e.preventDefault();e.stopImmediatePropagation();
  const a=el("sf-aviso");if(a){a.hidden=false;a.dataset.depois="1";a.scrollIntoView({behavior:"smooth",block:"center"})}
  toast("Tire uma selfie pra ficar disponível");
},true);

montarAviso();
// usado pela área do promotor
window.cxSelfie={
  enviar:async f=>{const ok=await enviar(f);if(ok)tem=true;return ok},
  tem:async()=>{if(!sb||!uid||!sb.storage)return null;const r=await sb.storage.from(BK).list(uid,{search:"foto.jpg"});return r.error?null:(r.data||[]).some(f=>f.name==="foto.jpg")},
  comprimir
};
if(typeof go==="function"){const g=go;go=function(v){g(v);if(v==="resumo"||v==="corridas"||v==="config")verificar()}}
const _ab=window.abrirDados;if(typeof abrirDados==="function"){abrirDados=function(){_ab();pinta();if(tem===null)verificar()}}
const _al=window.agendaLoad;window.agendaLoad=async()=>{await _al();verificar()};
if(uid)setTimeout(verificar,0);
})();
