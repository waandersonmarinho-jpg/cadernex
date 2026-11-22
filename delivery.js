/* Cadernex — Delivery das lojas
   Lojista: cardápio com foto e categoria, abrir/fechar a loja e o link próprio pra mandar aos clientes.
   Cliente: lojas perto, cardápio por categoria, carrinho e pedido enviado pelo WhatsApp da loja.
   A loja confirma e chama o motoboy do Cadernex. */
(function(){
const V=$("v-lojas");if(!V)return;
const CFG=window.CORRE_CONFIG||{},SITE="https://cadernex.com.br/";
const LINK_KEY="cx-loja-link",CART_KEY="cx-dl-cart";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const so=v=>String(v||"").replace(/\D/g,"");
const ehLoja=()=>!!(perfil&&perfil.loja&&String(perfil.loja_nome||"").trim());
const aberta=()=>perfil.loja_aberta!==false;
const fotoUrl=(loja,p)=>p.foto_v?`${CFG.SUPABASE_URL}/storage/v1/object/public/produtos/${loja}/${p.id}.jpg?v=${p.foto_v}`:"";
const linkDa=id=>`${SITE}?loja=${id===uid&&perfil.loja_slug?perfil.loja_slug:id}`;
const imgLoja=(id,tipo,v)=>v?`${CFG.SUPABASE_URL}/storage/v1/object/public/produtos/${id}/${tipo}.jpg?v=${v}`:"";
const iniciais=n=>String(n||"?").trim().split(/\s+/).slice(0,2).map(x=>x[0]||"").join("").toUpperCase();
const logoHtml=(id,nome,v,cls)=>v?`<img class="${cls}" src="${esc(imgLoja(id,"logo",v))}" alt="" loading="lazy">`:`<span class="${cls} dl-ini">${esc(iniciais(nome))}</span>`;
// taxa de entrega estimada = corrida do Cadernex (R$ 8 até 3 km, + R$ 1,40/km) + 14% de serviço + R$ 1,99 do app, arredondada pra 50 centavos
const freteDe=k=>{const base=typeof justo==="function"?justo(k):Math.max(8,Math.ceil((8+1.4*Math.max(0,k-3))*2)/2);return Math.ceil((base*1.14+1.99)*2)/2};
const IC={
  loja:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6"/></svg>',
  foto:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  zap:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.9A8 8 0 1121 12z"/></svg>'};

/* ---------- link da loja: guarda e abre depois de entrar ---------- */
const SLUG=/^[a-z0-9]+(-[a-z0-9]+)*$/i,valeLink=v=>!!v&&(UUID.test(v)||(SLUG.test(v)&&v.length>=3&&v.length<=40));
try{const q=new URLSearchParams(location.search).get("loja");if(valeLink(q)){localStorage.setItem(LINK_KEY,q.toLowerCase());history.replaceState(null,"",location.pathname+location.hash)}}catch(e){}
const linkPend=()=>{try{const v=localStorage.getItem(LINK_KEY);return valeLink(v)?v:null}catch(e){return null}};
window.cxLinkPend=linkPend;
// o link pode ter o id ou o nome da loja (cadernex.com.br/?loja=nome-da-loja)
async function idDoLink(v){if(!v)return null;if(UUID.test(v))return v.toLowerCase();
  for(let i=0;i<40&&!sb;i++)await new Promise(r=>setTimeout(r,150));if(!sb)return null;
  const r=await sb.rpc("loja_id_por_slug",{s:v});return r.error?null:r.data||null}
const slugDe=n=>String(n||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,40).replace(/-+$/,"");
// quem abre o link sem estar logado vê o cardápio direto (vitrine pública), sem criar conta
let publico=false,cliCasa=null;
function vitrineAbrir(id){
  const sv=$("s-vitrine"),cli=$("dl-cli");if(!sv||!cli)return;
  if(!cliCasa)cliCasa={pai:cli.parentNode,depois:cli.nextSibling};
  $("vt-slot").appendChild(cli);publico=true;document.documentElement.classList.add("vitrine");document.title="Cadernex Delivery";
  ["s-setup","s-auth","s-dados","s-app"].forEach(k=>{const x=$(k);if(x)x.hidden=true});sv.hidden=false;
  abrirLoja(id);
}
function vitrineFechar(){
  const sv=$("s-vitrine"),cli=$("dl-cli");if(!sv)return;sv.hidden=true;
  if(publico&&cliCasa&&cli){cliCasa.pai.insertBefore(cli,cliCasa.depois);publico=false;loja=null;document.documentElement.classList.remove("vitrine");document.title="Cadernex Entregas: motoboy, delivery e fretes em Goiânia"}
}
async function vitrineCheca(){
  const id=linkPend();if(!id)return;
  for(let i=0;i<60;i++){ // espera o app decidir: logado (abre na aba Delivery) ou não (vitrine pública)
    if(uid)return;
    if(sb&&$("s-auth")&&!$("s-auth").hidden){vitrineAbrir(id);return}
    await new Promise(r=>setTimeout(r,150));
  }
}
vitrineCheca();
if(typeof show==="function"){const sh=show;show=function(w){if(publico&&w==="auth")return;sh(w)}}
document.addEventListener("click",e=>{if(!e.target.closest("#vt-entrar,[data-vtentrar]"))return;vitrineFechar();show("auth");if(window.auAba)auAba("entrar")});

/* ---------- foto: reduz pra no máximo 900 px ---------- */
async function comprimir(file){
  const img=await new Promise((ok,falha)=>{const u=URL.createObjectURL(file),i=new Image();i.onload=()=>{URL.revokeObjectURL(u);ok(i)};i.onerror=()=>{URL.revokeObjectURL(u);falha(new Error("img"))};i.src=u});
  const k=Math.min(1,900/Math.max(img.naturalWidth,img.naturalHeight)),c=document.createElement("canvas");
  c.width=Math.round(img.naturalWidth*k);c.height=Math.round(img.naturalHeight*k);c.getContext("2d").drawImage(img,0,0,c.width,c.height);
  return await new Promise(ok=>c.toBlob(ok,"image/jpeg",0.8));
}
async function subirImgLoja(tipo,file){
  const blob=await comprimir(file);if(!blob)throw Object.assign(new Error("foto"),{cxMsg:"Não deu pra ler essa foto. Tente outra."});
  const{error}=await sb.storage.from("produtos").upload(`${uid}/${tipo}.jpg`,blob,{upsert:true,contentType:"image/jpeg"});
  if(error)throw Object.assign(error,{cxMsg:"A foto não subiu. Confira a internet e tente de novo."});
  const v=Date.now();await savePerfil(tipo==="logo"?{loja_logo_v:v}:{loja_capa_v:v});return v;
}
async function subirFoto(pid,file){
  const blob=await comprimir(file);if(!blob)throw Object.assign(new Error("foto"),{cxMsg:"Não deu pra ler essa foto. Tente outra."});
  const{error}=await sb.storage.from("produtos").upload(`${uid}/${pid}.jpg`,blob,{upsert:true,contentType:"image/jpeg"});
  if(error)throw Object.assign(error,{cxMsg:"A foto não subiu. Confira a internet e tente de novo."});
  const v=Date.now(),u=await sb.from("produtos").update({foto_v:v}).eq("id",pid);if(u.error)throw u.error;return v;
}

/* ================= LOJISTA ================= */
let meus=[],fotoNova=null;
let slugTentou=false;
async function slugAuto(){if(slugTentou||perfil.loja_slug||!ehLoja())return;slugTentou=true;const v=slugDe(perfil.loja_nome);if(v.length<3)return;
  const r=await sb.rpc("loja_slug_definir",{desejado:v});if(!r.error&&r.data){perfil.loja_slug=r.data;admRender()}}
async function meusLoad(){if(!sb||!uid||!ehLoja())return;slugAuto();const r=await sb.from("produtos").select("*").eq("loja_id",uid).order("criado_em");meus=r.error?[]:r.data;admRender()}
const grupos=lista=>{const m=new Map();lista.forEach(p=>{const c=String(p.categoria||"").trim()||"Outros";if(!m.has(c))m.set(c,[]);m.get(c).push(p)});
  const o=m.get("Outros");if(o){m.delete("Outros");m.set("Outros",o)}return[...m.entries()]};
function admRender(){
  const w=$("dl-adm");if(!w)return;w.hidden=!ehLoja();if(w.hidden)return;
  const ab=aberta(),z=so(perfil.loja_whats),cats=[...new Set(meus.map(p=>String(p.categoria||"").trim()).filter(Boolean))];
  w.innerHTML=`
  <div class="card stack dl-st${ab?" on":""}">
    <div class="row" style="align-items:center;gap:10px"><div><div class="eyebrow">Seu delivery</div><h2 style="margin:2px 0 0">${esc(perfil.loja_nome)}</h2></div>
      <span class="dl-pill${ab?" on":""}">${ab?"Aberta":"Fechada"}</span></div>
    <p class="hint" style="margin:0">${ab?"Os clientes estão vendo seu cardápio e podem fazer pedidos.":"Os clientes veem seu cardápio, mas não conseguem pedir até você abrir."}</p>
    <button class="btn full${ab?" ghost":""}" type="button" data-dlab>${ab?"Fechar a loja agora":"Abrir a loja"}</button>
    ${z?"":`<p class="dl-aviso">Coloque o <b>WhatsApp da loja</b> em Perfil → Informações da loja. É por ele que chegam os pedidos. <button class="link" type="button" data-go="perfilc">Colocar agora</button></p>`}
  </div>
  ${pedLojaHtml()}
  <div class="card stack" id="dl-pixcard">
    <div class="row" style="align-items:center;gap:12px"><div style="flex:1;min-width:0"><div class="eyebrow">Pix direto pra loja</div><h2 style="margin:2px 0 0">Receber pelo app</h2></div>
      <button type="button" class="dl-sw${perfil.loja_pix?" on":""}" role="switch" aria-checked="${perfil.loja_pix?"true":"false"}" aria-label="Receber pelo app" data-dlpixsw><i></i></button></div>
    ${perfil.loja_pix?`<p class="hint" style="margin:0"><b class="pix-on">✓ Ligado.</b> Seus clientes pagam por Pix no app e o dinheiro cai na hora na chave Pix abaixo.</p>`
    :`<p class="hint" style="margin:0">O cliente paga por Pix no app e o dinheiro cai <b>na hora</b> na chave Pix da loja. O pedido chega pra você já pago.</p>
      <p class="hint" style="margin:0;font-size:13px">Taxas: o Cadernex fica com <b>12% dos produtos</b>, e o cliente paga <b>10% de serviço</b>. Exemplo: pedido de R$ 100 → você recebe R$ 88 + a entrega. Quando você chama o motoboy do Cadernex, a corrida tem 14% de serviço + R$ 1,99 de taxa do app.</p>
      <p class="dl-aviso" style="margin:0"><b>Desligado: os clientes só conseguem pedir depois que você ligar.</b></p>`}
    <div class="pix-chave"><small>Chave Pix da loja</small><b class="num" id="dl-pixk">${esc(chaveTxt())}</b></div>
    <button class="link" type="button" data-dlpixed style="align-self:flex-start;padding:0">${pixInfo&&pixInfo.pix_chave?"Editar chave Pix":"Usar outra chave Pix"}</button>
    <form id="dl-pixf" class="stack" hidden>
      <label>Tipo de chave<select id="dl-pxt"><option value="cnpj">CNPJ</option><option value="cpf">CPF</option><option value="celular">Celular</option><option value="email">E-mail</option><option value="aleatoria">Chave aleatória</option></select></label>
      <label>Chave Pix<input id="dl-pxv" maxlength="77" autocomplete="off" required></label>
      <label>Sua senha do Cadernex<input id="dl-pxs" type="password" autocomplete="current-password" required></label>
      <p class="hint" style="margin:0;font-size:12px">Use uma chave da loja ou sua, já cadastrada no app do seu banco. Por segurança, pedimos a senha, e o recebimento desliga até a nova chave ser conferida.</p>
      <div class="grid2"><button class="btn ghost" type="button" data-dlpixcan>Cancelar</button><button class="btn" type="submit">Salvar chave</button></div>
    </form>
  </div>
  <div class="card stack">
    <div><div class="eyebrow">A cara da sua loja</div><h2 style="margin:2px 0 0">Logo, capa e endereço</h2></div>
    <div class="dl-capa-ed" data-dlimg="capa" role="button" tabindex="0" aria-label="Trocar a capa">${perfil.loja_capa_v?`<img src="${esc(imgLoja(uid,"capa",perfil.loja_capa_v))}" alt="">`:`<span>${IC.foto}<b>Foto de capa</b><small>a fachada, o balcão ou seu prato mais bonito</small></span>`}
      <button class="dl-logo-ed" type="button" data-dlimg="logo" aria-label="Trocar o logo">${logoHtml(uid,perfil.loja_nome,perfil.loja_logo_v,"dl-logo")}<em>Logo</em></button></div>
    <input type="file" id="dl-file3" accept="image/*" hidden>
    <label>Endereço da loja<input id="dl-lend" maxlength="140" placeholder="Rua, número, quadra e lote" value="${esc(perfil.loja_end||"")}"></label>
    <button class="btn ghost full" type="button" data-dlend>${perfil.loja_lat!=null?"Atualizar endereço":"Salvar endereço"}</button>
    <p class="hint" style="margin:0;font-size:12px">${perfil.loja_lat!=null?"✓ Loja no mapa. O cliente já vê a taxa de entrega estimada no carrinho.":"Com o endereço, o cliente vê a taxa de entrega estimada antes de pedir."}</p>
  </div>
  <div class="card stack">
    <div><div class="eyebrow">Mande pros seus clientes</div><h2 style="margin:2px 0 0">Link da sua loja</h2></div>
    <div class="dl-link"><span>${esc(linkDa(uid))}</span></div>
    <button class="link" type="button" data-dlslug style="align-self:flex-start;padding:0;font-size:14px">${perfil.loja_slug?"Mudar o nome do link":"Usar o nome da loja no link"}</button>
    <div class="grid2"><button class="btn ghost" type="button" data-dlcopia>Copiar link</button><button class="btn" type="button" data-dlenvia>${IC.zap}Enviar</button></div>
    <p class="hint" style="margin:0;font-size:12px">Ponha na bio do Instagram e no status do WhatsApp. Quem abre cai direto no seu cardápio.</p>
  </div>
  <div class="card stack">
    <div><div class="eyebrow">Aparece pros clientes</div><h2 style="margin:2px 0 0">Adicionar produto</h2></div>
    <form id="dl-f" class="stack">
      <button class="dl-foto-in" type="button" data-dlpick><span id="dl-prev">${IC.foto}<b>Foto do produto</b><small>opcional, mas vende muito mais</small></span></button>
      <input type="file" id="dl-file" accept="image/*" hidden>
      <label>Nome<input id="dl-nome" maxlength="60" placeholder="ex.: X-Burger da casa" required></label>
      <div class="grid2"><label>Preço (R$)<input id="dl-preco" inputmode="decimal" placeholder="ex.: 25,90" required></label>
      <label>Categoria<input id="dl-cat" maxlength="30" list="dl-cats" placeholder="ex.: Lanches"></label></div>
      <datalist id="dl-cats">${cats.map(c=>`<option value="${esc(c)}"></option>`).join("")}</datalist>
      <label>Descrição<input id="dl-desc" maxlength="140" placeholder="opcional: ingredientes, tamanho…"></label>
      <button class="btn full" type="submit" id="dl-add">Adicionar ao cardápio</button>
    </form>
  </div>
  <div class="card stack">
    <div><div class="eyebrow">${meus.length} produto${meus.length===1?"":"s"}</div><h2 style="margin:2px 0 0">Seu cardápio</h2></div>
    ${meus.length?grupos(meus).map(([c,ps])=>`<div class="dl-cat-t">${esc(c)}</div>${ps.map(p=>`
      <div class="dl-p${p.ativo?"":" off"}">
        <button class="dl-th" type="button" data-dlfoto="${p.id}" aria-label="Trocar foto">${p.foto_v?`<img src="${esc(fotoUrl(uid,p))}" alt="" loading="lazy">`:IC.foto}</button>
        <div class="dl-pt"><b>${esc(p.nome)}</b><small>${esc(p.descricao||"")}</small><span class="num">${brl(Number(p.preco))}</span></div>
        <div class="dl-pa"><button class="link" type="button" data-dlcatm="${p.id}">Categoria</button><button class="link" type="button" data-dlativo="${p.id}">${p.ativo?"Pausar":"Ativar"}</button><button class="del" type="button" data-dldel="${p.id}" aria-label="Apagar">✕</button></div>
      </div>`).join("")}`).join(""):`<p class="hint" style="margin:0">Nenhum produto ainda. Adicione acima o que você vende.</p>`}
    <input type="file" id="dl-file2" accept="image/*" hidden>
  </div>`;
  const f=$("dl-f");if(f)f.onsubmit=addProd;
  $("dl-file").onchange=e=>{const x=e.target.files[0];if(!x)return;fotoNova=x;const u=URL.createObjectURL(x);$("dl-prev").innerHTML=`<img src="${u}" alt="Prévia"><small>Toque pra trocar</small>`};
}
function addProd(e){e.preventDefault();const nome=$("dl-nome").value.trim(),preco=num($("dl-preco").value);
  if(nome.length<2){toast("Coloque o nome do produto");return}
  if(!$("dl-preco").value.trim()||!(preco>0)){toast("Coloque o preço");return}
  const b=$("dl-add");b.disabled=true;
  safe(async()=>{try{
    const{data,error}=await sb.from("produtos").insert({nome,preco,categoria:$("dl-cat").value.trim()||null,descricao:$("dl-desc").value.trim()||null}).select().single();if(error)throw error;
    if(fotoNova){try{data.foto_v=await subirFoto(data.id,fotoNova)}catch(x){toast(x.cxMsg||"Produto salvo, mas a foto não subiu")}}
    meus.push(data);fotoNova=null;admRender();$("dl-nome").focus();
  }finally{b.disabled=false}},"Produto no cardápio ✓");
}
let fotoAlvo=null,imgAlvo=null;
async function salvaEnd(){
  const end=$("dl-lend").value.trim();if(end.length<5){toast("Coloque o endereço da loja");$("dl-lend").focus();return}
  safe(async()=>{toast("Achando sua loja no mapa…");
    const q=[end,perfil.loja_bairro,"Goiânia","GO"].filter(Boolean).join(", ");
    const p=window.cxGeo?await cxGeo.ponto(q):null;
    await savePerfil(p?{loja_end:end,loja_lat:p.lat,loja_lng:p.lng}:{loja_end:end,loja_lat:null,loja_lng:null});admRender();
    if(!p)toast("Endereço salvo, mas não achamos no mapa. Confira o número e o bairro.")},"Endereço salvo ✓");
}
V.addEventListener("click",e=>{
  if(e.target.closest("[data-dlpixsw]")){if(perfil.loja_pix){if(confirm("Desligar? Os clientes não vão conseguir pedir da sua loja até você ligar de novo."))pixLigar(false)}else pixLigar(true);return}
  if(e.target.closest("[data-dlpixed]")){const f=$("dl-pixf");f.hidden=!f.hidden;if(!f.hidden){$("dl-pxt").value=pixInfo&&pixInfo.pix_tipo||(pixInfo&&pixInfo.cnpj?"cnpj":"cpf");$("dl-pxv").value=pixInfo&&pixInfo.pix_chave?fmtChave(pixInfo.pix_tipo,pixInfo.pix_chave):"";pxPh();$("dl-pxv").focus()}return}
  if(e.target.closest("[data-dlpixcan]")){$("dl-pixf").hidden=true;return}
  const ps=e.target.closest("[data-pdst]");if(ps){pedStatus(ps.dataset.pdid,ps.dataset.pdst,ps);return}
  const pm=e.target.closest("[data-pdmoto]");if(pm){chamarMoto(pm.dataset.pdmoto,pm);return}
  const im=e.target.closest("[data-dlimg]");if(im&&$("dl-adm")&&$("dl-adm").contains(im)){e.stopPropagation();imgAlvo=im.dataset.dlimg;$("dl-file3").click();return}
  if(e.target.closest("[data-dlend]")){salvaEnd();return}
  if(e.target.closest("[data-dlpick]")){$("dl-file").click();return}
  const ab=e.target.closest("[data-dlab]");if(ab){const novo=!aberta();safe(async()=>{await savePerfil({loja_aberta:novo});admRender()},novo?"Loja aberta ✓":"Loja fechada");return}
  if(e.target.closest("[data-dlslug]")){const atual=perfil.loja_slug||slugDe(perfil.loja_nome);
    const n=prompt("Nome do link da loja (só letras, números e hífen):\ncadernex.com.br/?loja=",atual);if(n===null)return;
    const v=slugDe(n);if(v.length<3){toast("Use pelo menos 3 letras ou números");return}
    safe(async()=>{const r=await sb.rpc("loja_slug_definir",{desejado:v});if(r.error)throw Object.assign(r.error,{cxMsg:r.error.message});perfil.loja_slug=r.data;admRender()},"Link atualizado ✓");return}
  if(e.target.closest("[data-dlcopia]")){const l=linkDa(uid);(navigator.clipboard?navigator.clipboard.writeText(l):Promise.reject()).then(()=>toast("Link copiado ✓"),()=>prompt("Copie o link:",l));return}
  if(e.target.closest("[data-dlenvia]")){const l=linkDa(uid),t=`Peça na ${perfil.loja_nome} pelo Cadernex: veja o cardápio e faça seu pedido aqui 👉 ${l}`;
    if(navigator.share)navigator.share({title:perfil.loja_nome,text:t}).catch(()=>{});else open("https://wa.me/?text="+encodeURIComponent(t),"_blank","noopener");return}
  const fo=e.target.closest("[data-dlfoto]");if(fo){fotoAlvo=fo.dataset.dlfoto;$("dl-file2").click();return}
  const ct=e.target.closest("[data-dlcatm]");if(ct){const p=meus.find(x=>x.id===ct.dataset.dlcatm);const c=prompt("Categoria deste produto (ex.: Lanches, Bebidas). Deixe vazio pra \"Outros\":",p.categoria||"");if(c===null)return;
    const v=c.trim().slice(0,30)||null;safe(async()=>{const{error}=await sb.from("produtos").update({categoria:v}).eq("id",p.id);if(error)throw error;p.categoria=v;admRender()},"Categoria salva");return}
  const at=e.target.closest("[data-dlativo]");if(at){const p=meus.find(x=>x.id===at.dataset.dlativo);safe(async()=>{const{error}=await sb.from("produtos").update({ativo:!p.ativo}).eq("id",p.id);if(error)throw error;p.ativo=!p.ativo;admRender()});return}
  const d=e.target.closest("[data-dldel]");if(d){if(d.dataset.ok!=="1"){d.dataset.ok="1";d.textContent="Apagar?";return}
    const id=d.dataset.dldel;safe(async()=>{const{error}=await sb.from("produtos").delete().eq("id",id);if(error)throw error;sb.storage.from("produtos").remove([`${uid}/${id}.jpg`]).catch(()=>{});meus=meus.filter(x=>x.id!==id);admRender()},"Produto apagado")}
});
V.addEventListener("change",e=>{if(e.target.id!=="dl-file3")return;const x=e.target.files[0];e.target.value="";if(!x||!imgAlvo)return;const t=imgAlvo;imgAlvo=null;
  safe(async()=>{toast("Enviando a foto…");await subirImgLoja(t,x);admRender()},t==="logo"?"Logo salvo ✓":"Capa salva ✓")});
V.addEventListener("change",e=>{if(e.target.id!=="dl-file2")return;const x=e.target.files[0];e.target.value="";if(!x||!fotoAlvo)return;const id=fotoAlvo;fotoAlvo=null;
  safe(async()=>{toast("Enviando a foto…");const v=await subirFoto(id,x);const p=meus.find(y=>y.id===id);if(p)p.foto_v=v;admRender()},"Foto salva ✓")});

/* ================= CLIENTE ================= */
let lojas=null,loja=null,cardapio=[],cart={};
try{const c=JSON.parse(sessionStorage.getItem(CART_KEY)||"null");if(c&&c.loja&&c.q)cart=c}catch(e){}
const salvaCart=()=>{try{sessionStorage.setItem(CART_KEY,JSON.stringify(cart))}catch(e){}};
async function lojasLoad(){if(!sb||!uid)return;const r=await sb.rpc("lojas_publicas");lojas=r.error?[]:(r.data||[]).filter(l=>l.id!==uid);if(!loja)cliRender()}
function cliRender(){
  const w=$("dl-cli");if(!w)return;
  if(loja)return cardRender();
  if(lojas==null){w.innerHTML=`<p class="hint">Carregando as lojas…</p>`;return}
  w.innerHTML=`<div class="dl-hero"><img src="delivery-hero.jpg" alt="Motoboy do Cadernex Delivery com pizza, hambúrguer e sacolas prontas pra entrega" width="848" height="600" loading="lazy" decoding="async"><div class="dl-hero-t"><b>Bateu a fome? A gente leva.</b><span>Pizza, lanche, mercado e mais · Pix pelo app e entrega com código</span></div></div>`+meusPedHtml()+(lojas.length?`<div class="card stack"><div><div class="eyebrow">Compre de quem é daqui</div><h2 style="margin:2px 0 0">Lojas no Cadernex</h2></div>
    ${lojas.map(l=>`<button class="dl-lj" type="button" data-dlloja="${l.id}">${l.logo_v?logoHtml(l.id,l.nome,l.logo_v,"dl-lj-i dl-lj-logo"):`<span class="dl-lj-i">${IC.loja}</span>`}
      <span class="dl-lj-t"><b>${esc(l.nome)}</b><small>${esc([l.ramo,l.bairro,l.horario].filter(Boolean).join(" · "))}</small></span>
      <span class="dl-lj-s"><em class="dl-pill${l.aberta?" on":""}">${l.aberta?"Aberta":"Fechada"}</em><small>${l.produtos} produto${l.produtos==1?"":"s"}</small></span></button>`).join("")}</div>`:"");
}
async function abrirLoja(id){
  for(let i=0;i<40&&!sb;i++)await new Promise(r=>setTimeout(r,150));if(!sb)return;
  if(!UUID.test(id)){id=await idDoLink(id);if(!id){if(publico)$("dl-cli").innerHTML=`<div class="card"><p class="hint" style="margin:0">Não achamos essa loja. Confira o link com a loja.</p></div>`;else toast("Não achamos essa loja");return}}
  const v=await sb.rpc("loja_vitrine",{lid:id});let l=!v.error&&v.data&&v.data[0];
  if(!l&&uid){if(!lojas)await lojasLoad();l=(lojas||[]).find(x=>x.id===id)}
  if(!l){if(publico)$("dl-cli").innerHTML=`<div class="card"><p class="hint" style="margin:0">Essa loja não está disponível agora.</p></div>`;else toast("Essa loja não está disponível agora");return}
  loja=l;cardapio=null;if(cart.loja!==id)cart={loja:id,q:{}};cardRender();
  if(publico)document.title=`${l.nome} · Cadernex Delivery`;
  const r=await sb.rpc("cardapio_publico",{lid:id});
  cardapio=r.error?[]:r.data;Object.keys(cart.q).forEach(k=>{if(!cardapio.some(p=>p.id===k))delete cart.q[k]});cardRender();scrollTo(0,0);
  let ck=false;try{ck=sessionStorage.getItem("cx-dl-ck")==="1";if(ck)sessionStorage.removeItem("cx-dl-ck")}catch(e){}
  if(ck&&uid&&itens().length)setTimeout(ckRender,200);
}
const itens=()=>Object.entries(cart.q).filter(([,n])=>n>0).map(([id,n])=>({p:(cardapio||[]).find(x=>x.id===id),n})).filter(x=>x.p);
const total=()=>itens().reduce((s,x)=>s+x.n*Number(x.p.preco),0);
function cardRender(){if(!loja)return;
  const w=$("dl-cli"),l=loja,pode=l.aberta&&!!l.pix;
  const gs=cardapio?grupos(cardapio):[];
  w.innerHTML=`${publico?"":`<button class="link dl-volta" type="button" data-dlvolta>← Todas as lojas</button>`}
  <div class="card stack dl-head">${l.capa_v?`<div class="dl-capa"><img src="${esc(imgLoja(l.id,"capa",l.capa_v))}" alt=""></div>`:""}<div class="row" style="align-items:center;gap:10px">${logoHtml(l.id,l.nome,l.logo_v,"dl-logo dl-logo-h")}<div style="flex:1;min-width:0"><div class="eyebrow">${esc([l.ramo,l.bairro].filter(Boolean).join(" · ")||"Delivery")}</div><h2 style="margin:2px 0 0">${esc(l.nome)}</h2></div><span class="dl-pill${l.aberta?" on":""}">${l.aberta?"Aberta":"Fechada"}</span></div>
    ${l.horario?`<small class="hint" style="margin:0">Horário: ${esc(l.horario)}</small>`:""}
    ${!l.aberta?`<p class="dl-aviso">A loja está fechada agora. Você pode olhar o cardápio, e o pedido libera quando ela abrir.</p>`:!l.pix?`<p class="dl-aviso">Essa loja ainda está preparando os pedidos pelo app. Você pode olhar o cardápio, e o pedido libera em breve.</p>`:""}
  </div>
  ${gs.length>1?`<div class="dl-chips">${gs.map(([c],i)=>`<button type="button" class="chip" data-dlir="${i}">${esc(c)}</button>`).join("")}</div>`:""}
  ${cardapio==null?`<p class="hint">Carregando o cardápio…</p>`:!cardapio.length?`<p class="hint">Essa loja ainda não colocou produtos.</p>`:gs.map(([c,ps],i)=>`<div class="dl-sec" id="dl-sec-${i}"><div class="dl-cat-t">${esc(c)}</div>${ps.map(p=>{const n=cart.q[p.id]||0;return`
    <div class="dl-item">${p.foto_v?`<img class="dl-img" src="${esc(fotoUrl(l.id,p))}" alt="" loading="lazy">`:""}
      <div class="dl-pt"><b>${esc(p.nome)}</b><small>${esc(p.descricao||"")}</small><span class="num">${brl(Number(p.preco))}</span></div>
      ${pode?`<div class="dl-qt">${n?`<button type="button" data-dlmenos="${p.id}" aria-label="Tirar um">−</button><b>${n}</b>`:""}<button type="button" data-dlmais="${p.id}" aria-label="Adicionar">+</button></div>`:""}
    </div>`}).join("")}</div>`).join("")}
  ${pode&&itens().length?`<div class="dl-bar"><button class="btn full" type="button" data-dlck>Ver pedido · ${itens().reduce((s,x)=>s+x.n,0)} ${itens().reduce((s,x)=>s+x.n,0)===1?"item":"itens"} · ${brl(total())}</button></div>`:""}
  <div id="dl-ck"></div>`;
}
/* cliente do lojista sem conta: cadastro rápido (cria a conta Cadernex) antes de pedir */
const PEND="cx-dados-pend";
const soN=v=>String(v||"").replace(/\D/g,"");
function cpfOk(c){c=soN(c);if(c.length!==11||/^(\d)\1{10}$/.test(c))return false;let s=0;for(let i=0;i<9;i++)s+=+c[i]*(10-i);let d1=(s*10)%11;if(d1===10)d1=0;
  s=0;for(let i=0;i<10;i++)s+=+c[i]*(11-i);let d2=(s*10)%11;if(d2===10)d2=0;return d1===+c[9]&&d2===+c[10]}
function idadeDe(d){const n=new Date(d+"T12:00"),h=new Date();let a=h.getFullYear()-n.getFullYear();const m=h.getMonth()-n.getMonth();if(m<0||(m===0&&h.getDate()<n.getDate()))a--;return a}
function cadRender(w){
  w.innerHTML=`<div class="card stack dl-cad"><div><div class="eyebrow">Falta pouco</div><h2 style="margin:2px 0 0">Crie sua conta pra pedir</h2></div>
    <p class="hint" style="margin:0">É rápido e é uma vez só. Na próxima, você entra direto com e-mail e senha.</p>
    <form id="dl-cadf" class="stack" novalidate>
      <label>Nome completo<input id="dc-nome" autocomplete="name" maxlength="80" required></label>
      <div class="grid2"><label>Nascimento<input id="dc-nasc" type="date" required></label><label>CPF<input id="dc-cpf" inputmode="numeric" placeholder="000.000.000-00" required></label></div>
      <label>Celular (WhatsApp)<input id="dc-cel" inputmode="tel" autocomplete="tel" placeholder="(62) 99999-9999" required></label>
      <label>Endereço de entrega<input id="dc-end" maxlength="140" autocomplete="street-address" placeholder="Rua, número, quadra, lote" required></label>
      <label>Bairro<input id="dc-bairro" maxlength="40" required></label>
      <label>E-mail<input id="dc-email" type="email" autocomplete="email" required></label>
      <label>Crie uma senha<input id="dc-senha" type="password" autocomplete="new-password" minlength="6" placeholder="mínimo 6 caracteres" required></label>
      <label class="dl-ok"><input type="checkbox" id="dc-ok"> <span>Li e aceito a <a href="privacidade.html" target="_blank" rel="noopener">Política de Privacidade</a>. O CPF e o nascimento servem pra identificar você e dar segurança às entregas. Não são mostrados à loja.</span></label>
      <p class="hint" id="dc-msg" role="alert" style="margin:0;color:var(--bad,#d93a3f)"></p>
      <button class="btn full" type="submit" id="dc-btn">Criar conta e continuar</button>
    </form>
    <p class="hint" style="margin:0;text-align:center">Já tem conta? <button class="link" type="button" data-vtentrar>Entrar</button></p></div>`;
  $("dc-cpf").addEventListener("input",e=>{const v=soN(e.target.value).slice(0,11);e.target.value=v.replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d{1,2})$/,"$1-$2")});
  $("dc-cel").addEventListener("input",e=>{const v=soN(e.target.value).slice(0,11);e.target.value=v.length>2?`(${v.slice(0,2)}) ${v.slice(2,v.length>10?7:6)}${v.length>(v.length>10?7:6)?"-"+v.slice(v.length>10?7:6):""}`:v});
  $("dl-cadf").onsubmit=criarConta;
  w.scrollIntoView({behavior:"smooth",block:"start"});
}
async function gravaDados(d){ // grava os dados pessoais e o endereço na conta já logada
  const r=await sb.from("dados_pessoais").insert({nome_completo:d.nome,celular:d.cel,nascimento:d.nasc,cpf:d.cpf,nacionalidade:"Brasileira"});
  if(r.error&&!/duplicate|já/i.test(r.error.message||""))throw r.error;
  const{data:{user}}=await sb.auth.getUser();
  if(user)await sb.from("perfis").update({end_padrao:[d.end,d.bairro].filter(Boolean).join(" — "),telefone:d.cel}).eq("user_id",user.id);
  try{localStorage.removeItem(PEND);sessionStorage.removeItem("cadernex_dados_depois")}catch(e){}
}
async function criarConta(e){
  e.preventDefault();const msg=$("dc-msg");msg.textContent="";
  const d={nome:$("dc-nome").value.trim().replace(/\s+/g," "),nasc:$("dc-nasc").value,cpf:soN($("dc-cpf").value),cel:soN($("dc-cel").value),
    end:$("dc-end").value.trim(),bairro:$("dc-bairro").value.trim(),email:$("dc-email").value.trim()};const senha=$("dc-senha").value;
  const erro=(t,id)=>{msg.textContent=t;if(id)$(id).focus()};
  if(d.nome.split(" ").length<2)return erro("Escreva o nome completo, com sobrenome.","dc-nome");
  if(!d.nasc)return erro("Coloque a data de nascimento.","dc-nasc");
  if(idadeDe(d.nasc)<18)return erro("É preciso ter 18 anos ou mais pra pedir pelo Cadernex.","dc-nasc");
  if(!cpfOk(d.cpf))return erro("CPF inválido. Confira os números.","dc-cpf");
  if(d.cel.length<10)return erro("Celular com DDD. Ex.: (62) 99999-9999.","dc-cel");
  if(d.end.length<5)return erro("Coloque o endereço de entrega.","dc-end");
  if(d.bairro.length<2)return erro("Coloque o bairro.","dc-bairro");
  if(!/^\S+@\S+\.\S+$/.test(d.email))return erro("E-mail inválido.","dc-email");
  if(senha.length<6)return erro("A senha precisa ter pelo menos 6 caracteres.","dc-senha");
  if(!$("dc-ok").checked)return erro("Pra continuar, aceite a Política de Privacidade.");
  const b=$("dc-btn");b.disabled=true;b.textContent="Criando sua conta…";
  try{
    try{sessionStorage.setItem("cadernex_dados_depois","1");localStorage.setItem(PEND,JSON.stringify({...d,email:d.email.toLowerCase()}))}catch(x){}
    const{data,error}=await sb.auth.signUp({email:d.email,password:senha,options:{data:{nome:d.nome.split(" ")[0],tipo:"cliente"}}});
    if(error)throw error;
    if(!data.session){b.textContent="Criar conta e continuar";b.disabled=false;
      $("dl-ck").innerHTML=`<div class="card stack"><h2 style="margin:0">Confirme seu e-mail ✉️</h2><p class="hint" style="margin:0">Mandamos um link para <b>${esc(d.email)}</b>. Abra o e-mail, toque no link e você volta direto pra loja, já com a conta pronta.</p></div>`;return}
    await gravaDados(d);try{sessionStorage.setItem("cx-dl-ck","1")}catch(x){}toast("Conta criada ✓ Agora é só confirmar o pedido.");
  }catch(err){b.disabled=false;b.textContent="Criar conta e continuar";const m=String(err.message||"");
    msg.textContent=/already registered|already been registered/i.test(m)?"Esse e-mail já tem conta. Toque em Entrar, logo abaixo.":/CPF/i.test(m)?m:/rate limit|too many/i.test(m)?"Muitos cadastros agora. Espere alguns minutos e tente de novo.":/Password|weak/i.test(m)?"Senha fraca. Use pelo menos 6 caracteres.":"Não deu pra criar a conta agora. Confira a internet e tente de novo."}
}
async function dadosPendentes(){ // quem confirmou o e-mail depois: grava os dados guardados
  let d=null;try{d=JSON.parse(localStorage.getItem(PEND)||"null")}catch(e){}if(!d||!uid)return;
  const{data:{user}}=await sb.auth.getUser();if(!user||String(user.email||"").toLowerCase()!==d.email){try{localStorage.removeItem(PEND)}catch(e){}return}
  try{await gravaDados(d);if(typeof dadosCheck==="function")await dadosCheck();if($("s-dados")&&!$("s-dados").hidden)show("app");try{sessionStorage.setItem("cx-dl-ck","1")}catch(e){}}catch(e){}
}
function ckRender(){
  const w=$("dl-ck");if(!w)return;const its=itens();if(!its.length){w.innerHTML="";return}
  if(!uid)return cadRender(w);
  w.innerHTML=`<div class="card stack dl-ckc"><div><div class="eyebrow">Seu pedido</div><h2 style="margin:2px 0 0">${esc(loja.nome)}</h2></div>
    ${its.map(x=>`<div class="row"><span>${x.n}× ${esc(x.p.nome)}</span><b class="num">${brl(x.n*Number(x.p.preco))}</b></div>`).join("")}
    <div class="row" style="border-top:1px solid var(--line);padding-top:8px"><b>Produtos</b><b class="num">${brl(total())}</b></div>
    <div class="row" id="dl-fr-r"><span>Entrega</span><b class="num" id="dl-fr">${loja.lat!=null?"coloque o endereço":"a loja informa"}</b></div>
    ${loja.pix?`<div class="row" id="dl-sv-r"><span>Taxa de serviço (10%)</span><b class="num">${brl(servicoDe())}</b></div>`:""}
    <div class="row dl-tot" id="dl-tot-r" hidden><b>Total estimado</b><b class="num" id="dl-tot"></b></div>
    <p class="hint" style="margin:0;font-size:12px" id="dl-fr-h">${loja.lat!=null?"A entrega é estimada pela distância. A loja confirma o valor no WhatsApp.":"A taxa de entrega a loja te informa no WhatsApp, junto com a confirmação."}</p>
    <label>CEP<input id="dl-cep" inputmode="numeric" autocomplete="postal-code" maxlength="9" placeholder="00000-000"></label>
    <p class="hint" style="margin:-4px 0 0;font-size:12px" id="dl-cep-h">Coloque o CEP: o app acha a rua e calcula a entrega.</p>
    <label>Endereço de entrega<input id="dl-end" maxlength="140" placeholder="Rua, número, quadra, lote, referência" value="${esc(perfil.end_padrao||"")}"></label>
    <label>Bairro<input id="dl-bairro" maxlength="40"></label>
    <input type="hidden" id="dl-pag" value="app"><p class="hint dl-so-pix" style="margin:0">💳 Pagamento: <b>Pix pelo app</b>, na hora. O dinheiro vai direto pra loja.</p>
    <label>Observação<input id="dl-obs" maxlength="140" placeholder="opcional: referência, cor, tamanho, detalhes…"></label>
    <button class="btn full" type="button" data-dlenviar id="dl-env-b">${IC.zap}Enviar pedido no WhatsApp da loja</button>
    <p class="hint" style="margin:0;font-size:12px" id="dl-env-h">A loja confirma o pedido e chama o motoboy do Cadernex pra levar até você.</p>
    <div id="dl-pix"></div></div>`;
  const modo=()=>{const app=true;
    if($("dl-sv-r"))$("dl-sv-r").hidden=!app;
    if($("dl-fr-h")&&loja.lat!=null)$("dl-fr-h").textContent=app?"A entrega já vai junto no Pix e fica com a loja, que chama o motoboy.":"A entrega é estimada pela distância. A loja confirma o valor no WhatsApp.";
    $("dl-env-b").innerHTML=app?"Pagar com Pix":`${IC.zap}Enviar pedido no WhatsApp da loja`;
    $("dl-env-h").textContent=app?"Você paga agora pelo app. O dinheiro vai direto pra loja, que já recebe o pedido pago.":"A loja confirma o pedido e chama o motoboy do Cadernex pra levar até você.";totAtual()};
  modo();
  frete=null;let t=null;const calc=()=>{clearTimeout(t);t=setTimeout(calcFrete,700)};
  $("dl-end").addEventListener("input",calc);$("dl-bairro").addEventListener("input",calc);
  cepInfo=null;$("dl-cep").addEventListener("input",e=>{const v=so(e.target.value).slice(0,8);e.target.value=v.length>5?v.slice(0,5)+"-"+v.slice(5):v;
    if(v.length===8)buscaCep(v);else if(cepInfo){cepInfo=null;calc()}});
  if(String(perfil.end_padrao||"").length>=5)calc();
  w.scrollIntoView({behavior:"smooth",block:"start"});
}
let frete=null,freteN=0,cepInfo=null;
/* CEP: acha a rua e o bairro (ViaCEP) e o ponto no mapa do CEP, igual ao pedido de entrega */
const prazo=(url,ms=7000)=>{const ac=new AbortController(),t=setTimeout(()=>ac.abort(),ms);return fetch(url,{signal:ac.signal}).finally(()=>clearTimeout(t))};
const cepPts={};
async function cepPonto(cep){
  if(cepPts[cep]!==undefined)return cepPts[cep];let p=null;
  try{const d=await (await prazo(`https://cep.awesomeapi.com.br/json/${cep}`)).json();if(d&&d.lat&&d.lng&&Math.abs(+d.lat)>0.1)p={lat:+d.lat,lng:+d.lng}}catch(e){}
  if(!p){try{const d=await (await prazo(`https://brasilapi.com.br/api/cep/v2/${cep}`)).json();const c=d&&d.location&&d.location.coordinates;if(c&&c.latitude&&c.longitude)p={lat:+c.latitude,lng:+c.longitude}}catch(e){}}
  return cepPts[cep]=p;
}
async function buscaCep(cep){
  const h=$("dl-cep-h");if(h)h.textContent="Buscando o CEP…";
  try{const r=await prazo(`https://viacep.com.br/ws/${cep}/json/`),d=await r.json();
    if(!r.ok||d.erro){if(h)h.textContent="CEP não encontrado. Confira ou escreva o endereço.";return}
    cepInfo={...d,cep};const end=$("dl-end"),bai=$("dl-bairro");
    if(d.logradouro){end.value=d.logradouro+", ";end.focus();end.setSelectionRange(end.value.length,end.value.length)}
    if(d.bairro)bai.value=d.bairro;
    if(h)h.textContent=`${d.localidade} - ${d.uf}. ${d.logradouro?"Complete com o número, quadra e lote.":"CEP da cidade toda: escreva a rua e o número."}`;
    calcFrete();
  }catch(e){if(h)h.textContent="Não deu pra buscar o CEP agora. Escreva o endereço."}
}
const servicoDe=()=>Math.round(total()*10)/100;
function totAtual(){const r=$("dl-tot-r");if(!r)return;const app=true;
  if(!frete&&!app){r.hidden=true;return}
  $("dl-tot").textContent=brl(total()+(frete?frete.v:0)+(app?servicoDe():0));r.hidden=false}
async function calcFrete(){
  if(!loja||loja.lat==null||!$("dl-fr"))return;
  const end=$("dl-end").value.trim(),bairro=$("dl-bairro").value.trim(),n=++freteN;frete=null;
  if(end.length<5){$("dl-fr").textContent="coloque o endereço";$("dl-tot-r").hidden=true;return}
  $("dl-fr").textContent="calculando…";
  const cid=cepInfo?[cepInfo.localidade,cepInfo.uf]:["Goiânia","GO"];
  const pc=cepInfo?await cepPonto(cepInfo.cep):null;if(n!==freteN)return;
  let pt=window.cxGeo?await cxGeo.ponto([end.replace(/,\s*$/,""),bairro,...cid].filter(Boolean).join(", ")).catch(()=>null):null;if(n!==freteN)return;
  // o nome da rua caiu longe do CEP (mais de 1 km)? confia no CEP
  if(pc&&(!pt||Math.hypot((pt.lat-pc.lat)*111,(pt.lng-pc.lng)*107)>1))pt=pc;
  if(!pt){$("dl-fr").textContent="a loja informa";$("dl-tot-r").hidden=true;return}
  const a={lat:loja.lat,lng:loja.lng};let m=window.cxGeo?await cxGeo.rotaMetros(a,pt):null;if(n!==freteN)return;
  if(!m){const R=6371e3,r=x=>x*Math.PI/180,dl=r(pt.lat-a.lat),dn=r(pt.lng-a.lng),h=Math.sin(dl/2)**2+Math.cos(r(a.lat))*Math.cos(r(pt.lat))*Math.sin(dn/2)**2;m=2*R*Math.asin(Math.sqrt(h))*1.3}
  const k=Math.round(m/100)/10;
  if(k>40){$("dl-fr").textContent="fora da área: a loja informa";$("dl-tot-r").hidden=true;return}
  frete={v:freteDe(k),km:k};
  $("dl-fr").textContent=`${brl(frete.v)} · ${String(k).replace(".",",")} km`;totAtual();
}
function enviar(){
  const end=$("dl-end").value.trim(),bairro=$("dl-bairro").value.trim(),obs=$("dl-obs").value.trim();
  if(end.length<5){toast("Coloque o endereço de entrega");$("dl-end").focus();return}
  if(bairro.length<2){toast("Coloque o bairro");$("dl-bairro").focus();return}
  if(!loja.pix){toast("Essa loja ainda não recebe pedidos pelo app");return}
  const cep=cepInfo&&!/CEP/i.test(end)?` — CEP ${cepInfo.cep.slice(0,5)}-${cepInfo.cep.slice(5)}`:"";
  return pagarApp(end+cep,bairro,obs);
}
document.addEventListener("click",e=>{
  if(e.target.closest("#pc-tenho-loja2")){window.cxNavUser=Date.now();go("perfilc");const b=$("pc-tenho-loja");if(b)setTimeout(()=>b.click(),50);return}
  if(!e.target.closest("#dl-cli"))return;
  const lj=e.target.closest("[data-dlloja]");if(lj){abrirLoja(lj.dataset.dlloja);return}
  if(e.target.closest("[data-dlvolta]")){loja=null;cliRender();scrollTo(0,0);return}
  const ir=e.target.closest("[data-dlir]");if(ir){$("dl-sec-"+ir.dataset.dlir)?.scrollIntoView({behavior:"smooth",block:"start"});return}
  const ma=e.target.closest("[data-dlmais]");if(ma){cart.q[ma.dataset.dlmais]=(cart.q[ma.dataset.dlmais]||0)+1;salvaCart();const y=scrollY;cardRender();scrollTo(0,y);return}
  const me=e.target.closest("[data-dlmenos]");if(me){const k=me.dataset.dlmenos;cart.q[k]=Math.max(0,(cart.q[k]||0)-1);if(!cart.q[k])delete cart.q[k];salvaCart();const y=scrollY;cardRender();scrollTo(0,y);return}
  if(e.target.closest("[data-dlck]")){ckRender();return}
  if(e.target.closest("[data-dlenviar]")){enviar();return}
});

/* ---------- pedido pago pelo app (Pix na Woovi): dinheiro vai direto pra loja ---------- */
let pedCanal=null;
async function pagarApp(end,bairro,obs){
  if(window.cxFotoGarante&&!(await cxFotoGarante()))return;
  const b=$("dl-env-b");b.disabled=true;const t=b.innerHTML;b.textContent="Gerando o Pix…";
  const{data,error}=await sb.functions.invoke("woovi-pedido",{body:{loja_id:loja.id,itens:itens().map(x=>({id:x.p.id,n:x.n})),endereco:end,bairro,obs,entrega:frete?frete.v:0}});
  b.disabled=false;b.innerHTML=t;
  if(error||!data||!data.brcode){let m=data&&data.erro;if(!m)try{const j=await error.context.json();m=j&&j.erro}catch(x){}toast(m||"Não deu pra gerar o Pix agora. Tente de novo.");return}
  if(uid&&!perfil.end_padrao)savePerfil({end_padrao:end}).catch(()=>{});
  pixMostra(data);esperaPago(data.id);
}
function pixMostra(d){
  const w=$("dl-pix");if(!w)return;$("dl-env-b").hidden=true;$("dl-env-h").hidden=true;
  const qr=/^https:\/\//.test(d.qrcode||"")?`<img src="${esc(d.qrcode)}" alt="QR Code do Pix" width="220" height="220" style="display:block;margin:4px auto;background:#fff;border-radius:10px">`:"";
  w.innerHTML=`<div class="dl-pixbox"><b>Pague ${brl(Number(d.total))} no Pix</b>${qr}
    <button class="btn full" type="button" id="dl-pix-cp">Copiar Pix copia e cola</button>
    <p class="hint" style="margin:0;text-align:center" id="dl-pix-st">Aguardando o pagamento… Vale 30 minutos.</p></div>`;
  $("dl-pix-cp").onclick=()=>{(navigator.clipboard?navigator.clipboard.writeText(d.brcode):Promise.reject()).then(()=>toast("Pix copiado ✓ Cole no app do seu banco."),()=>prompt("Copie o código do Pix:",d.brcode))};
  w.scrollIntoView({behavior:"smooth",block:"center"});
}
function esperaPago(id){
  if(pedCanal){try{sb.removeChannel(pedCanal)}catch(e){}pedCanal=null}
  let fim=false;const ok=()=>{if(fim)return;fim=true;if(pedCanal){try{sb.removeChannel(pedCanal)}catch(e){}pedCanal=null}
    cart={loja:loja.id,q:{}};salvaCart();
    const w=$("dl-pix");if(w)w.innerHTML=`<div class="dl-pixbox ok"><b>✓ Pago! Seu pedido foi pra loja.</b><p class="hint" style="margin:0">Acompanhe aqui no Delivery, em "Seus pedidos". A loja prepara e chama o motoboy.</p></div>`;
    toast("Pagamento confirmado ✓");setTimeout(()=>{if(loja){cardRender();meusPedLoad()}},2500)};
  try{pedCanal=sb.channel("ped-"+id).on("postgres_changes",{event:"UPDATE",schema:"public",table:"pedidos_loja",filter:`id=eq.${id}`},m=>{if(m.new&&m.new.status==="pago")ok()}).subscribe()}catch(e){}
  let n=0;const tick=async()=>{if(fim||++n>200)return;const r=await sb.from("pedidos_loja").select("status").eq("id",id).maybeSingle();
    if(r.data&&r.data.status==="pago")return ok();if(r.data&&r.data.status==="expirado"){const s=$("dl-pix-st");if(s)s.textContent="O Pix venceu. Faça o pedido de novo.";return}setTimeout(tick,6000)};setTimeout(tick,6000);
}
/* cliente: seus pedidos do delivery */
let meusPed=[];
const ST={aguardando:"Aguardando pagamento",pago:"Pago · a loja vai aceitar",aceito:"A loja está preparando",saiu:"Saiu pra entrega 🛵",entregue:"Entregue ✓",cancelado:"Cancelado",expirado:"Pix vencido"};
async function meusPedLoad(){if(!sb||!uid)return;const r=await sb.from("pedidos_loja").select("id,loja_id,itens,total,status,criado_em").eq("cliente_id",uid).in("status",["pago","aceito","saiu","entregue"]).order("criado_em",{ascending:false}).limit(5);
  meusPed=r.error?[]:r.data||[];if(!loja)cliRender()}
function meusPedHtml(){if(!meusPed.length)return"";const nome=id=>((lojas||[]).find(l=>l.id===id)||{}).nome||"Loja";
  return`<div class="card stack"><div><div class="eyebrow">Pagos pelo app</div><h2 style="margin:2px 0 0">Seus pedidos</h2></div>${meusPed.map(p=>`<div class="dl-ped"><div class="row"><b>${esc(nome(p.loja_id))}</b><span class="dl-pill${["saiu","entregue"].includes(p.status)?" on":""}">${esc(ST[p.status]||p.status)}</span></div><small class="hint">${(p.itens||[]).map(i=>`${i.n}× ${esc(i.nome)}`).join(", ")} · ${brl(Number(p.total))}</small></div>`).join("")}</div>`}

/* lojista: receber pelo app + pedidos */
/* ---------- chave Pix da loja ---------- */
let pixInfo=null;
async function pixLoad(){if(!sb||!uid)return;const r=await sb.from("dados_pessoais").select("cpf,cnpj,pix_tipo,pix_chave").eq("user_id",uid).maybeSingle();
  if(r.error&&/pix_/.test(r.error.message||"")){const r2=await sb.from("dados_pessoais").select("cpf,cnpj").eq("user_id",uid).maybeSingle();pixInfo=r2.data||{}}else pixInfo=r.data||{};
  const k=$("dl-pixk");if(k)k.textContent=chaveTxt()}
const TIPOS={cpf:"CPF",cnpj:"CNPJ",celular:"Celular",email:"E-mail",aleatoria:"Aleatória"};
function fmtChave(t,v){v=String(v||"");
  if(t==="cpf")return v.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/,"$1.$2.$3-$4");
  if(t==="cnpj")return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,"$1.$2.$3/$4-$5");
  if(t==="celular")return v.replace(/^\+55(\d{2})(\d{4,5})(\d{4})$/,"($1) $2-$3");return v}
