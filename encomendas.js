/* Cadernex — compras nas lojas: o cliente compra pela vitrine, a loja aceita, o cliente paga no Pix
   (Mercado Pago, com os 6% do Cadernex) e a loja chama o motoqueiro. Todo mundo acompanha. */
(function(){
const CFG=window.CORRE_CONFIG||{},MP_TAXA=CFG.MP_TAXA||0.0099,TAXA_APP=0.06,BASE_E=8,POR_KM_E=0.55;
const so=v=>String(v||"").replace(/\D/g,"");
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const r2=v=>Math.round(v*100)/100;
function contaCompra(sub,taxa){const v=r2(Number(sub)+Number(taxa||0)),t6=r2(v*TAXA_APP),total=Math.ceil((v+t6)/(1-MP_TAXA)*100)/100;return{v,servico:r2(total-v),total}}
const qtdItens=it=>(it||[]).reduce((s,i)=>s+Number(i.qtd||1),0);
const linhaItens=it=>(it||[]).map(i=>`${i.qtd}× ${esc(i.nome)}`).join(" · ");
async function erroDe(error,data){
  if(data&&data.erro)return data.erro;
  try{const j=await error.context.json();if(j&&j.erro)return j.erro}catch(e){}
  const m=String(error&&error.message||"");
  if(/Complete seu cadastro|bloqueada|loja não está|endereço|produto|Termine|Espere|não é possível|não encontrado|taxa/i.test(m))return m;
  return /Failed to send|FunctionsFetchError|not found|404/i.test(m)?"O pagamento das compras ainda não foi ligado no servidor.":"Não deu certo agora. Confira a internet e tente de novo.";
}

/* ---------- endereço: CEP (ViaCEP) e ponto no mapa (OpenStreetMap) ---------- */
const comPrazo=(u,ms=7000)=>{const ac=new AbortController(),t=setTimeout(()=>ac.abort(),ms);return fetch(u,{signal:ac.signal,headers:{"Accept-Language":"pt-BR"}}).finally(()=>clearTimeout(t))};
async function viaCep(c){c=so(c);if(c.length!==8)return null;try{const d=await (await comPrazo(`https://viacep.com.br/ws/${c}/json/`)).json();return d.erro?null:d}catch(e){return null}}
async function nomi(q){try{const d=await (await comPrazo("https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q="+encodeURIComponent(q))).json();return d[0]?{lat:+d[0].lat,lng:+d[0].lon}:null}catch(e){return null}}
async function ponto(end,bairro,info){
  const cid=info?`${info.localidade} - ${info.uf}`:"";
  const tent=[`${end}, ${bairro}${cid?", "+cid:""}`,info&&info.logradouro?`${info.logradouro}, ${cid}`:null,info?`${bairro||info.bairro}, ${cid}`:null].filter(Boolean);
  for(const q of tent){const p=await nomi(q+", Brasil");if(p)return p}return null}
// a loja salva o próprio ponto (fica só no perfil dela; serve pra calcular a entrega)
window.cxGeoLoja=async(cep,end,bairro)=>ponto(end,bairro,await viaCep(cep));

/* ================= CLIENTE: carrinho na vitrine ================= */
let cart={loja:null,q:{}},geo=null,infoCep=null,taxaCalc=undefined,calcT=null;
const lojaDe=id=>(window.cxVitrine&&window.cxVitrine.lista()||[]).find(l=>l.id===id);
const prodDe=(lj,pid)=>((window.cxVitrine&&window.cxVitrine.prods(lj))||[]).find(p=>p.id===pid);
function cartItens(){return Object.entries(cart.q).filter(([,n])=>n>0).map(([id,qtd])=>({id,qtd,p:prodDe(cart.loja,id)})).filter(x=>x.p)}
function cartSub(){return r2(cartItens().reduce((s,x)=>s+Number(x.p.preco)*x.qtd,0))}
window.encQtd=function(){
  document.querySelectorAll("#vt-lista .qt[data-qt]").forEach(el=>{
    const pid=el.dataset.qt,lj=el.dataset.lj,n=cart.loja===lj?cart.q[pid]||0:0;
    el.innerHTML=n?`<button type="button" class="qt-b" data-qm="${pid}" data-lj="${lj}" aria-label="Tirar um">−</button><b class="num">${n}</b><button type="button" class="qt-b" data-qa="${pid}" data-lj="${lj}" aria-label="Pôr mais um">+</button>`
      :`<button type="button" class="qt-add" data-qa="${pid}" data-lj="${lj}">Adicionar</button>`});
  barRender();
};
function barRender(){
  const b=$("enc-bar");if(!b)return;const n=cartItens().reduce((s,x)=>s+x.qtd,0);
  b.hidden=!n||!$("enc-ck").hidden||$("v-lojas").hidden;
  if(n)$("enc-bar-t").innerHTML=`<b>${n} ${n===1?"item":"itens"} · ${brl(cartSub())}</b><small>${esc(lojaDe(cart.loja)?.nome||"")}</small>`;
}
document.addEventListener("click",e=>{
  const a=e.target.closest("[data-qa],[data-qm]");if(!a||!a.closest("#vt-lista"))return;
  const lj=a.dataset.lj,pid=a.dataset.qa||a.dataset.qm;
  if(cart.loja&&cart.loja!==lj&&cartItens().length){cart={loja:null,q:{}};toast("Seu carrinho era de outra loja. Começamos um novo.")}
  cart.loja=lj;const n=(cart.q[pid]||0)+(a.dataset.qa?1:-1);cart.q[pid]=Math.max(0,Math.min(20,n));
  if(!cartItens().length)cart.loja=null;encQtd();
});
$("enc-bar-b").onclick=abrirCk;
function abrirCk(){
  if(!cartItens().length)return;
  $("vitrine").hidden=true;$("enc-ck").hidden=false;$("enc-bar").hidden=true;
  $("ek-loja").textContent=lojaDe(cart.loja)?.nome||"Loja";
  if(!$("ek-tel").value&&perfil.telefone)$("ek-tel").value=perfil.telefone;
  if(!$("ek-end").value&&perfil.end_padrao)$("ek-end").value=perfil.end_padrao;
  ckRender();scrollTo(0,0);
}
function fecharCk(){$("enc-ck").hidden=true;$("vitrine").hidden=false;encQtd()}
$("ek-voltar").onclick=fecharCk;
function ckRender(){
  const it=cartItens();if(!it.length){fecharCk();return}
  $("ek-itens").innerHTML=it.map(x=>`<div class="ek-it"><span><b class="num">${x.qtd}×</b> <span data-n></span></span><span class="num">${brl(Number(x.p.preco)*x.qtd)}</span><span class="qt"><button type="button" class="qt-b" data-km="${x.id}" aria-label="Tirar um">−</button><button type="button" class="qt-b" data-ka="${x.id}" aria-label="Pôr mais um">+</button></span></div>`).join("");
  $("ek-itens").querySelectorAll("[data-n]").forEach((s,i)=>s.textContent=it[i].p.nome);
  const sub=cartSub(),tx=taxaCalc&&taxaCalc.taxa!=null?Number(taxaCalc.taxa):null,k=contaCompra(sub,tx||0);
  $("ek-conta").innerHTML=`<span>Produtos</span><span class="num">${brl(sub)}</span>
    <span>Entrega${taxaCalc&&taxaCalc.km?` · ${String(taxaCalc.km).replace(".",",")} km`:""}</span><span class="num">${taxaCalc===undefined?"coloque o endereço":taxaCalc==="…"?"calculando…":tx!=null?brl(tx):"a loja confirma"}</span>
    <span>Taxa de serviço (6% + Pix)</span><span class="num">${brl(k.servico)}</span>
    <b>Total${tx==null?" (sem a entrega)":""}</b><b class="num">${brl(k.total)}</b>`;
}
$("ek-itens").addEventListener("click",e=>{const b=e.target.closest("[data-ka],[data-km]");if(!b)return;const id=b.dataset.ka||b.dataset.km;
  cart.q[id]=Math.max(0,Math.min(20,(cart.q[id]||0)+(b.dataset.ka?1:-1)));ckRender()});
$("ek-cep").addEventListener("input",async e=>{
  let v=so(e.target.value).slice(0,8);e.target.value=v.length>5?v.slice(0,5)+"-"+v.slice(5):v;if(v.length!==8)return;
  $("ek-cepnota").textContent="Buscando o CEP…";infoCep=await viaCep(v);
  if(!infoCep){$("ek-cepnota").textContent="CEP não encontrado. Confira ou preencha a rua e o bairro.";return}
  $("ek-cepnota").textContent=`${infoCep.localidade} - ${infoCep.uf}`;
  if(infoCep.logradouro&&!$("ek-end").value.trim()){$("ek-end").value=infoCep.logradouro+", ";}
  if(infoCep.bairro)$("ek-bairro").value=infoCep.bairro;
  $("ek-end").focus();calcular();
});
["ek-end","ek-bairro"].forEach(id=>$(id).addEventListener("input",()=>{clearTimeout(calcT);calcT=setTimeout(calcular,1200)}));
async function calcular(){
  const end=$("ek-end").value.trim(),bairro=$("ek-bairro").value.trim();if(end.length<5||bairro.length<2||!cart.loja)return;
  taxaCalc="…";ckRender();geo=await ponto(end,bairro,infoCep);
  const r=await sb.rpc("encomenda_taxa",{lj:cart.loja,lat:geo?geo.lat:null,lng:geo?geo.lng:null});
  taxaCalc=r.error?{taxa:null,km:null}:(r.data||{taxa:null,km:null});ckRender();
}
$("enc-ck").onsubmit=async e=>{
  e.preventDefault();const it=cartItens(),end=$("ek-end").value.trim(),bairro=$("ek-bairro").value.trim(),cep=so($("ek-cep").value);
  if(!it.length){toast("Seu carrinho está vazio");return}
  if(end.length<5){toast("Coloque a rua e o número");$("ek-end").focus();return}
  if(bairro.length<2){toast("Coloque o bairro");$("ek-bairro").focus();return}
  if(typeof dadosOk!=="undefined"&&dadosOk===false){toast("Complete seu cadastro antes de comprar");if(typeof abrirDados==="function")abrirDados();return}
  const b=$("ek-btn");b.disabled=true;b.textContent="Enviando…";
  try{
    if(!geo&&taxaCalc!=="…")await calcular();
    const{error}=await sb.rpc("encomenda_criar",{lj:cart.loja,its:it.map(x=>({id:x.id,qtd:x.qtd})),ende:end+(cep.length===8?` · CEP ${cep.slice(0,5)}-${cep.slice(5)}`:""),brr:bairro,
      lat:geo?geo.lat:null,lng:geo?geo.lng:null,tel:$("ek-tel").value.trim()||null,ob:$("ek-obs").value.trim()||null});
    if(error)throw error;
    cart={loja:null,q:{}};$("ek-obs").value="";$("enc-ck").hidden=true;$("vitrine").hidden=false;encQtd();
    toast("Pedido enviado! Avisamos quando a loja aceitar.");await encLoad();go("pedidos");
  }catch(err){toast(await erroDe(err))}
  finally{b.disabled=false;b.textContent="Fazer pedido"}
};

/* ================= CLIENTE: acompanhar as compras ================= */
let minhasEnc=[],lojaEnc=[];
const PASSOS=["Pedido","Loja aceitou","Pago","A caminho","Entregue"];
function passoDe(e){if(e.status==="nova")return 0;if(e.status==="aceita")return 1;if(e.status==="paga")return 2;
  if(e.status==="enviada")return e.corrida_status==="entregue"?4:e.corrida_status==="coletada"?3:2;return -1}
function textoCli(e){
  const ent=esc(e.entregador_nome||"O entregador");
  return {nova:"Esperando a loja aceitar…",aceita:"A loja aceitou! Pague no Pix pra ela começar a preparar.",paga:"Pago ✓ A loja está preparando e vai chamar o entregador.",
    recusada:`A loja não pôde aceitar${e.motivo?": "+esc(e.motivo):""}. Nada foi cobrado.`,cancelada:"Você cancelou esse pedido. Nada foi cobrado.",devolvida:"A loja devolveu seu Pix. O dinheiro volta pra sua conta.",
    enviada:{aberta:"A loja chamou um entregador. Procurando quem leve…",aceita:`${ent} está indo buscar na loja.`,coletada:`Saiu pra entrega com ${ent}. Já está a caminho!`,entregue:"Entregue ✓ Bom proveito!",cancelada:"A entrega foi cancelada. Fale com a loja."}[e.corrida_status]||"A caminho"}[e.status]||"";
}
function cliRender(){
  const w=$("enc-cli");if(!w)return;const lista=minhasEnc.filter(e=>!["cancelada","recusada","devolvida"].includes(e.status)||Date.now()-new Date(e.created_at)<864e5);
  w.hidden=!lista.length;if(!lista.length)return;
  w.innerHTML=`<div class="eyebrow">Compras nas lojas</div>`+lista.map(e=>{
    const p=passoDe(e),k=contaCompra(e.subtotal,e.taxa),fim=["cancelada","recusada","devolvida"].includes(e.status);
    return `<div class="card stack enc-c${fim?" fim":""}">
      <div class="row" style="justify-content:space-between;gap:8px"><b data-ln="${e.id}"></b><span class="num">${brl(e.total?Number(e.total):k.total)}</span></div>
      <p class="hint" style="margin:0">${linhaItens(e.itens)} · entrega em ${esc(e.entrega_bairro)}</p>
      ${p>=0?`<ol class="enc-passos">${PASSOS.map((t,i)=>`<li class="${i<p?"ok":i===p?"agora":""}"><i></i>${t}</li>`).join("")}</ol>`:""}
      <p class="enc-st">${textoCli(e)}</p>
      ${e.status==="aceita"?`<div class="mp-box"><div class="mp-linhas"><span>Produtos</span><span class="num">${brl(Number(e.subtotal))}</span><span>Entrega</span><span class="num">${brl(Number(e.taxa||0))}</span><span>Taxa de serviço (6% + Pix)</span><span class="num">${brl(k.servico)}</span><b>Total</b><b class="num">${brl(k.total)}</b></div>
        <button class="btn full" type="button" data-encpagar="${e.id}">Pagar ${brl(k.total)} no Pix</button><p class="hint" style="margin:0;font-size:12px">Abre o Mercado Pago, você paga no Pix e volta pro Cadernex.</p></div>`:""}
      ${["nova","aceita"].includes(e.status)?`<button class="link" type="button" data-enccanc="${e.id}" style="align-self:center">Cancelar pedido</button>`:""}
    </div>`}).join("");
  lista.forEach(e=>{const b=w.querySelector(`[data-ln="${e.id}"]`);if(b)b.textContent=e.loja_nome||"Loja"});
}
document.addEventListener("click",async e=>{
  const pg=e.target.closest("[data-encpagar]");
  if(pg){pg.disabled=true;const t=pg.textContent;pg.textContent="Abrindo o Mercado Pago…";
    const{data,error}=await sb.functions.invoke("mp-compra",{body:{acao:"pagar",id:pg.dataset.encpagar}});
    if(error||!data||!data.url){pg.disabled=false;pg.textContent=t;toast(await erroDe(error,data));return}
    location.href=data.url;return}
  const cc=e.target.closest("[data-enccanc]");
  if(cc){if(cc.dataset.ok!=="1"){cc.dataset.ok="1";cc.textContent="Toque de novo pra cancelar";return}
    const{error}=await sb.rpc("encomenda_mudar",{eid:cc.dataset.enccanc,acao:"cancelar"});if(error){toast(await erroDe(error));return}
    toast("Pedido cancelado");encLoad()}
});
if(/#compra/.test(location.hash)){history.replaceState(null,"",location.pathname);setTimeout(()=>{toast("Pagamento enviado! Assim que o Pix cair, a loja é avisada.");if(typeof go==="function")go("pedidos")},800)}

/* ================= LOJA: pedidos que chegam pelo app ================= */
const vistos=new Set();let primeira=true;
const ehLoja=()=>!!(perfil.loja&&perfil.loja_nome);
function mpRender(){const w=$("enc-mp");if(!w)return;w.hidden=!ehLoja()||window.mpConectado!==false}
document.addEventListener("cx-mp",mpRender);
$("enc-mp-btn").onclick=()=>window.mpConectar?window.mpConectar():go("config");
function textoLoja(e){
  if(e.status==="enviada"){const c=(typeof minhas!=="undefined"?minhas:[]).find(x=>x.id===e.corrida_id);
    const s=c?c.status:"aberta",n=esc(c&&c.entregador_nome||"Entregador");
    return {aberta:"Corrida chamada. Procurando entregador…",aceita:`${n} está vindo buscar.`,coletada:`${n} saiu pra entrega.`,entregue:"Entregue ✓",cancelada:"A corrida foi cancelada."}[s]||""}
  return {nova:"",aceita:"Esperando o cliente pagar no Pix…",paga:"",recusada:"Você recusou.",cancelada:"O cliente cancelou.",devolvida:"Pix devolvido ao cliente."}[e.status]||"";
}
function lojaRender(){
  const w=$("enc-loja");if(!w)return;mpRender();
  const lista=lojaEnc.filter(e=>["nova","aceita","paga"].includes(e.status)||Date.now()-new Date(e.created_at)<864e5);
  window.encCorridas=new Set(lojaEnc.filter(e=>e.corrida_id).map(e=>e.corrida_id));
  w.hidden=!ehLoja()||(!lista.length&&window.mpConectado===false);if(w.hidden)return;
  const novos=lista.filter(e=>e.status==="nova").length;$("enc-lj-n").textContent=novos?`${novos} novo${novos>1?"s":""}`:"";$("enc-lj-n").hidden=!novos;
  $("enc-lj-lista").innerHTML=lista.length?lista.map(e=>{
    const sug=e.taxa!=null?Number(e.taxa):e.km?Math.max(BASE_E,r2(BASE_E+POR_KM_E*Number(e.km))):null,fim=["cancelada","recusada","devolvida"].includes(e.status);
    return `<div class="enc-c lote-l${e.status==="nova"?" novo":""}${fim?" fim":""}" data-enc="${e.id}">
      <div class="row" style="justify-content:space-between;gap:8px"><b data-cn></b><span class="num">${brl(Number(e.subtotal))}</span></div>
      <p style="margin:0">${linhaItens(e.itens)}</p>
      <p class="hint" style="margin:0">Entrega em ${esc(e.entrega_bairro)}${e.km?` · ${String(e.km).replace(".",",")} km`:""}${e.obs?` · “${esc(e.obs)}”`:""}</p>
      ${e.status==="nova"?`<label>Taxa de entrega (R$)<input inputmode="decimal" data-tx value="${sug!=null?String(sug.toFixed(2)).replace(".",","):""}" placeholder="ex.: 9,00"></label>
        <div class="pf-nav"><button class="btn ghost" type="button" data-encrec>Recusar</button><button class="btn" type="button" data-encok>Aceitar</button></div>
        <div class="chips" data-mots hidden>${["Sem estoque","Fechado agora","Fora da área de entrega"].map(m=>`<button type="button" class="chip" data-mot="${m}">${m}</button>`).join("")}</div>`:""}
      ${e.status==="paga"?`<div class="mp-pago">💰 Pago ✓ ${brl(r2(Number(e.subtotal)+Number(e.taxa||0)))} na sua conta Mercado Pago</div>
        <p class="hint" style="margin:0">Entregar em: <span data-ee></span>${e.contato?` · <span data-et></span>`:""}</p>
        <button class="btn full" type="button" data-encchamar>Chamar entregador · ${brl(Number(e.taxa||0))}</button>
        <button class="link" type="button" data-encdev style="align-self:center">Não vou conseguir entregar: devolver o Pix</button>`:""}
      ${textoLoja(e)?`<p class="enc-st">${textoLoja(e)}</p>`:""}
      ${e.status==="aceita"?`<button class="link" type="button" data-encrec2 style="align-self:center">Cancelar pedido</button>`:""}
    </div>`}).join(""):`<p class="hint" style="margin:0">Quando um cliente comprar na sua loja pelo app, o pedido aparece aqui e o celular toca.</p>`;
  lista.forEach(e=>{const el=$("enc-lj-lista").querySelector(`[data-enc="${e.id}"]`);if(!el)return;el.querySelector("[data-cn]").textContent=e.cliente_nome||"Cliente";
    const ee=el.querySelector("[data-ee]");if(ee)ee.textContent=e.entrega_end;const et=el.querySelector("[data-et]");if(et)et.textContent=e.contato});
}
$("enc-lj-lista").addEventListener("click",async ev=>{
  const card=ev.target.closest("[data-enc]");if(!card)return;const id=card.dataset.enc,e=lojaEnc.find(x=>x.id===id);if(!e)return;
  const t=ev.target;
  if(t.closest("[data-encrec]")){card.querySelector("[data-mots]").hidden=false;toast("Escolha o motivo");return}
  const mot=t.closest("[data-mot]");
  if(mot||t.closest("[data-encrec2]")){const b=t.closest("button");if(!mot&&b.dataset.ok!=="1"){b.dataset.ok="1";b.textContent="Toque de novo pra cancelar";return}
    const{error}=await sb.rpc("encomenda_mudar",{eid:id,acao:"recusar",mot:mot?mot.dataset.mot:"A loja cancelou"});if(error){toast(await erroDe(error));return}
    toast("Pedido recusado. O cliente foi avisado.");encLoad();return}
  if(t.closest("[data-encok]")){const tx=num(card.querySelector("[data-tx]").value);
    if(!(tx>=BASE_E)){toast(`Coloque a taxa de entrega (mínimo ${brl(BASE_E)})`);return}
    const b=t.closest("button");b.disabled=true;
    const{error}=await sb.rpc("encomenda_mudar",{eid:id,acao:"aceitar",tx});b.disabled=false;if(error){toast(await erroDe(error));return}
    toast("Aceito! O cliente vai pagar no Pix. Você é avisado quando cair.");encLoad();return}
  if(t.closest("[data-encchamar]")){const b=t.closest("button");b.disabled=true;b.textContent="Chamando…";
    try{
      const item=`Pedido de ${e.cliente_nome||"cliente"}: ${(e.itens||[]).map(i=>`${i.qtd}x ${i.nome}`).join(", ")}`.slice(0,120);
      const{data,error}=await sb.from("corridas").insert({coleta_bairro:perfil.loja_bairro||"Loja",entrega_bairro:e.entrega_bairro,item:item.length>=2?item:"Pedido da loja",valor:Number(e.taxa),veiculo:"qualquer",distancia_km:e.km}).select().single();if(error)throw error;
      const r=await sb.from("corridas_det").insert({corrida_id:data.id,coleta_end:perfil.loja_end,entrega_end:e.entrega_end,contato:e.contato||null,
        obs:("JÁ PAGO PELO APP: não cobre nada do cliente."+(e.obs?" "+e.obs:"")).slice(0,200),entrega_lat:e.entrega_lat,entrega_lng:e.entrega_lng});
      if(r.error){await sb.rpc("mudar_corrida",{cid:data.id,acao:"cancelar"});throw r.error}
      const m=await sb.rpc("encomenda_mudar",{eid:id,acao:"chamar",cid:data.id});
      if(m.error){await sb.rpc("mudar_corrida",{cid:data.id,acao:"cancelar"});throw m.error}
      toast("Entregador chamado! Os motoqueiros perto já foram avisados.");if(typeof corrLoad==="function")await corrLoad();encLoad();
    }catch(err){b.disabled=false;b.textContent=`Chamar entregador · ${brl(Number(e.taxa||0))}`;toast(await erroDe(err))}
    return}
  if(t.closest("[data-encdev]")){const b=t.closest("button");if(b.dataset.ok!=="1"){b.dataset.ok="1";b.textContent="Toque de novo pra devolver o Pix ao cliente";return}
    b.disabled=true;const{data,error}=await sb.functions.invoke("mp-compra",{body:{acao:"devolver",id}});b.disabled=false;
    if(error||!data||!data.ok){toast(await erroDe(error,data));return}toast("Pix devolvido ao cliente.");encLoad()}
});

/* ---------- carregar, avisar e manter em dia ---------- */
async function encLoad(){
  if(!sb||!uid)return;
  if(perfil.tipo==="cliente"&&!ehLoja()){const r=await sb.rpc("minhas_encomendas");if(!r.error){minhasEnc=r.data||[];cliRender()}}
  if(ehLoja()){const r=await sb.from("encomendas").select("*").eq("loja_id",uid).order("created_at",{ascending:false}).limit(30);
    if(!r.error){lojaEnc=r.data||[];
      const novos=lojaEnc.filter(e=>e.status==="nova"&&!vistos.has(e.id)),pagos=lojaEnc.filter(e=>e.status==="paga"&&!vistos.has(e.id+":paga"));
      if(!primeira){
        if(novos.length){window.cxSom&&cxSom(4);try{navigator.vibrate&&navigator.vibrate([300,120,300])}catch(x){}toast(`🔔 Pedido novo de ${novos[0].cliente_nome||"cliente"}!`);
          if(document.hidden&&window.cxNotificar)cxNotificar(`Pedido novo · ${brl(Number(novos[0].subtotal))}`,`${novos[0].cliente_nome}: ${qtdItens(novos[0].itens)} itens · ${novos[0].entrega_bairro}`,"enc-"+novos[0].id)}
        else if(pagos.length){window.cxSom&&cxSom(2);toast("💰 Cliente pagou! Chame o entregador.")}
      }
      lojaEnc.forEach(e=>{vistos.add(e.id);if(e.status==="paga")vistos.add(e.id+":paga")});primeira=false;lojaRender()}}
  sub();
}
window.encLoad=encLoad;
let canal=null;
function sub(){if(canal||!sb.channel)return;canal=sb.channel("encomendas").on("postgres_changes",{event:"*",schema:"public",table:"encomendas"},()=>encLoad()).subscribe()}
setInterval(()=>{if(!uid)return;if(ehLoja()||minhasEnc.some(e=>["nova","aceita","paga","enviada"].includes(e.status)&&e.corrida_status!=="entregue"))encLoad()},20000);
if(typeof corrRender==="function"){const _r=corrRender;corrRender=function(){_r();if(ehLoja())lojaRender()}}
if(typeof go==="function"){const g=go;go=function(v){g(v);if(v==="pedidos"||v==="loja")encLoad();if(v==="lojas")barRender();else{const b=$("enc-bar");if(b)b.hidden=true}}}
const _al=window.agendaLoad;window.agendaLoad=async()=>{await _al();encLoad()};
if(uid)setTimeout(encLoad,0);
})();
