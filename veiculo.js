/* Cadernex — veículo do entregador/freteiro: foto (pasta privada), placa e "já fica disponível" no cadastro */
(function(){
const BK="veiculos",CODES=Object.keys(VEIC);
let tenho={},thumbs={},placas={},carregou=false,ddArquivo=null;
const ehEnt=()=>typeof perfil!=="undefined"&&perfil.tipo!=="cliente";
const fotoDe=v=>`${v==="caminhao"?"do seu":"da sua"} ${veiNome(v).toLowerCase()}`;
const ehFrete=v=>FRETE_VEIC.includes(v);
const normPlaca=p=>String(p||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
const placaOk=p=>/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(p);

// diminui a foto no celular antes de mandar (até 1280 px, JPEG) pra economizar internet e espaço
async function comprimir(file){
  const img=await new Promise((ok,falha)=>{const u=URL.createObjectURL(file),i=new Image();i.onload=()=>{URL.revokeObjectURL(u);ok(i)};i.onerror=()=>{URL.revokeObjectURL(u);falha(new Error("img"))};i.src=u});
  const m=1280,esc=Math.min(1,m/Math.max(img.naturalWidth,img.naturalHeight));
  const c=document.createElement("canvas");c.width=Math.round(img.naturalWidth*esc);c.height=Math.round(img.naturalHeight*esc);
  c.getContext("2d").drawImage(img,0,0,c.width,c.height);
  return await new Promise(ok=>c.toBlob(ok,"image/jpeg",0.8));
}
async function carregar(){
  if(!sb||!uid||!ehEnt()||!sb.storage)return;
  const [r,pv]=await Promise.all([sb.storage.from(BK).list(uid),sb.from("veiculos").select("tipo,placa,cnh,rntrc")]);
  if(!pv.error)(pv.data||[]).forEach(x=>placas[x.tipo]=x);
  if(r.error){carregou=true;dispRender();return}
  const nomes=(r.data||[]).map(f=>f.name);tenho={};CODES.forEach(v=>tenho[v]=nomes.includes(v+".jpg"));
  const ps=CODES.filter(v=>tenho[v]).map(v=>`${uid}/${v}.jpg`);
  if(ps.length){const s=await sb.storage.from(BK).createSignedUrls(ps,3600);if(!s.error)(s.data||[]).forEach(x=>{if(x.signedUrl)thumbs[x.path.split("/")[1].replace(".jpg","")]=x.signedUrl})}
  carregou=true;dispRender();
}
async function enviar(vei,file){
  if(!file)return false;
  if(!/^image\//.test(file.type)){toast("Escolha uma foto (imagem).");return false}
  toast("Enviando a foto…");
  try{const blob=await comprimir(file);
    const{error}=await sb.storage.from(BK).upload(`${uid}/${vei}.jpg`,blob,{upsert:true,contentType:"image/jpeg"});
    if(error)throw error;
    tenho[vei]=true;thumbs[vei]=URL.createObjectURL(blob);dispRender();toast(`Foto ${fotoDe(vei)} salva ✓`);return true}
  catch(e){toast(/bucket|not found|policy|row-level/i.test(String(e.message))?"Falta atualizar o banco (frete.sql).":"Não deu pra enviar a foto. Confira a internet.");return false}
}
// placa, CNH e RNTRC dos veículos de frete (pref = "dp" no Ficar disponível, "dd" no cadastro)
function lerPlaca(pref){return{placa:normPlaca($(pref+"-placa").value),cnh:$(pref+"-cnh").value,rntrc:$(pref+"-rntrc").value.replace(/\D/g,"")||null}}
window.salvarPlaca=async function(v,pref){
  const x=lerPlaca(pref);
  if(!placaOk(x.placa))throw new Error("Placa inválida. Use o formato ABC1234 ou ABC1D23.");
  if(x.rntrc&&!/^\d{6,12}$/.test(x.rntrc))throw new Error("RNTRC inválido: só números (6 a 12).");
  const{error}=await sb.from("veiculos").upsert({tipo:v,...x});if(error)throw error;placas[v]={tipo:v,...x};
};
function preenchePlaca(v,pref){const w=$(pref+"-placa-w");if(!w)return;w.hidden=!ehFrete(v);const p=placas[v];
  if(p&&document.activeElement?.closest?.("#"+pref+"-placa-w")==null){$(pref+"-placa").value=p.placa||"";$(pref+"-cnh").value=p.cnh||"B";$(pref+"-rntrc").value=p.rntrc||""}}

/* ---------- Ficar disponível: foto e placa do veículo escolhido ---------- */
const veiSel=()=>veiCod((document.querySelector('#dp-vei [aria-pressed="true"]')||{}).textContent||"Bike");
function dispRender(){
  const el=$("dp-foto");if(!el)return;const v=veiSel();preenchePlaca(v,"dp");
  if(!carregou){el.innerHTML="";return}
  el.innerHTML=tenho[v]
    ?`<div class="vf-ok">${thumbs[v]?`<img alt="Foto ${fotoDe(v)}" src="${thumbs[v]}">`:""}<div><b>Foto ${fotoDe(v)} ✓</b><button class="link" type="button" data-vfoto-trocar style="padding:0">Trocar foto</button></div></div>`
    :`<div class="vf-falta"><b>Falta a foto ${fotoDe(v)}</b><span class="hint">Tire uma foto inteira do veículo, de lado e com boa luz${ehFrete(v)?", com a placa aparecendo":""}. O cliente vê essa foto pra reconhecer você na coleta.</span><button class="btn ghost full" type="button" data-vfoto-trocar>${IC.cam}Mandar foto ${fotoDe(v)}</button></div>`;
}
$("dp-vei").addEventListener("click",()=>setTimeout(dispRender,0));
document.addEventListener("click",e=>{if(e.target.closest("[data-vfoto-trocar]")){const f=$("dp-file");f.value="";f.click()}});
$("dp-file").addEventListener("change",async e=>{const ok=await enviar(veiSel(),e.target.files[0]);if(ok&&$("dp-file").dataset.depois==="1"){$("dp-file").dataset.depois="";$("fDisp").requestSubmit()}});
// sem foto (e placa, no frete), não deixa ficar disponível. O banco também confere.
document.addEventListener("submit",e=>{
  if(e.target.id!=="fDisp"||!carregou)return;const v=veiSel();
  if(ehFrete(v)&&!placaOk(normPlaca($("dp-placa").value))){e.preventDefault();e.stopImmediatePropagation();toast("Coloque a placa do veículo.");$("dp-placa").focus();return}
  if(!tenho[v]){e.preventDefault();e.stopImmediatePropagation();toast(`Primeiro mande uma foto ${fotoDe(v)}.`);const f=$("dp-file");f.value="";f.dataset.depois="1";f.click()}
},true);

/* ---------- Cadastro: veículo + foto (+ placa no frete) e já fica disponível ---------- */
chips($("dd-vei"),Object.values(VEIC).map(x=>x.n),"Bike");
const ddVei=()=>veiCod((document.querySelector('#dd-vei [aria-pressed="true"]')||{}).textContent||"Bike");
function ddRender(){
  const w=$("dd-vei-w");if(!w)return;w.hidden=!ehEnt();
  const v=ddVei();$("dd-foto-lbl").textContent=`Foto ${fotoDe(v)}`;preenchePlaca(v,"dd");
  $("dd-prev").hidden=!ddArquivo;if(ddArquivo){$("dd-prev").src=URL.createObjectURL(ddArquivo)}
  $("dd-foto-btn").innerHTML=ddArquivo?"Trocar foto":`${IC.cam}Tirar ou escolher foto ${fotoDe(v)}`;
}
$("dd-vei").addEventListener("click",()=>setTimeout(ddRender,0));
$("dd-foto-btn").onclick=()=>{const f=$("dd-file");f.value="";f.click()};
$("dd-file").addEventListener("change",e=>{const f=e.target.files[0];if(f&&/^image\//.test(f.type)){ddArquivo=f;$("dd-msg").textContent="";ddRender()}});
const espera=ms=>new Promise(r=>setTimeout(r,ms));
async function ficarDisponivelAposCadastro(v,arquivo){
  try{
    if(arquivo&&!(await enviar(v,arquivo)))return;
    if(ehFrete(v))await salvarPlaca(v,"dd");
    for(let i=0;i<40&&dadosOk!==true;i++)await espera(500); // espera o cadastro (CPF etc.) terminar de salvar
    if(dadosOk!==true)return;
    const{error}=await sb.from("disponiveis").upsert({veiculo:v,regiao:null});if(error)throw error;
    try{localStorage.setItem("cadernex_disp",JSON.stringify({veiculo:v,regiao:""}))}catch(e){}
    if(typeof corrLoad==="function")await corrLoad();
    toast(`Pronto! Você já está disponível pra ${ehFrete(v)?"fretes":"corridas"} com ${veiNome(v).toLowerCase()}.`);
  }catch(e){toast(String(e.message||"").length<120?String(e.message):"Cadastro salvo. Fique disponível na aba Corridas.")}
}
document.addEventListener("submit",e=>{
  if(e.target.id!=="fDados"||!ehEnt())return;
  const v=ddVei(),parar=m=>{e.preventDefault();e.stopImmediatePropagation();$("dd-msg").textContent=m};
  if(!ddArquivo&&!tenho[v])return parar(`Mande uma foto ${fotoDe(v)} pra completar o cadastro.`);
  if(ehFrete(v)&&!placaOk(normPlaca($("dd-placa").value)))return parar("Coloque a placa do veículo (ex.: ABC1D23).");
  const f=ddArquivo;ddArquivo=null;ficarDisponivelAposCadastro(v,f);
},true);
const _abrir=window.abrirDados;if(typeof abrirDados==="function"){abrirDados=function(){_abrir();ddRender()}}

/* ---------- Cliente: vê a foto do veículo de quem aceitou ---------- */
const fotoCorr={};
async function fotoCli(el,c){
  const id=c.id;
  if(fotoCorr[id]===undefined){fotoCorr[id]="…";
    const d=(typeof disp!=="undefined"?disp:[]).find(x=>x.user_id===c.entregador_id);
    const ordem=[...new Set([c.ent_veiculo,c.veiculo,d&&d.veiculo,...CODES].filter(v=>CODES.includes(v)))];
    let achou=null;
    for(const v of ordem){const r=await sb.storage.from(BK).createSignedUrl(`${c.entregador_id}/${v}.jpg`,3600);if(!r.error&&r.data&&r.data.signedUrl){achou={v,url:r.data.signedUrl};break}}
    fotoCorr[id]=achou;pintarCli();return}
  const f=fotoCorr[id];
  el.innerHTML=f&&f!=="…"?`<figure class="vf-cli"><img alt="Foto do veículo" src="${f.url}" loading="lazy"><figcaption>Veículo · ${veiNome(f.v)}${c.ent_placa?" · placa "+esc(c.ent_placa):""}. Confira na coleta.</figcaption></figure>`:"";
}
function pintarCli(){document.querySelectorAll(".vfoto-cli[data-vfoto]").forEach(el=>{const c=minhas.find(x=>x.id===el.dataset.vfoto);if(c&&sb.storage)fotoCli(el,c)})}

const _r=corrRender;corrRender=function(){_r();dispRender();pintarCli()};
const _al=window.agendaLoad;window.agendaLoad=async()=>{await _al();carregar()};
if(uid){carregar();setTimeout(()=>{dispRender();pintarCli()},0)}
})();