function chaveTxt(){const p=pixInfo;if(!p)return"carregando…";
  if(p.pix_chave){const t=p.pix_tipo,v=p.pix_chave;
    return TIPOS[t]+" "+(t==="cpf"?"***."+v.slice(3,6)+"."+v.slice(6,9)+"-**":t==="celular"?fmtChave(t,v).replace(/\d{4}-/,"****-"):t==="email"?v.replace(/^(.{2}).*(@.*)$/,"$1***$2"):t==="aleatoria"?v.slice(0,8)+"…":fmtChave(t,v))}
  const cn=so(p.cnpj),cp=so(p.cpf);
  if(cn.length===14)return"CNPJ "+fmtChave("cnpj",cn)+" (do cadastro)";
  if(cp.length===11)return"CPF ***."+cp.slice(3,6)+"."+cp.slice(6,9)+"-** (do cadastro)";
  return"Nenhuma: complete o cadastro ou cadastre uma chave"}
const PH={cnpj:"00.000.000/0000-00",cpf:"000.000.000-00",celular:"(62) 90000-0000",email:"loja@email.com",aleatoria:"xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"};
function pxPh(){const t=$("dl-pxt").value,i=$("dl-pxv");i.placeholder=PH[t];i.inputMode=t==="email"||t==="aleatoria"?"text":"numeric";i.type=t==="email"?"email":"text"}
function normChave(t,v){v=String(v||"").trim();
  if(t==="cpf"){v=so(v);return v.length===11?v:null}
  if(t==="cnpj"){v=so(v);return v.length===14?v:null}
  if(t==="celular"){v=so(v).replace(/^55(?=\d{10,11}$)/,"");return/^\d{10,11}$/.test(v)?"+55"+v:null}
  if(t==="email"){v=v.toLowerCase();return/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)&&v.length<=77?v:null}
  if(t==="aleatoria"){v=v.toLowerCase();return/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v)?v:null}
  return null}
