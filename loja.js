/* Cadernex — área do lojista: perfil da loja, produtos e preços, pedido rápido em lote e vitrine */
(function(){
const MAX_LINHAS=8;
let prods=[],vitrine=null,vtAberta=null,vtProds={},completo=false;
const ehLoja=()=>!!(perfil.loja&&perfil.loja_nome);
const so=v=>String(v||"").replace(/\D/g,"");
function cnpjValido(c){c=so(c);if(c.length!==14||/^(\d)\1{13}$/.test(c))return false;
  const calc=n=>{let s=0,p=n-7;for(let i=0;i<n;i++){s+=+c[i]*p--;if(p<2)p=9}const r=s%11;return r<2?0:11-r};
  return calc(12)===+c[12]&&calc(13)===+c[13]}
const fmtCnpj=c=>so(c).replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/,"$1.$2.$3/$4-$5");
const fmtTel=t=>{t=so(t);return t.length>10?t.replace(/(\d{2})(\d{5})(\d{4})/,"($1) $2-$3"):t.replace(/(\d{2})(\d{4})(\d{0,4})/,"($1) $2-$3")};

/* ---------- Perfil: Minha loja ---------- */
function perfilRender(){
  if(document.activeElement?.closest?.("#lj-card"))return;
  $("lj-on").checked=!!perfil.loja;$("fLoja").hidden=!perfil.loja;
  $("lj-nome").value=perfil.loja_nome||"";$("lj-end").value=perfil.loja_end||"";$("lj-bairro").value=perfil.loja_bairro||"";
  $("lj-horario").value=perfil.loja_horario||"";$("lj-whats").value=perfil.loja_whats?fmtTel(perfil.loja_whats):"";$("lj-cnpj").value=perfil.loja_cnpj?fmtCnpj(perfil.loja_cnpj):"";
  $("lj-prod-w").hidden=!ehLoja();
}
$("lj-on").onchange=()=>{const on=$("lj-on").checked;$("fLoja").hidden=!on;
  if(!on&&perfil.loja)safe(async()=>{await savePerfil({loja:false});tudo()},"Modo loja desligado")};
$("lj-cnpj").addEventListener("input",e=>{const v=so(e.target.value).slice(0,14);e.target.value=v.length>12?fmtCnpj(v.padEnd(14," ")).trim():v});
$("fLoja").onsubmit=e=>{e.preventDefault();const msg=$("lj-msg");msg.textContent="";
  const nome=$("lj-nome").value.trim(),end=$("lj-end").value.trim(),bairro=$("lj-bairro").value.trim(),cnpj=so($("lj-cnpj").value),whats=so($("lj-whats").value);
  if(nome.length<2){msg.textContent="Coloque o nome da loja.";return}
  if(end.length<5){msg.textContent="Coloque o endereço onde o entregador busca.";return}
  if(bairro.length<2){msg.textContent="Coloque o bairro da loja.";return}
  if(cnpj&&!cnpjValido(cnpj)){msg.textContent="CNPJ inválido. Confira ou deixe em branco.";return}
  if(whats&&(whats.length<10||whats.length>11)){msg.textContent="WhatsApp com DDD, ex.: (62) 99999-9999.";return}
  safe(async()=>{await savePerfil({loja:true,loja_nome:nome,loja_end:end,loja_bairro:bairro,loja_horario:$("lj-horario").value.trim()||null,loja_whats:whats||null,loja_cnpj:cnpj||null,end_padrao:perfil.end_padrao||end});vitrine=null;tudo();prodLoad()},"Loja salva ✓")};

/* ---------- Produtos e preços ---------- */
async function prodLoad(){
  if(!sb||!uid||!ehLoja())return;
  const r=await sb.from("produtos").select("*").eq("loja_id",uid).order("criado_em");
  prods=r.error?[]:r.data;prodRender();painelRender();
}
function prodRender(){
  const el=$("lj-prods");if(!el)return;
  el.innerHTML=prods.length?prods.map(p=>`<div class="prod${p.ativo?"":" off"}"><div><b data-pn="${p.id}"></b><span class="num">${brl(Number(p.preco))}</span><small data-pd="${p.id}"></small></div>
    <div class="prod-ac"><button class="link" type="button" data-pativo="${p.id}" style="padding:0">${p.ativo?"Pausar":"Ativar"}</button><button class="del" type="button" data-pdel="${p.id}" aria-label="Apagar produto">✕</button></div></div>`).join("")
    :`<p class="hint" style="margin:0">Nenhum produto ainda. Adicione abaixo o que você vende e o preço.</p>`;
  prods.forEach(p=>{el.querySelector(`[data-pn="${p.id}"]`).textContent=p.nome;el.querySelector(`[data-pd="${p.id}"]`).textContent=p.descricao||""});
}
$("fProd").onsubmit=e=>{e.preventDefault();const nome=$("pr-nome").value.trim(),preco=num($("pr-preco").value);
  if(nome.length<2){toast("Coloque o nome do produto");return}if(!(preco>=0)||$("pr-preco").value.trim()===""){toast("Coloque o preço");return}
  safe(async()=>{const{data,error}=await sb.from("produtos").insert({nome,preco,descricao:$("pr-desc").value.trim()||null}).select().single();if(error)throw error;
    prods.push(data);$("pr-nome").value=$("pr-preco").value=$("pr-desc").value="";prodRender();painelRender();$("pr-nome").focus()},"Produto adicionado")};
$("lj-prods").addEventListener("click",e=>{
  const a=e.target.closest("[data-pativo]");if(a){const p=prods.find(x=>x.id===a.dataset.pativo);safe(async()=>{const{error}=await sb.from("produtos").update({ativo:!p.ativo}).eq("id",p.id);if(error)throw error;p.ativo=!p.ativo;prodRender();painelRender()});return}
  const d=e.target.closest("[data-pdel]");if(d){if(d.dataset.ok!=="1"){d.dataset.ok="1";d.textContent="Apagar?";return}
    safe(async()=>{const{error}=await sb.from("produtos").delete().eq("id",d.dataset.pdel);if(error)throw error;prods=prods.filter(x=>x.id!==d.dataset.pdel);prodRender();painelRender()},"Produto apagado")}
});

/* ---------- Painel da loja: pedido rápido, várias entregas de uma vez ---------- */
function linhaHTML(i){
  const ops=prods.filter(p=>p.ativo).map(p=>`<option value="${p.id}"></option>`).join("");
  return `<div class="lote-l" data-l="${i}"><div class="row" style="align-items:center"><b class="eyebrow">Entrega ${i+1}</b>${i?`<button class="del" type="button" data-lrm aria-label="Tirar essa entrega">✕</button>`:""}</div>
    <label${ops?"":" hidden"}>Produto<select data-f="prod"><option value="">— escolher (opcional) —</option>${ops}</select></label>
    <label>Endereço do cliente<input data-f="end" placeholder="Rua, número, ponto de referência"></label>
    <div class="grid2"><label>Bairro<input data-f="bairro" placeholder="ex.: Setor Sul"></label><label>Telefone do cliente<input data-f="tel" type="tel" placeholder="opcional"></label></div>
    <div class="grid2"><label>Distância (km)<input data-f="km" inputmode="decimal" placeholder="ex.: 3"></label><label>Taxa de entrega (R$)<input data-f="valor" inputmode="decimal" placeholder="pela tabela"></label></div></div>`;
}
function preencheOps(box){box.querySelectorAll('select[data-f="prod"] option[value]').forEach(o=>{if(!o.value)return;const p=prods.find(x=>x.id===o.value);if(p)o.textContent=`${p.nome} · ${brl(Number(p.preco))}`})}
function novaLinha(){const box=$("lj-linhas"),n=box.querySelectorAll(".lote-l").length;if(n>=MAX_LINHAS){toast(`Até ${MAX_LINHAS} entregas por vez`);return}
  box.insertAdjacentHTML("beforeend",linhaHTML(n));preencheOps(box);atualizaBotao()}
function atualizaBotao(){const n=$("lj-linhas").querySelectorAll(".lote-l").length;$("lj-enviar").textContent=n>1?`Pedir ${n} entregas`:"Pedir entrega"}
function painelRender(){
  const w=$("lj-painel");if(!w)return;const on=ehLoja();w.hidden=!on;
  $("fPedir").hidden=on&&!completo||!!perfil.bloqueado;$("lj-completo").textContent=completo?"Voltar pro pedido rápido":"Pedido completo (frete, agendar, localização…)";
  if(!on)return;
  $("lj-titulo").textContent=perfil.loja_nome;$("lj-coleta").textContent=`Coleta: ${perfil.loja_end}${perfil.loja_bairro?" · "+perfil.loja_bairro:""}`;
  const hoje=new Date().toDateString(),meus=(typeof minhas!=="undefined"?minhas:[]).filter(c=>c.cliente_id===uid&&new Date(c.created_at).toDateString()===hoje&&c.status!=="cancelada");
  $("lj-hoje").innerHTML=`<b>${meus.length}</b> entrega${meus.length===1?"":"s"} hoje · <b>${brl(meus.reduce((s,c)=>s+Number(c.valor),0))}</b> em taxas · <b>${meus.filter(c=>["aceita","coletada"].includes(c.status)).length}</b> a caminho`;
  const box=$("lj-linhas");if(!box.querySelector(".lote-l"))novaLinha();
  else{box.querySelectorAll('select[data-f="prod"]').forEach(s=>{const v=s.value;s.innerHTML=`<option value="">— escolher (opcional) —</option>`+prods.filter(p=>p.ativo).map(p=>`<option value="${p.id}"></option>`).join("");s.value=v;s.parentElement.hidden=!prods.some(p=>p.ativo)});preencheOps(box)}
}
$("lj-mais").onclick=novaLinha;
$("lj-completo").onclick=()=>{completo=!completo;painelRender();if(completo)$("fPedir").scrollIntoView({behavior:"smooth"})};
$("lj-linhas").addEventListener("click",e=>{const r=e.target.closest("[data-lrm]");if(!r)return;r.closest(".lote-l").remove();
  $("lj-linhas").querySelectorAll(".lote-l").forEach((l,i)=>{l.dataset.l=i;l.querySelector(".eyebrow").textContent="Entrega "+(i+1)});atualizaBotao()});
$("lj-linhas").addEventListener("input",e=>{const l=e.target.closest(".lote-l");if(!l||e.target.dataset.f!=="km")return;const k=num(e.target.value);l.querySelector('[data-f="valor"]').placeholder=k?String(justo(k).toFixed(2)).replace(".",","):"pela tabela"});
$("fLote").onsubmit=e=>{e.preventDefault();
  const linhas=[...$("lj-linhas").querySelectorAll(".lote-l")].map(l=>{const g=f=>{const x=l.querySelector(`[data-f="${f}"]`);return x?x.value.trim():""};
    const p=prods.find(x=>x.id===g("prod")),k=num(g("km"))||null;let valor=num(g("valor"));if(!valor&&k)valor=justo(k);
    return{end:g("end"),bairro:g("bairro"),tel:g("tel"),k,valor,item:p?`${p.nome} (${brl(Number(p.preco))})`:"Entrega da loja"}});
  for(const[i,x]of linhas.entries()){
    if(x.end.length<5){toast(`Entrega ${i+1}: coloque o endereço do cliente`);return}
    if(x.bairro.length<2){toast(`Entrega ${i+1}: coloque o bairro`);return}
    if(!(x.valor>=BASE)){toast(`Entrega ${i+1}: coloque a distância ou a taxa (mínimo R$ 8)`);return}
  }
  const b=$("lj-enviar");b.disabled=true;
  safe(async()=>{let ok=0;
    try{for(const x of linhas){
      const{data,error}=await sb.from("corridas").insert({coleta_bairro:perfil.loja_bairro||"Loja",entrega_bairro:x.bairro,item:x.item.slice(0,120),valor:x.valor,veiculo:"qualquer",distancia_km:x.k}).select().single();if(error)throw error;
      const r=await sb.from("corridas_det").insert({corrida_id:data.id,coleta_end:perfil.loja_end,entrega_end:x.end,contato:x.tel||perfil.telefone||null,obs:null});
      if(r.error){await sb.rpc("mudar_corrida",{cid:data.id,acao:"cancelar"});throw r.error}ok++}}
    finally{b.disabled=false}
    $("lj-linhas").innerHTML="";novaLinha();await corrLoad();go("pedidos");
    toast(ok>1?`${ok} entregas pedidas! Avisamos quando aceitarem.`:"Entrega pedida! Avisamos quando aceitarem.")}).finally(()=>b.disabled=false)};

/* ---------- Vitrine: lojas do Cadernex ---------- */
async function vitrineLoad(){
  if(!sb||!uid)return;const r=await sb.rpc("lojas_publicas");
  if(r.error){$("vitrine").hidden=true;return}vitrine=r.data||[];vitrineRender();
}
function vitrineRender(){
  const w=$("vitrine"),el=$("vt-lista");if(!w||vitrine==null)return;
  w.hidden=!vitrine.length;if(!vitrine.length)return;
  el.innerHTML=vitrine.map(l=>`<div class="vt-loja${vtAberta===l.id?" open":""}"><button type="button" class="vt-h" data-vt="${l.id}"><span class="vt-ico">${IC.loja}</span><span class="vt-t"><b data-vn></b><small data-vs></small></span><span class="vt-n">${l.produtos} produto${l.produtos==1?"":"s"}</span></button>
    ${vtAberta===l.id?`<div class="vt-prods">${vtProds[l.id]?(vtProds[l.id].length?vtProds[l.id].map(p=>`<div class="prod"><div><b data-xn="${p.id}"></b><small data-xd="${p.id}"></small></div><span class="num">${brl(Number(p.preco))}</span></div>`).join(""):`<p class="hint" style="margin:0">Essa loja ainda não cadastrou produtos.</p>`):`<p class="hint" style="margin:0">Carregando…</p>`}
    ${l.whats?`<a class="btn ghost full" target="_blank" rel="noopener" href="https://wa.me/55${so(l.whats)}">${IC.chat}Chamar no WhatsApp</a>`:""}</div>`:""}</div>`).join("");
  vitrine.forEach((l,i)=>{const n=el.querySelectorAll(".vt-loja")[i];n.querySelector("[data-vn]").textContent=l.nome;n.querySelector("[data-vs]").textContent=[l.bairro,l.horario].filter(Boolean).join(" · ")});
  Object.values(vtProds).flat().forEach(p=>{const a=el.querySelector(`[data-xn="${p.id}"]`);if(a){a.textContent=p.nome;el.querySelector(`[data-xd="${p.id}"]`).textContent=p.descricao||""}});
}
$("vt-lista").addEventListener("click",async e=>{const b=e.target.closest("[data-vt]");if(!b)return;const id=b.dataset.vt;
  vtAberta=vtAberta===id?null:id;vitrineRender();
  if(vtAberta&&!vtProds[id]){const r=await sb.from("produtos").select("id,nome,preco,descricao").eq("loja_id",id).eq("ativo",true).order("nome");vtProds[id]=r.error?[]:r.data;vitrineRender()}});

/* ---------- ligações com o resto do app ---------- */
function tudo(){perfilRender();painelRender()}
const _r=corrRender;corrRender=function(){_r();painelRender()};
if(typeof go==="function"){const g=go;go=function(v){g(v);if(v==="perfilc")perfilRender();if(v==="pedir"){painelRender();if(vitrine==null)vitrineLoad()}}}
const _al=window.agendaLoad;window.agendaLoad=async()=>{await _al();tudo();prodLoad();vitrineLoad()};
if(uid)setTimeout(()=>{tudo();prodLoad();vitrineLoad()},0);
})();
