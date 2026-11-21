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
const linkDa=id=>`${SITE}?loja=${id}`;
const imgLoja=(id,tipo,v)=>v?`${CFG.SUPABASE_URL}/storage/v1/object/public/produtos/${id}/${tipo}.jpg?v=${v}`:"";
const iniciais=n=>String(n||"?").trim().split(/\s+/).slice(0,2).map(x=>x[0]||"").join("").toUpperCase();
const logoHtml=(id,nome,v,cls)=>v?`<img class="${cls}" src="${esc(imgLoja(id,"logo",v))}" alt="" loading="lazy">`:`<span class="${cls} dl-ini">${esc(iniciais(nome))}</span>`;
// taxa de entrega estimada = corrida do Cadernex (R$ 8 até 3 km, + R$ 1,40/km) + 10% do app, arredondada pra 50 centavos
const freteDe=k=>{const base=typeof justo==="function"?justo(k):Math.max(8,Math.ceil((8+1.4*Math.max(0,k-3))*2)/2);return Math.ceil(base*1.1*2)/2};
const IC={
  loja:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6"/></svg>',
  foto:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  zap:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.9A8 8 0 1121 12z"/></svg>'};

/* ---------- link da loja: guarda e abre depois de entrar ---------- */
try{const q=new URLSearchParams(location.search).get("loja");if(q&&UUID.test(q)){localStorage.setItem(LINK_KEY,q.toLowerCase());history.replaceState(null,"",location.pathname+location.hash)}}catch(e){}
const linkPend=()=>{try{const v=localStorage.getItem(LINK_KEY);return v&&UUID.test(v)?v:null}catch(e){return null}};
async function leadDoLink(){ // tela de entrar: mostra o nome da loja do link
  const id=linkPend();if(!id||uid)return;
  for(let i=0;i<20&&!sb;i++)await new Promise(r=>setTimeout(r,150));if(!sb||uid)return;
  const r=await sb.rpc("loja_do_link",{lid:id});const l=!r.error&&r.data&&r.data[0];
  const el=document.querySelector("#s-auth .lead");if(!el)return;
  el.textContent=l?`Entre ou crie sua conta grátis pra ver o cardápio de ${l.nome}${l.bairro?" ("+l.bairro+")":""} e fazer seu pedido.`:"Entre ou crie sua conta pra ver o cardápio da loja.";
  if(window.auAba)auAba("entrar");
}
leadDoLink();

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
async function meusLoad(){if(!sb||!uid||!ehLoja())return;const r=await sb.from("produtos").select("*").eq("loja_id",uid).order("criado_em");meus=r.error?[]:r.data;admRender()}
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
  const im=e.target.closest("[data-dlimg]");if(im&&$("dl-adm")&&$("dl-adm").contains(im)){e.stopPropagation();imgAlvo=im.dataset.dlimg;$("dl-file3").click();return}
  if(e.target.closest("[data-dlend]")){salvaEnd();return}
  if(e.target.closest("[data-dlpick]")){$("dl-file").click();return}
  const ab=e.target.closest("[data-dlab]");if(ab){const novo=!aberta();safe(async()=>{await savePerfil({loja_aberta:novo});admRender()},novo?"Loja aberta ✓":"Loja fechada");return}
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
  w.innerHTML=`<div class="card stack"><div><div class="eyebrow">Compre de quem é daqui</div><h2 style="margin:2px 0 0">Lojas no Cadernex</h2></div>
    ${lojas.length?lojas.map(l=>`<button class="dl-lj" type="button" data-dlloja="${l.id}">${l.logo_v?logoHtml(l.id,l.nome,l.logo_v,"dl-lj-i dl-lj-logo"):`<span class="dl-lj-i">${IC.loja}</span>`}
      <span class="dl-lj-t"><b>${esc(l.nome)}</b><small>${esc([l.ramo,l.bairro,l.horario].filter(Boolean).join(" · "))}</small></span>
      <span class="dl-lj-s"><em class="dl-pill${l.aberta?" on":""}">${l.aberta?"Aberta":"Fechada"}</em><small>${l.produtos} produto${l.produtos==1?"":"s"}</small></span></button>`).join("")
    :`<p class="hint" style="margin:0">Ainda não tem lojas com delivery. Tem uma loja? Cadastre em Perfil → Informações da loja.</p>`}</div>`;
}
async function abrirLoja(id){
  if(!lojas)await lojasLoad();let l=(lojas||[]).find(x=>x.id===id);
  if(!l){toast("Essa loja não está disponível agora");return}
  loja=l;cardapio=null;if(cart.loja!==id)cart={loja:id,q:{}};cardRender();
  const r=await sb.from("produtos").select("id,nome,preco,descricao,categoria,foto_v").eq("loja_id",id).eq("ativo",true).order("criado_em");
  cardapio=r.error?[]:r.data;Object.keys(cart.q).forEach(k=>{if(!cardapio.some(p=>p.id===k))delete cart.q[k]});cardRender();scrollTo(0,0);
}
const itens=()=>Object.entries(cart.q).filter(([,n])=>n>0).map(([id,n])=>({p:(cardapio||[]).find(x=>x.id===id),n})).filter(x=>x.p);
const total=()=>itens().reduce((s,x)=>s+x.n*Number(x.p.preco),0);
function cardRender(){
  const w=$("dl-cli"),l=loja,pode=l.aberta&&!!so(l.whats);
  const gs=cardapio?grupos(cardapio):[];
  w.innerHTML=`<button class="link dl-volta" type="button" data-dlvolta>← Todas as lojas</button>
  <div class="card stack dl-head">${l.capa_v?`<div class="dl-capa"><img src="${esc(imgLoja(l.id,"capa",l.capa_v))}" alt=""></div>`:""}<div class="row" style="align-items:center;gap:10px">${logoHtml(l.id,l.nome,l.logo_v,"dl-logo dl-logo-h")}<div style="flex:1;min-width:0"><div class="eyebrow">${esc([l.ramo,l.bairro].filter(Boolean).join(" · ")||"Delivery")}</div><h2 style="margin:2px 0 0">${esc(l.nome)}</h2></div><span class="dl-pill${l.aberta?" on":""}">${l.aberta?"Aberta":"Fechada"}</span></div>
    ${l.horario?`<small class="hint" style="margin:0">Horário: ${esc(l.horario)}</small>`:""}
    ${!l.aberta?`<p class="dl-aviso">A loja está fechada agora. Você pode olhar o cardápio, e o pedido libera quando ela abrir.</p>`:!so(l.whats)?`<p class="dl-aviso">Essa loja ainda não colocou o WhatsApp pra receber pedidos.</p>`:""}
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
function ckRender(){
  const w=$("dl-ck");if(!w)return;const its=itens();if(!its.length){w.innerHTML="";return}
  w.innerHTML=`<div class="card stack dl-ckc"><div><div class="eyebrow">Seu pedido</div><h2 style="margin:2px 0 0">${esc(loja.nome)}</h2></div>
    ${its.map(x=>`<div class="row"><span>${x.n}× ${esc(x.p.nome)}</span><b class="num">${brl(x.n*Number(x.p.preco))}</b></div>`).join("")}
    <div class="row" style="border-top:1px solid var(--line);padding-top:8px"><b>Produtos</b><b class="num">${brl(total())}</b></div>
    <div class="row" id="dl-fr-r"><span>Entrega</span><b class="num" id="dl-fr">${loja.lat!=null?"coloque o endereço":"a loja informa"}</b></div>
    <div class="row dl-tot" id="dl-tot-r" hidden><b>Total estimado</b><b class="num" id="dl-tot"></b></div>
    <p class="hint" style="margin:0;font-size:12px" id="dl-fr-h">${loja.lat!=null?"A entrega é estimada pela distância. A loja confirma o valor no WhatsApp.":"A taxa de entrega a loja te informa no WhatsApp, junto com a confirmação."}</p>
    <label>Endereço de entrega<input id="dl-end" maxlength="140" placeholder="Rua, número, quadra, lote, referência" value="${esc(perfil.end_padrao||"")}"></label>
    <label>Bairro<input id="dl-bairro" maxlength="40"></label>
    <label>Pagamento<select id="dl-pag"><option>Pix</option><option>Dinheiro</option><option>Cartão na entrega</option></select></label>
    <label id="dl-troco-w" hidden>Troco pra quanto?<input id="dl-troco" inputmode="decimal" placeholder="opcional"></label>
    <label>Observação<input id="dl-obs" maxlength="140" placeholder="opcional: sem cebola, ponto da carne…"></label>
    <button class="btn full" type="button" data-dlenviar>${IC.zap}Enviar pedido no WhatsApp da loja</button>
    <p class="hint" style="margin:0;font-size:12px">A loja confirma o pedido e chama o motoboy do Cadernex pra levar até você.</p></div>`;
  $("dl-pag").onchange=()=>$("dl-troco-w").hidden=$("dl-pag").value!=="Dinheiro";
  frete=null;let t=null;const calc=()=>{clearTimeout(t);t=setTimeout(calcFrete,700)};
  $("dl-end").addEventListener("input",calc);$("dl-bairro").addEventListener("input",calc);
  if(String(perfil.end_padrao||"").length>=5)calc();
  w.scrollIntoView({behavior:"smooth",block:"start"});
}
let frete=null,freteN=0;
async function calcFrete(){
  if(!loja||loja.lat==null||!$("dl-fr"))return;
  const end=$("dl-end").value.trim(),bairro=$("dl-bairro").value.trim(),n=++freteN;frete=null;
  if(end.length<5){$("dl-fr").textContent="coloque o endereço";$("dl-tot-r").hidden=true;return}
  $("dl-fr").textContent="calculando…";
  const pt=window.cxGeo?await cxGeo.ponto([end,bairro,"Goiânia","GO"].filter(Boolean).join(", ")):null;if(n!==freteN)return;
  if(!pt){$("dl-fr").textContent="a loja informa";$("dl-tot-r").hidden=true;return}
  const a={lat:loja.lat,lng:loja.lng};let m=window.cxGeo?await cxGeo.rotaMetros(a,pt):null;if(n!==freteN)return;
  if(!m){const R=6371e3,r=x=>x*Math.PI/180,dl=r(pt.lat-a.lat),dn=r(pt.lng-a.lng),h=Math.sin(dl/2)**2+Math.cos(r(a.lat))*Math.cos(r(pt.lat))*Math.sin(dn/2)**2;m=2*R*Math.asin(Math.sqrt(h))*1.3}
  const k=Math.round(m/100)/10;
  if(k>40){$("dl-fr").textContent="fora da área: a loja informa";$("dl-tot-r").hidden=true;return}
  frete={v:freteDe(k),km:k};
  $("dl-fr").textContent=`${brl(frete.v)} · ${String(k).replace(".",",")} km`;$("dl-tot").textContent=brl(total()+frete.v);$("dl-tot-r").hidden=false;
}
function enviar(){
  const end=$("dl-end").value.trim(),bairro=$("dl-bairro").value.trim(),pag=$("dl-pag").value,troco=$("dl-troco").value.trim(),obs=$("dl-obs").value.trim();
  if(end.length<5){toast("Coloque o endereço de entrega");$("dl-end").focus();return}
  if(bairro.length<2){toast("Coloque o bairro");$("dl-bairro").focus();return}
  const its=itens(),nome=String(perfil.nome||"").trim().split(" ")[0];
  const t=[`*Pedido pelo Cadernex* 🛵`,`${loja.nome}`,``,...its.map(x=>`${x.n}x ${x.p.nome} — ${brl(x.n*Number(x.p.preco))}`),``,`*Produtos: ${brl(total())}*`,...(frete?[`Entrega estimada pelo Cadernex: ${brl(frete.v)} (${String(frete.km).replace(".",",")} km)`,`*Total estimado: ${brl(total()+frete.v)}*`]:[`(falta somar a entrega)`]),``,
    `*Entregar em:* ${end} — ${bairro}`,`*Pagamento:* ${pag}${pag==="Dinheiro"&&troco?` (troco pra R$ ${troco})`:""}`,obs?`*Obs.:* ${obs}`:"",nome?`*Cliente:* ${nome}`:""].filter((x,i,a)=>x!==""||a[i-1]!=="").join("\n");
  if(!perfil.end_padrao)savePerfil({end_padrao:end}).catch(()=>{});
  open(`https://wa.me/55${so(loja.whats)}?text=${encodeURIComponent(t)}`,"_blank","noopener");
  cart={loja:loja.id,q:{}};salvaCart();setTimeout(()=>{cardRender();toast("Pedido enviado no WhatsApp ✓ Aguarde a loja confirmar.")},600);
}
V.addEventListener("click",e=>{
  const lj=e.target.closest("[data-dlloja]");if(lj){abrirLoja(lj.dataset.dlloja);return}
  if(e.target.closest("[data-dlvolta]")){loja=null;cliRender();scrollTo(0,0);return}
  const ir=e.target.closest("[data-dlir]");if(ir){$("dl-sec-"+ir.dataset.dlir)?.scrollIntoView({behavior:"smooth",block:"start"});return}
  const ma=e.target.closest("[data-dlmais]");if(ma){cart.q[ma.dataset.dlmais]=(cart.q[ma.dataset.dlmais]||0)+1;salvaCart();const y=scrollY;cardRender();scrollTo(0,y);return}
  const me=e.target.closest("[data-dlmenos]");if(me){const k=me.dataset.dlmenos;cart.q[k]=Math.max(0,(cart.q[k]||0)-1);if(!cart.q[k])delete cart.q[k];salvaCart();const y=scrollY;cardRender();scrollTo(0,y);return}
  if(e.target.closest("[data-dlck]")){ckRender();return}
  if(e.target.closest("[data-dlenviar]")){enviar();return}
});

/* ---------- ligações com o resto do app ---------- */
function abrirDoLink(){const id=linkPend();if(!id||!uid)return;try{localStorage.removeItem(LINK_KEY)}catch(e){}
  if(id===uid){go("lojas");return}go("lojas");abrirLoja(id)}
function entrar(){admRender();if(!loja)lojasLoad();if(ehLoja()&&!meus.length)meusLoad()}
if(typeof go==="function"){const g=go;go=function(v){g(v);if(v==="lojas")entrar()}}
const _al=window.agendaLoad;window.agendaLoad=async()=>{await _al();meusLoad();abrirDoLink()};
if(uid)setTimeout(()=>{meusLoad();abrirDoLink()},0);
window.cxDelivery={abrir:abrirLoja};
})();