document.addEventListener("change",e=>{if(e.target.id==="dl-pxt")pxPh()});
document.addEventListener("submit",async e=>{if(e.target.id!=="dl-pixf")return;e.preventDefault();
  const t=$("dl-pxt").value,v=normChave(t,$("dl-pxv").value),senha=$("dl-pxs").value,b=e.target.querySelector("[type=submit]");
  if(!v){toast("Essa chave não parece um "+TIPOS[t]+" válido. Confira.");$("dl-pxv").focus();return}
  if(senha.length<6){toast("Digite sua senha do Cadernex");$("dl-pxs").focus();return}
  b.disabled=true;b.textContent="Conferindo…";
  try{const{data:{user}}=await sb.auth.getUser();
    const a=await sb.auth.signInWithPassword({email:user.email,password:senha});if(a.error){toast("Senha errada.");$("dl-pxs").value="";$("dl-pxs").focus();return}
    const{error}=await sb.rpc("pix_chave_definir",{tipo:t,chave:v});if(error)throw error;
    perfil.loja_pix=false;await pixLoad();admRender();toast("Chave salva. Agora ligue o recebimento pra conferir a chave.")}
  catch(err){console.error(err);toast(/pix_chave_definir/.test(String(err&&err.message))?"Falta atualizar o banco de dados (pix-chave.sql).":"Não salvou. Confira a internet e tente de novo.")}
  finally{b.disabled=false;b.textContent="Salvar chave"}});
async function pixLigar(on){
  if(on&&window.cxFotoGarante&&!(await cxFotoGarante())){admRender();return}
  if(on){if(!pixInfo)await pixLoad();
    if(!pixInfo||!(pixInfo.pix_chave||pixInfo.cnpj||pixInfo.cpf)){toast("Complete seu cadastro com CPF ou CNPJ, ou cadastre uma chave Pix");if(typeof abrirDados==="function")abrirDados();return}
    const sw=document.querySelector("[data-dlpixsw]");if(sw)sw.classList.add("busy");toast("Conferindo sua chave Pix…");
    const{data,error}=await sb.functions.invoke("woovi-pedido",{body:{teste:true}});
    if(sw)sw.classList.remove("busy");
    if(error||!data||!data.ok){let m=data&&data.erro;if(!m&&error){try{m=(await error.context.json()).erro}catch(x){}}
      toast(m||"Não deu pra conferir a chave agora. Tente de novo.");return}}
  safe(async()=>{await savePerfil({loja_pix:on});admRender()},on?"Pronto! Chave conferida, sua loja recebe pelo app ✓":"Desligado: os clientes não conseguem pedir até você ligar de novo");
}
let pedLoja=[],pedLojaCanal=null;
async function pedLojaLoad(){if(!sb||!uid||!ehLoja())return;
  if(!pixInfo)pixLoad();
  const r=await sb.from("pedidos_loja").select("*").eq("loja_id",uid).in("status",["pago","aceito","saiu","entregue"]).order("criado_em",{ascending:false}).limit(30);
  pedLoja=r.error?[]:r.data||[];admRender();
  if(!pedLojaCanal){try{pedLojaCanal=sb.channel("pl-"+uid).on("postgres_changes",{event:"*",schema:"public",table:"pedidos_loja",filter:`loja_id=eq.${uid}`},m=>{
    if(m.new&&m.new.status==="pago"&&(!m.old||m.old.status!=="pago"))toast("🛍️ Novo pedido pago!");pedLojaLoad()}).subscribe()}catch(e){}}
}
function pedLojaHtml(){
  if(!perfil.loja_pix)return"";
  const ativos=pedLoja.filter(p=>p.status!=="entregue"),feitos=pedLoja.filter(p=>p.status==="entregue").slice(0,5);
  const um=p=>{const w=so(p.cliente_whats);return`<div class="dl-ped"><div class="row"><b>${new Date(p.criado_em).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})} · ${esc(p.cliente_nome||"Cliente")}</b><span class="dl-pill${p.status==="pago"?"":" on"}">${esc(ST[p.status]||p.status)}</span></div>
    <div>${(p.itens||[]).map(i=>`${i.n}× ${esc(i.nome)}`).join("<br>")}</div>
    <small class="hint">Entregar em: ${esc(p.endereco)}${p.bairro?" — "+esc(p.bairro):""}${p.obs?` · Obs.: ${esc(p.obs)}`:""}</small>
    <small class="hint">Produtos ${brl(Number(p.subtotal))} − 12% Cadernex + entrega ${brl(Number(p.entrega))} = <b>você recebe ${brl(Number(p.repasse))}</b>${["enviado","manual"].includes(p.repasse_status)?" · no seu Pix ✓":p.repasse_status==="erro"?" · em conferência":""}</small>
    ${w?`<a class="link" href="https://wa.me/55${w}" target="_blank" rel="noopener">WhatsApp do cliente</a>`:""}
    ${p.status==="pago"?`<button class="btn full" type="button" data-pdid="${p.id}" data-pdst="aceito">Aceitar pedido</button>`:p.status==="aceito"?(p.corrida_id?`<div class="dl-moto">🛵 Motoboy chamado · ${esc(motoSt(p.corrida_id))}<br><small class="hint">Quando ele coletar, o cliente é avisado que saiu pra entrega. Pague a corrida em Pedidos quando ele aceitar.</small></div><button class="btn ghost full" type="button" data-pdid="${p.id}" data-pdst="saiu">Saiu pra entrega (sem o app)</button>`:`<button class="btn full" type="button" data-pdmoto="${p.id}">🛵 Chamar motoboy do Cadernex</button><button class="btn ghost full" type="button" data-pdid="${p.id}" data-pdst="saiu">Saiu pra entrega (motoboy próprio)</button>`):p.status==="saiu"?`<button class="btn full" type="button" data-pdid="${p.id}" data-pdst="entregue">Marcar entregue</button>`:""}</div>`};
  return`<div class="card stack"><div><div class="eyebrow">Pagos pelo app</div><h2 style="margin:2px 0 0">Pedidos da loja</h2></div>
    ${ativos.length?ativos.map(um).join(""):`<p class="hint" style="margin:0">Nenhum pedido em andamento. Quando um cliente pagar, ele aparece aqui na hora.</p>`}
    ${feitos.length?`<details><summary class="hint">Entregues (${feitos.length})</summary>${feitos.map(um).join("")}</details>`:""}</div>`;
}
/* chamar motoboy: a corrida já sai pronta com a coleta na loja e a entrega no endereço do pedido */
function motoSt(cid){const c=(typeof minhas!=="undefined"&&Array.isArray(minhas)?minhas:[]).find(x=>x.id===cid);
  return!c?"procurando":c.status==="aberta"?"procurando motoboy":c.status==="aceita"?"a caminho da loja":c.status==="coletada"?"levando até o cliente":c.status==="entregue"?"entregue ✓":c.status==="cancelada"?"cancelada":"procurando"}
async function chamarMoto(pid,b){
  const p=pedLoja.find(x=>x.id===pid);if(!p||p.corrida_id)return;
  if(!String(perfil.loja_end||"").trim()){toast("Coloque o endereço da loja primeiro (em Logo, capa e endereço)");return}
  const sug=Math.max(8,Number(p.entrega)||0);
  const v=prompt(`Valor da corrida pro motoboy (mínimo R$ 8). O cliente pagou ${brl(Number(p.entrega)||0)} de entrega.`,sug.toFixed(2).replace(".",","));
  if(v===null)return;const valor=Math.round(Number(String(v).replace(/\./g,"").replace(",","."))*100)/100;
  if(!(valor>=8)){toast("O mínimo da corrida é R$ 8");return}
  const item=("Pedido de "+(p.cliente_nome||"cliente")+": "+(p.itens||[]).map(i=>i.n+"× "+i.nome).join(", ")).slice(0,120);
  b.disabled=true;b.textContent="Chamando…";
  safe(async()=>{
    const{data,error}=await sb.from("corridas").insert({coleta_bairro:perfil.loja_bairro||"Loja",entrega_bairro:p.bairro||"Cliente",item,valor,veiculo:"qualquer",distancia_km:null}).select().single();if(error)throw error;
    const r=await sb.from("corridas_det").insert({corrida_id:data.id,coleta_end:perfil.loja_end,entrega_end:p.endereco+(p.bairro?" — "+p.bairro:""),contato:so(p.cliente_whats)||perfil.telefone||null,obs:p.obs||null});
    if(r.error){await sb.rpc("mudar_corrida",{cid:data.id,acao:"cancelar"});throw r.error}
    const l=await sb.rpc("pedido_loja_corrida",{pid,cid:data.id});if(l.error)throw l.error;
    if(typeof corrLoad==="function")await corrLoad();await pedLojaLoad()},"Motoboy chamado! Avisamos quando alguém aceitar.").finally(()=>{b.disabled=false});
}
function pedStatus(id,novo,b){b.disabled=true;safe(async()=>{const r=await sb.rpc("pedido_loja_status",{pid:id,novo});b.disabled=false;if(r.error)throw Object.assign(r.error,{cxMsg:r.error.message});await pedLojaLoad()},novo==="aceito"?"Pedido aceito ✓":novo==="saiu"?"Cliente avisado: saiu pra entrega":"Pedido entregue ✓")}

/* ---------- ligações com o resto do app ---------- */
async function abrirDoLink(){const v=linkPend();if(!v||!uid)return;try{localStorage.removeItem(LINK_KEY)}catch(e){}
  const id=await idDoLink(v);if(!id)return;
  window.cxNavUser=Date.now(); // não deixa o app puxar de volta pro início
  if(id===uid){go("lojas");return}go("lojas");abrirLoja(id)}
function entrar(){admRender();if(!loja)lojasLoad();if(ehLoja()&&!meus.length)meusLoad();pedLojaLoad();meusPedLoad()}
if(typeof go==="function"){const g=go;go=function(v){g(v);if(v==="lojas")entrar()}}
const _al=window.agendaLoad;window.agendaLoad=async()=>{await _al();vitrineFechar();meusLoad();pedLojaLoad();await dadosPendentes();abrirDoLink()};
if(uid)setTimeout(()=>{meusLoad();abrirDoLink()},0);
window.cxDelivery={abrir:abrirLoja};
})();
