/* Cadernex — Promotores de lojas: quem cadastra uma loja ganha 2% da taxa do Cadernex sobre tudo que ela movimenta pelo app,
   durante 24 meses a partir do cadastro de cada loja.
   - Tela "Promotor de lojas": link e código pra divulgar, lojas cadastradas, quanto ganhou e quanto já recebeu.
   - Loja: entra pelo link (…/?p=CÓDIGO) ou coloca o código em "Informações da loja". Vínculo é uma vez só.
   - Saque: o promotor pede o saque do saldo uma vez por semana; o moderador faz o Pix e marca como pago. */
(function(){
const el=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const data=d=>d?new Date(d).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"2-digit"}):"—";
const SITE="https://cadernex.com.br/";
const KEY="cx-promo";
const pct=t=>String(Math.round((Number(t)||0.02)*1000)/10).replace(".",",")+"%";
const linkDe=c=>`${SITE}?p=${encodeURIComponent(c)}#pedir`;
const APRES="apresentacao-lojistas.pdf",ARTES=["promotor-flyer-1.jpg","promotor-flyer-2.jpg"];
// compartilha uma arte (imagem) pelo compartilhar do celular; se não der, manda o link pelo WhatsApp
async function enviarArte(i,cod){
  const txt=`Quer ganhar cadastrando lojas no Cadernex? Ganhe 2% do que o Cadernex recebe de cada loja, por 24 meses. Saiba mais: ${SITE}promotores.html`;
  try{
    const r=await fetch(ARTES[i]);if(!r.ok)throw new Error("arte");
    const f=new File([await r.blob()],`Cadernex-promotor-${i+1}.jpg`,{type:"image/jpeg"});
    if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],text:txt,title:"Seja promotor Cadernex"});return}
  }catch(e){if(e&&e.name==="AbortError")return}
  open(`https://wa.me/?text=${encodeURIComponent(txt)}`,"_blank","noopener");
}
// manda o PDF de apresentação: no celular, abre o compartilhar do sistema (WhatsApp) com o arquivo; se não der, manda o link
async function enviarApresentacao(cod){
  const link=linkDe(cod),txt=`Oi! Segue a apresentação do Cadernex: entregas sem diária, você só paga quando tem entrega. Cadastre sua loja grátis: ${link} (código do promotor: ${cod})`;
  try{
    const r=await fetch(APRES,{cache:"no-store"});if(!r.ok)throw new Error("pdf");
    const f=new File([await r.blob()],"Cadernex-para-lojas.pdf",{type:"application/pdf"});
    if(navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],text:txt,title:"Cadernex para lojas"});return}
  }catch(e){if(e&&e.name==="AbortError")return}
  open(`https://wa.me/?text=${encodeURIComponent(txt+"\n\nApresentação: "+SITE+APRES)}`,"_blank","noopener");
}
const limpa=c=>String(c||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,12);
const ehLoja=()=>!!(perfil.loja&&String(perfil.loja_nome||"").trim());

/* ---------- código que veio no link ---------- */
try{const c=limpa(new URLSearchParams(location.search).get("p"));if(c)localStorage.setItem(KEY,c)}catch(e){}
const guardado=()=>{try{return localStorage.getItem(KEY)||""}catch(e){return""}};
const esquece=()=>{try{localStorage.removeItem(KEY)}catch(e){}};

const ERROS={codigo:"Esse código de promotor não existe. Confira as letras.",proprio:"Você não pode ser promotor da sua própria loja.",
  ja_vinculada:"Sua loja já tem um promotor.",semana:"Você já sacou esta semana. Tente de novo na data indicada.",minimo:"Saldo abaixo do mínimo para saque.",saque_aberto:"Você já tem um saque esperando o Pix.",saque:"Esse saque já foi resolvido.",nao_loja:"Salve o nome da loja primeiro.",pix:"Coloque uma chave Pix válida.",bloqueado:"Sua conta está em análise.",admin:"Só o moderador.",
  loja_existe:"Essa loja já usa o Cadernex (mesmo WhatsApp ou CNPJ).",outro_promotor:"Outro promotor já cadastrou essa loja.",repetida:"Você já cadastrou essa loja.",
  falta_nome:"Coloque o nome da loja.",falta_responsavel:"Coloque o nome do responsável.",falta_rua:"Coloque a rua.",falta_numero:"Coloque o número.",falta_bairro:"Coloque o bairro.",falta_cidade:"Coloque a cidade.",falta_uf:"Coloque o estado (UF).",
  whats:"WhatsApp com DDD, ex.: (62) 99999-9999.",cep:"CEP com 8 números.",cnpj:"CNPJ inválido.",nao_apaga:"Essa loja já foi ativada.",
  convite_usado:"Esse convite já foi usado por outra conta.",
  dados_nome:"Coloque seu nome completo (nome e sobrenome).",dados_cpf_usado:"Esse CPF já está cadastrado em outra conta de promotor.",dados_cpf:"CPF com 11 números.",
  dados_idade:"Para ser promotor é preciso ter 18 anos ou mais.",dados_whats:"WhatsApp com DDD, ex.: (62) 99999-9999.",dados_cidade:"Coloque sua cidade.",dados_uf:"Escolha seu estado.",
  dados_termos:"Para continuar, aceite o Termo do Promotor Autônomo.",dados_faltam:"Complete seus dados de promotor.",saldo_sacar:"Antes de sair, saque o seu saldo.",
  selfie_falta:"Tire sua selfie para continuar.",
  loja_promotor:"Conta de loja não pode ser promotor. Para ser promotor, use outra conta, sem loja.",loja_duplicada:"Já existe uma loja no Cadernex com esse WhatsApp ou CNPJ. Cada loja tem uma conta só.",convite:"Convite não encontrado. Peça um novo ao promotor."};
const erroDe=e=>{const m=String(e?.message||"");for(const k in ERROS)if(m.includes(k))return ERROS[k];return"Não deu certo agora. Confira a internet e tente de novo."};

/* ---------- loja: vínculo com o promotor ---------- */
let meuPromotor=null;
async function vincular(cod,avisa){
  cod=limpa(cod);if(!cod||!sb||!uid||!ehLoja()||perfil.indicado_por)return false;
  const r=await sb.rpc("promotor_vincular",{cod});
  if(r.error){if(/ja_vinculada|proprio|codigo/.test(r.error.message||""))esquece();if(avisa)toast(erroDe(r.error));return false}
  esquece();meuPromotor=r.data;
  const p=await sb.from("perfis").select("indicado_por,indicado_em").eq("user_id",uid).maybeSingle();
  if(!p.error&&p.data)Object.assign(perfil,p.data);lojaRender();toast(`Loja cadastrada pelo promotor ${r.data}`);return true;
}
function lojaRender(){
  document.querySelectorAll('[data-go="promotor"]').forEach(b=>{b.hidden=ehLoja()&&!perfil.promotor});
  const w=el("lj-promo-w");if(!w)return;
  if(perfil.indicado_por){w.innerHTML=`<p class="hint" style="margin:0">Loja cadastrada pelo promotor <b>${esc(meuPromotor||"…")}</b>.</p>`;
    if(!meuPromotor&&sb&&uid)sb.rpc("promotor_meu").then(r=>{if(!r.error&&r.data){meuPromotor=r.data;lojaRender()}});return}
  if(!w.querySelector("#lj-promo"))w.innerHTML=`<label>Código do promotor <small class="hint" style="font-weight:400">(opcional: quem te apresentou o Cadernex)</small><input type="text" id="lj-promo" maxlength="12" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="ex.: K7M2QX"></label>`;
  const i=el("lj-promo");if(i&&!i.value&&document.activeElement!==i)i.value=guardado();
}
document.addEventListener("input",e=>{if(e.target.id==="lj-promo")e.target.value=limpa(e.target.value)});
// depois que a loja salva as informações, faz o vínculo com o código digitado ou do link
const _sp=savePerfil;savePerfil=async function(patch){
  try{await _sp(patch)}catch(e){const m=String(e?.message||"");if(/loja_duplicada|loja_promotor/.test(m))e.cxMsg=erroDe(e);throw e}
  if(ehLoja()&&!perfil.indicado_por){const c=el("lj-promo")?.value||guardado();if(c)await vincular(c,!!el("lj-promo")?.value)}};

/* ---------- tela do promotor ---------- */
let painel=null,carregando=false,meusDados=null,selfieOk=null,selfieArq=null,pendentes=[],cadAberto=false,recemConvite=null;
async function carregar(){
  if(!sb||!uid||carregando)return;carregando=true;
  try{const r=await sb.rpc("promotor_painel");painel=r.error?{erro:true}:r.data;
    const dd=await sb.rpc("promotor_meus_dados");meusDados=dd.error?null:dd.data;
    if(window.cxSelfie)selfieOk=await cxSelfie.tem();
    if(painel?.promotor){const q=await sb.from("promotor_lojas").select("id,nome,responsavel,whats,bairro,convite,criado_em").eq("status","pendente").order("criado_em",{ascending:false});pendentes=q.error?[]:q.data||[]}
  }finally{carregando=false}
  pinta();
}
function pinta(){
  const w=el("pm-corpo");if(!w)return;
  if(cadAberto){if(!el("pm-cad")){w.innerHTML=formHTML();scrollTo(0,0)}return}
  if(!painel){w.innerHTML=`<p class="hint">Carregando…</p>`;return}
  if(painel.erro){w.innerHTML=`<div class="card"><p class="hint" style="margin:0">Não deu pra carregar agora. Confira a internet.</p></div>`;return}
  if(!painel.promotor&&ehLoja()){w.innerHTML=`<div class="card stack"><h2>Conta de loja</h2><p style="margin:0">Esta conta é da loja <b>${esc(perfil.loja_nome)}</b>. Cada loja tem uma conta só, e conta de loja não pode ser promotor.</p><p class="hint" style="margin:0">Quer ser promotor e cadastrar várias lojas? Crie outra conta escolhendo “Promover”, com outro e-mail.</p></div>`;return}
  if(!painel.promotor){w.innerHTML=`
    <div class="card stack pm-intro">
      <h2>Ganhe cadastrando lojas</h2>
      <p style="margin:0">Apresente o Cadernex pra farmácias, restaurantes e lojas do seu bairro. Cada loja que se cadastrar com o seu código te rende <b>${pct(0.02)} de tudo que o Cadernex recebe dela durante 24 meses</b>, em cada entrega que ela pede e paga pelo app.</p>
      <ul class="pm-passos"><li>Você recebe um link e um código só seus.</li><li>A loja cria a conta pelo link ou coloca o código em “Informações da loja”.</li><li>Cada loja rende comissão por <b>24 meses</b> a partir do cadastro. A 1ª entrega de cada loja é da fidelidade com o Cadernex: você ganha a partir da 2ª.</li><li>Toda semana você pode sacar o saldo, que cai por Pix na sua chave.</li></ul>
      <p class="hint" style="margin:0">Exemplo: se o Cadernex recebe R$ 500 em taxas das suas lojas no mês, você ganha R$ 10. Quanto mais lojas, mais soma.</p>
    </div>
    ${dadosForm(meusDados,true)}`;return}
  const p=painel,disp=Number(p.disponivel)||0,pend=(p.saques||[]).find(x=>x.status==="pedido"),link=linkDe(p.codigo);
  const msg=`Oi! Sua loja já faz entregas pelo Cadernex? Motoboys e bikes da região, pagamento por Pix, sem mensalidade. Cadastre aqui: ${link} (ou use o código ${p.codigo})`;
  const prox=p.proximo?new Date(p.proximo):null,podeSemana=prox&&prox<=new Date(),min=Number(p.minimo)||5;
  const semDados=meusDados&&!meusDados.completo;
  const saque=semDados?`<button class="btn full" type="button" data-pmdados>Complete seus dados para sacar</button>`:selfieOk===false?`<button class="btn full" type="button" data-pmdados>Tire sua selfie para sacar</button>`:pend?`<div class="pm-aviso"><b>Saque de ${brl(Number(pend.valor))} pedido em ${data(pend.pedido)}</b><span>O Pix vai para ${esc(pend.pix)}. Avisamos aqui quando cair.</span></div>`
    :!podeSemana?`<button class="btn full" type="button" disabled>Próximo saque em ${data(prox)}</button>`
    :disp<min?`<button class="btn full" type="button" disabled>Saque a partir de ${brl(min)}</button>`
    :`<button class="btn full" type="button" data-pmsaca>Sacar ${brl(disp)} no Pix</button>`;
  w.innerHTML=`
    <div class="card hero pm-hero stack">
      <span class="eyebrow">Disponível pra sacar</span><b class="big num">${brl(disp)}</b>
      <div class="pm-tot"><div><b class="num">${brl(Number(p.mes))}</b><span>Este mês</span></div><div><b class="num">${brl(Number(p.ganho))}</b><span>Total ganho</span></div><div><b class="num">${p.lojas.length}</b><span>Loja${p.lojas.length==1?"":"s"}</span></div></div>
      ${saque}
      <p class="hint" style="margin:0">Você ganha ${pct(p.taxa)} da taxa do Cadernex sobre o que cada loja paga pelo app, a partir da 2ª entrega (a 1ª é da fidelidade com o Cadernex), por ${p.meses||24} meses desde o cadastro dela. Um saque por semana, a partir de ${brl(min)}, na chave Pix <b>${esc(p.pix)}</b>.</p>
    </div>
    ${recemConvite?conviteHTML(recemConvite,true):""}
    <div class="card stack pm-nova">
      <h2>Cadastrar loja</h2>
      <p class="hint" style="margin:0">Está na loja? Preencha os dados com o dono ou gerente. Depois mande o convite: a loja cria a senha e já entra pronta, ligada a você.</p>
      <button class="btn full" type="button" data-pmnova>+ Cadastrar nova loja</button>
      ${pendentes.length?`<b>Esperando a loja ativar</b><div class="stack" style="gap:8px">${pendentes.map(l=>`<div class="adm-it"><div class="cad-l1"><span class="t">${esc(l.nome)}</span><span class="cad-tp">Pendente</span></div>
        <div class="s">${esc(l.responsavel)} · ${esc(l.bairro)} · cadastrada em ${data(l.criado_em)}</div>
        <div class="grid2"><a class="btn" target="_blank" rel="noopener" href="${zapConvite(l)}">Reenviar convite</a><button class="btn ghost" type="button" data-pmapaga="${l.id}">Apagar</button></div></div>`).join("")}</div>`:""}
    </div>
    <div class="card stack">
      <h2>Seu link de promotor</h2>
      <div class="pm-cod"><span class="eyebrow">Código</span><b class="num">${esc(p.codigo)}</b></div>
      <div class="pm-link">${esc(link)}</div>
      <div class="grid2"><button class="btn ghost" type="button" data-pmcopia>Copiar link</button><a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(msg)}">Mandar no WhatsApp</a></div>
      <p class="hint" style="margin:0">Na loja, peça pra criar a conta pelo link. Se a loja já tem conta, ela coloca o código em Perfil → Informações da loja.</p>
    </div>
    <div class="card stack">
      <h2>Apresentação para a loja</h2>
      <p class="hint" style="margin:0">PDF com as vantagens, o preço e as regras do Cadernex. Mande para o dono ou gerente: a mensagem já vai com o seu link e o seu código <b>${esc(p.codigo)}</b>.</p>
      <div class="grid2"><a class="btn ghost" href="${APRES}" target="_blank" rel="noopener" download="Cadernex-para-lojas.pdf">Baixar PDF</a><button class="btn" type="button" data-pmpdf>Enviar no WhatsApp</button></div>
    </div>
    <div class="card stack">
      <h2>Artes para divulgar</h2>
      <p class="hint" style="margin:0">Poste no status, no Instagram ou mande nos grupos para chamar mais promotores. A mensagem vai com o link da página de promotores.</p>
      <div class="pm-artes">${ARTES.map((a,i)=>`<figure><img src="${a}" alt="Arte ${i+1}: Torne-se um promotor Cadernex" loading="lazy" width="796" height="1024"><figcaption class="grid2"><a class="btn ghost" href="${a}" download="Cadernex-promotor-${i+1}.jpg">Baixar</a><button class="btn" type="button" data-pmarte="${i}">Compartilhar</button></figcaption></figure>`).join("")}</div>
    </div>
    <div class="card stack">
      <h2>Suas lojas</h2>
      ${p.lojas.length?`<div class="stack" style="gap:8px">${p.lojas.map(l=>`<div class="adm-it"><div class="cad-l1"><span class="t">${esc(l.nome||"(sem nome)")}</span><b class="num">${brl(Number(l.comissao))}</b></div>
        <div class="s">${[esc(l.bairro),new Date(l.ate)>new Date()?`Comissão até ${data(l.ate)}`:`Prazo encerrado em ${data(l.ate)}`,l.mov?`${l.mov} entrega${l.mov==1?"":"s"} com comissão`:"Comissão começa na 2ª entrega paga pelo app"].filter(Boolean).join(" · ")}</div></div>`).join("")}</div>`
        :`<p class="hint" style="margin:0">Nenhuma loja ainda. Mande seu link pra primeira loja hoje.</p>`}
    </div>
    <div class="card stack">
      <h2>Seus saques</h2>
      ${(p.saques||[]).length?`<div class="stack" style="gap:6px">${p.saques.map(x=>`<div class="row"><span>${data(x.pago||x.pedido)} · ${{pedido:"Esperando o Pix",pago:"Pago",recusado:"Recusado"}[x.status]||x.status}${x.obs?` · ${esc(x.obs)}`:""}</span><b class="num">${brl(Number(x.valor))}</b></div>`).join("")}</div>
        <p class="hint" style="margin:0">Total recebido: ${brl(Number(p.pago))}</p>`
        :`<p class="hint" style="margin:0">Nenhum saque ainda.</p>`}
    </div>
    ${dadosForm(meusDados,false)}
    <div class="card stack" id="pm-priv">
      <h2>Privacidade</h2>
      <p class="hint" style="margin:0">Seu CPF, nascimento e chave Pix só você e o moderador do Cadernex veem. As lojas veem só o seu primeiro nome. Você vê das suas lojas só o nome, o bairro e quanto rendeu, nunca os clientes delas.</p>
      <div class="rg-links"><a class="link" href="termo-promotor.html" target="_blank" rel="noopener">Termo do Promotor Autônomo</a><a class="link" href="privacidade.html#promotores" target="_blank" rel="noopener">Política de privacidade</a></div>
      <button class="btn ghost full" type="button" data-pmexporta>Baixar uma cópia dos meus dados</button>
      <button class="link" type="button" data-pmsair style="align-self:center;color:var(--bad)">Sair do programa de promotor</button>
    </div>`;
}
document.addEventListener("change",e=>{if(e.target.id!=="pd-selfie")return;const f=e.target.files[0];if(!f||!/^image\//.test(f.type))return;
  selfieArq=f;const w=e.target.closest(".sf-w");if(w)w.outerHTML=selfieHTML()});
document.addEventListener("input",e=>{const t=e.target;if(t.id==="pd-cpf")t.value=cpfFmt(t.value);if(t.id==="pd-whats")t.value=telFmt(t.value)});
document.addEventListener("submit",e=>{if(e.target.id!=="pm-entrar")return;e.preventDefault();
  const v=id=>(el(id)?.value||"").trim(),foco=id=>{el(id)?.focus()};
  const pix=v("pm-pix"),nome=v("pd-nome").replace(/\s+/g," "),cpf=dgt(v("pd-cpf")),nasc=v("pd-nasc"),whats=dgt(v("pd-whats")),cidade=v("pd-cid"),uf=v("pd-uf");
  const tem=!!meusDados?.completo;
  if(nome.length<5||!nome.includes(" ")){toast("Coloque seu nome completo (nome e sobrenome)");return foco("pd-nome")}
  if(!tem&&cpf.length!==11){toast("CPF com 11 números");return foco("pd-cpf")}
  const n=nasc?new Date(nasc+"T12:00"):null,lim=new Date();lim.setFullYear(lim.getFullYear()-18);
  if(!n||isNaN(n)){toast("Coloque sua data de nascimento");return foco("pd-nasc")}
  if(n>lim){toast("Para ser promotor é preciso ter 18 anos ou mais");return foco("pd-nasc")}
  if(whats.length<10){toast("WhatsApp com DDD");return foco("pd-whats")}
  if(cidade.length<2){toast("Coloque sua cidade");return foco("pd-cid")}
  if(!uf){toast("Escolha seu estado");return foco("pd-uf")}
  if(pix.length<5){toast("Coloque sua chave Pix");return foco("pm-pix")}
  if(el("pd-termo")&&!el("pd-termo").checked){toast("Para continuar, aceite o Termo do Promotor Autônomo");return}
  if(!selfieOk&&!selfieArq){toast("Tire sua selfie para continuar");e.target.querySelector(".sf-w")?.scrollIntoView({behavior:"smooth",block:"center"});return}
  const dados={nome,cpf:tem?"":cpf,nasc,whats,cidade,uf,termos:el("pd-termo")?.checked?"1":""};
  const novo=!painel?.promotor,b=e.target.querySelector("button[type=submit]");b.disabled=true;
  (async()=>{if(selfieArq){const ok=window.cxSelfie&&await cxSelfie.enviar(selfieArq);if(!ok){b.disabled=false;return null}selfieArq=null;selfieOk=true}
    return sb.rpc("promotor_entrar",{pix,dados})})().then(async r=>{b.disabled=false;if(!r)return;if(r.error){toast(erroDe(r.error));return}
    perfil.promotor=true;await carregar();toast(novo?"Pronto! Agora é só divulgar seu link.":"Dados salvos")})});
document.addEventListener("click",e=>{
  if(e.target.closest("[data-pmselfie]")){const f=el("pd-selfie");f.value="";f.click();return}
  if(e.target.closest("[data-pmdados]")){el("pm-entrar")?.scrollIntoView({behavior:"smooth",block:"start"});setTimeout(()=>el("pd-nome")?.focus(),400);return}
  if(e.target.closest("[data-pmexporta]")){
    const copia={gerado_em:new Date().toISOString(),meus_dados:meusDados,codigo:painel?.codigo,chave_pix:painel?.pix,lojas:painel?.lojas,saques:painel?.saques,lojas_esperando_ativar:pendentes};
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(copia,null,2)],{type:"application/json"}));
    a.download=`meus-dados-promotor-cadernex-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);return}
  const sai=e.target.closest("[data-pmsair]");if(sai){
    if(sai.dataset.ok!=="1"){sai.dataset.ok="1";sai.textContent="Toque de novo: apaga seu Pix, WhatsApp e código, e suas lojas deixam de render comissão";return}
    sai.disabled=true;sb.rpc("promotor_sair").then(async r=>{sai.disabled=false;if(r.error){toast(erroDe(r.error));return}
      perfil.promotor=false;await carregar();toast("Você saiu do programa de promotor")});return}
  const sq=e.target.closest("[data-pmsaca]");
  if(sq){if(sq.dataset.ok!=="1"){sq.dataset.ok="1";sq.textContent=`Confirmar saque de ${brl(Number(painel.disponivel))}?`;return}
    sq.disabled=true;sb.rpc("promotor_sacar").then(async r=>{if(r.error){sq.disabled=false;toast(erroDe(r.error));await carregar();return}
      await carregar();toast(`Saque de ${brl(Number(r.data))} pedido. O Pix cai na sua chave.`)});return}
  if(e.target.closest("[data-pmpdf]")&&painel?.codigo){enviarApresentacao(painel.codigo);return}
  const ar=e.target.closest("[data-pmarte]");if(ar){enviarArte(Number(ar.dataset.pmarte),painel?.codigo);return}
  if(e.target.closest("[data-pmcopia]")&&painel?.codigo){const l=linkDe(painel.codigo);
    (navigator.clipboard?navigator.clipboard.writeText(l):Promise.reject()).then(()=>toast("Link copiado"),()=>{window.prompt("Copie o link:",l)})}
});

/* ---------- dados do promotor ---------- */
const UFS_P="AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");
const dgt=v=>String(v||"").replace(/\D/g,"");
const telFmt=t=>{t=dgt(t).slice(0,11);return t.length>10?t.replace(/(\d{2})(\d{5})(\d{0,4})/,"($1) $2-$3"):t.length>6?t.replace(/(\d{2})(\d{4})(\d{0,4})/,"($1) $2-$3"):t.length>2?t.replace(/(\d{2})(\d+)/,"($1) $2"):t};
const cpfFmt=c=>{c=dgt(c).slice(0,11);return c.replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})\.(\d{3})(\d)/,"$1.$2.$3").replace(/\.(\d{3})(\d{1,2})$/,".$1-$2")};
function cpfOk(c){c=dgt(c);if(c.length!==11||/^(\d)\1{10}$/.test(c))return false;
  const dv=n=>{let s=0;for(let i=0;i<n;i++)s+=+c[i]*(n+1-i);const r=s*10%11;return r===10?0:r};return dv(9)===+c[9]&&dv(10)===+c[10]}
function selfieHTML(){const ok=selfieOk||selfieArq;
  return `<div class="stack sf-w" style="gap:8px"><div class="eyebrow">Sua selfie (obrigatória)</div>
  <div class="sf-linha"><div class="sf-av" id="pd-sf-prev" aria-hidden="true">${selfieArq?`<img src="${URL.createObjectURL(selfieArq)}" alt="">`:ok?`<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="var(--good)" stroke-width="2.4"><path d="M5 12l5 5 9-10"/></svg>`:`<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>`}</div>
  <p class="hint" style="margin:0">${ok&&!selfieArq?"Selfie enviada ✓. Se quiser, tire outra.":"Foto do seu rosto, de frente, sem óculos escuros nem boné, com boa luz. Serve pra confirmar que é você."}</p></div>
  <button class="btn ghost full" type="button" data-pmselfie>${ok?"Tirar outra selfie":"Tirar selfie"}</button>
  <input type="file" id="pd-selfie" accept="image/*" capture="user" hidden></div>`}
function dadosForm(d,novo){d=d||{};const tem=!!d.completo,pix=painel?.pix||"";
  return `<form class="card stack" id="pm-entrar">
  <h2>${novo?"Seus dados de promotor":"Seus dados"}</h2>
  ${!novo&&!tem?`<p class="pm-aviso" style="margin:0"><b>Falta completar seus dados</b><span>Sem nome completo e CPF não dá pra fazer o Pix dos seus ganhos.</span></p>`:""}
  ${selfieHTML()}
  <label>Nome completo<input id="pd-nome" maxlength="80" autocomplete="name" value="${esc(d.nome||"")}"></label>
  <div class="grid2"><label>CPF${tem?`<input value="${esc(d.cpf)}" disabled>`:`<input id="pd-cpf" inputmode="numeric" autocomplete="off" placeholder="000.000.000-00">`}</label>
  <label>Nascimento<input id="pd-nasc" type="date" value="${esc(d.nasc||"")}"></label></div>
  <label>WhatsApp<input id="pd-whats" type="tel" inputmode="numeric" autocomplete="tel-national" value="${esc(telFmt(d.whats||""))}" placeholder="(62) 99999-9999"></label>
  <div class="pm-cid"><label>Cidade<input id="pd-cid" maxlength="60" value="${esc(d.cidade||"")}"></label><label>UF<select id="pd-uf"><option value=""></option>${UFS_P.map(u=>`<option${d.uf===u?" selected":""}>${u}</option>`).join("")}</select></label></div>
  <label>Chave Pix (pra receber)<input id="pm-pix" maxlength="120" autocomplete="off" spellcheck="false" value="${esc(pix)}" placeholder="CPF, celular, e-mail ou chave aleatória"></label>
  ${d.termos?`<p class="hint" style="margin:0">Termo do Promotor Autônomo aceito em ${data(d.termos)}.</p>`:`<label class="pm-aceite"><input type="checkbox" id="pd-termo"> <span>Li e aceito o <a href="termo-promotor.html" target="_blank" rel="noopener">Termo do Promotor Autônomo</a> e a <a href="privacidade.html#promotores" target="_blank" rel="noopener">Política de privacidade</a>. Sou maior de 18 anos e atuo por conta própria, sem vínculo de emprego.</span></label>`}
  <button class="btn ${novo?"":"ghost "}full" type="submit">${novo?"Quero ser promotor":"Salvar meus dados"}</button>
  ${tem?`<p class="hint" style="margin:0">O CPF não muda pelo app. Para corrigir, escreva para suporte@cadernex.com.br.</p>`:""}
</form>`}

/* ---------- promotor cadastra a loja ---------- */
const RAMOS=["Farmácia","Restaurante","Lanchonete","Pizzaria","Açaí e sorveteria","Mercado","Padaria","Loja de roupas","Pet shop","Loja","Outro"];
const UFS="AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(" ");
const dig=v=>String(v||"").replace(/\D/g,"");
const fmtTel=t=>{t=dig(t).slice(0,11);return t.length>10?t.replace(/(\d{2})(\d{5})(\d{0,4})/,"($1) $2-$3"):t.length>6?t.replace(/(\d{2})(\d{4})(\d{0,4})/,"($1) $2-$3"):t.length>2?t.replace(/(\d{2})(\d+)/,"($1) $2"):t};
const fmtCnpj=c=>{c=dig(c).slice(0,14);return c.replace(/^(\d{2})(\d)/,"$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/,"$1.$2.$3").replace(/\.(\d{3})(\d)/,".$1/$2").replace(/(\d{4})(\d)/,"$1-$2")};
function cnpjOk(c){c=dig(c);if(c.length!==14||/^(\d)\1{13}$/.test(c))return false;
  const calc=n=>{let s=0,p=n-7;for(let i=0;i<n;i++){s+=+c[i]*p--;if(p<2)p=9}const r=s%11;return r<2?0:11-r};return calc(12)===+c[12]&&calc(13)===+c[13]}
const prazo=(u,ms=8000)=>{const ac=new AbortController(),t=setTimeout(()=>ac.abort(),ms);return fetch(u,{signal:ac.signal,headers:{"Accept-Language":"pt-BR"}}).finally(()=>clearTimeout(t))};
async function cepBusca(c){try{const d=await (await prazo(`https://viacep.com.br/ws/${c}/json/`)).json();return d.erro?null:d}catch(e){return null}}
async function geoEndereco(q){try{const d=await (await prazo("https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q="+encodeURIComponent(q))).json();return d[0]?{lat:+d[0].lat,lng:+d[0].lon}:null}catch(e){return null}}
const linkConvite=tk=>`${SITE}?l=${tk}#pedir`;
function zapConvite(l){const nome=String(l.responsavel||"").split(" ")[0];
  const t=`Oi${nome?", "+nome:""}! Cadastrei a ${l.nome} no Cadernex, o app de entregas com motoboys e bikes da região. Pra ativar, toque no link e crie a senha da loja (leva 1 minuto): ${linkConvite(l.convite)}`;
  return `https://wa.me/55${dig(l.whats)}?text=${encodeURIComponent(t)}`}
function conviteHTML(l,novo){return `<div class="card stack pm-ok">
  <b>${novo?"✓ Loja cadastrada: ":""}${esc(l.nome)}</b>
  <p class="hint" style="margin:0">Agora mande o convite para ${esc(l.responsavel)}. A loja toca no link, cria a senha e já entra com tudo preenchido e ligada a você. A comissão começa quando a loja ativar.</p>
  <a class="btn full" target="_blank" rel="noopener" href="${zapConvite(l)}">Mandar convite no WhatsApp da loja</a>
  <div class="pm-link">${esc(linkConvite(l.convite))}</div>
  <div class="grid2"><button class="btn ghost" type="button" data-pmcopconv="${esc(l.convite)}">Copiar link</button><button class="btn ghost" type="button" data-pmokfecha>Fechar</button></div></div>`}
let geoAtual=null;
function formHTML(){return `<form class="card stack" id="pm-cad" novalidate>
  <div class="cad-l1"><h2>Cadastrar loja</h2><button class="link" type="button" data-pmcancela>Cancelar</button></div>
  <p class="hint" style="margin:0">Campos com * são obrigatórios.</p>
  <b class="pm-sec">A loja</b>
  <label>Nome da loja *<input id="cl-nome" maxlength="60" autocomplete="off"></label>
  <label>Ramo<select id="cl-ramo"><option value="">Escolha</option>${RAMOS.map(r=>`<option>${r}</option>`).join("")}</select></label>
  <label>CNPJ <small class="hint" style="font-weight:400">(se tiver)</small><input id="cl-cnpj" inputmode="numeric" autocomplete="off" placeholder="00.000.000/0000-00"></label>
  <label>Horário de funcionamento<input id="cl-hora" maxlength="60" placeholder="ex.: seg a sáb, 8h às 20h"></label>
  <b class="pm-sec">Contato</b>
  <label>Nome do responsável *<input id="cl-resp" maxlength="80" autocomplete="off" placeholder="dono ou gerente"></label>
  <label>WhatsApp da loja *<input id="cl-whats" type="tel" inputmode="numeric" autocomplete="off" placeholder="(62) 99999-9999"><small class="hint" style="font-weight:400">O convite vai para este número.</small></label>
  <div class="grid2"><label>Telefone fixo<input id="cl-tel" type="tel" inputmode="numeric" autocomplete="off"></label>
  <label>E-mail<input id="cl-email" type="email" inputmode="email" autocomplete="off" autocapitalize="none"></label></div>
  <b class="pm-sec">Endereço</b>
  <label>CEP *<input id="cl-cep" inputmode="numeric" autocomplete="off" placeholder="00000-000"><small class="hint" id="cl-cepmsg" style="font-weight:400">Preenche a rua, o bairro e a cidade sozinho.</small></label>
  <label>Rua *<input id="cl-rua" maxlength="120"></label>
  <div class="grid2"><label>Número *<input id="cl-num" maxlength="20" inputmode="numeric"></label><label>Complemento<input id="cl-comp" maxlength="60" placeholder="sala, loja…"></label></div>
  <label>Bairro *<input id="cl-bairro" maxlength="60"></label>
  <div class="pm-cid"><label>Cidade *<input id="cl-cid" maxlength="60"></label><label>UF *<select id="cl-uf"><option value=""></option>${UFS.map(u=>`<option>${u}</option>`).join("")}</select></label></div>
  <b class="pm-sec">Localização no mapa</b>
  <div class="pm-geo" id="cl-geo"><span>Ainda sem localização. Se você está na loja, use o GPS. Se não, a gente acha pelo endereço ao salvar.</span></div>
  <button class="btn ghost full" type="button" data-pmgps>📍 Estou na loja: usar minha localização</button>
  <label>Observações<textarea id="cl-obs" maxlength="300" rows="2" placeholder="ex.: entrada pelos fundos, fala com a Maria"></textarea></label>
  <label class="pm-aceite"><input type="checkbox" id="cl-ok"> <span>O responsável pela loja autorizou este cadastro e vai receber o convite no WhatsApp.</span></label>
  <p class="hint" id="cl-msg" style="margin:0;color:var(--bad)"></p>
  <button class="btn full" type="submit" id="cl-salvar">Salvar loja e gerar convite</button>
</form>`}
function geoPinta(origem){const g=el("cl-geo");if(!g)return;
  g.innerHTML=geoAtual?`<span>✓ ${origem==="gps"?"Localização do GPS":"Achamos pelo endereço"}: ${geoAtual.lat.toFixed(5)}, ${geoAtual.lng.toFixed(5)}</span><a href="https://www.google.com/maps?q=${geoAtual.lat},${geoAtual.lng}" target="_blank" rel="noopener">Ver no mapa</a>`
    :`<span>Ainda sem localização.</span>`}
document.addEventListener("input",e=>{const t=e.target;if(!t.closest||!t.closest("#pm-cad"))return;
  if(t.id==="cl-whats"||t.id==="cl-tel")t.value=fmtTel(t.value);
  if(t.id==="cl-cnpj")t.value=fmtCnpj(t.value);
  if(["cl-rua","cl-num","cl-bairro","cl-cid","cl-cep"].includes(t.id)&&geoAtual?.origem==="endereco"){geoAtual=null;geoPinta()}
  if(t.id==="cl-cep"){const c=dig(t.value).slice(0,8);t.value=c.length>5?c.slice(0,5)+"-"+c.slice(5):c;
    if(c.length===8){el("cl-cepmsg").textContent="Buscando o CEP…";cepBusca(c).then(d=>{if(dig(el("cl-cep")?.value)!==c)return;
      if(!d){el("cl-cepmsg").textContent="CEP não encontrado. Confira ou preencha o endereço.";return}
      el("cl-cepmsg").textContent="✓ Endereço do CEP preenchido. Confira e coloque o número.";
      if(d.logradouro)el("cl-rua").value=d.logradouro;if(d.bairro)el("cl-bairro").value=d.bairro;
      el("cl-cid").value=d.localidade||"";el("cl-uf").value=d.uf||"";
      (d.logradouro?el("cl-num"):el("cl-rua")).focus()})}}
});
document.addEventListener("click",e=>{
  if(e.target.closest("[data-pmnova]")){cadAberto=true;geoAtual=null;recemConvite=null;pinta();return}
  if(e.target.closest("[data-pmcancela]")){cadAberto=false;pinta();return}
  if(e.target.closest("[data-pmokfecha]")){recemConvite=null;pinta();return}
  const cc=e.target.closest("[data-pmcopconv]");if(cc){const l=linkConvite(cc.dataset.pmcopconv);
    (navigator.clipboard?navigator.clipboard.writeText(l):Promise.reject()).then(()=>toast("Link do convite copiado"),()=>window.prompt("Copie o link:",l));return}
  const ap=e.target.closest("[data-pmapaga]");if(ap){if(ap.dataset.ok!=="1"){ap.dataset.ok="1";ap.textContent="Apagar mesmo?";return}
    sb.rpc("promotor_loja_apagar",{lid:Number(ap.dataset.pmapaga)}).then(async r=>{if(r.error){toast(erroDe(r.error));return}await carregar();toast("Cadastro apagado")});return}
  const gps=e.target.closest("[data-pmgps]");if(gps){
    if(!navigator.geolocation){toast("Esse celular não deu acesso ao GPS");return}
    gps.disabled=true;gps.textContent="Pegando a localização…";
    navigator.geolocation.getCurrentPosition(p=>{gps.disabled=false;gps.textContent="📍 Atualizar com minha localização";
      geoAtual={lat:p.coords.latitude,lng:p.coords.longitude,origem:"gps"};geoPinta("gps");
      if(p.coords.accuracy>150)toast("Localização pouco precisa. Se puder, vá pra perto da porta da loja e tente de novo.")},
      err=>{gps.disabled=false;gps.textContent="📍 Estou na loja: usar minha localização";
        toast(err.code===1?"Libere a localização para o Cadernex nas configurações do navegador.":"Não deu pra pegar a localização agora. Vamos usar o endereço.")},
      {enableHighAccuracy:true,timeout:15000,maximumAge:0});return}
});
document.addEventListener("submit",async e=>{if(e.target.id!=="pm-cad")return;e.preventDefault();
  const v=id=>(el(id)?.value||"").trim(),msg=el("cl-msg"),erro=(t,id)=>{msg.textContent=t;if(id)el(id).focus()};msg.textContent="";
  const d={nome:v("cl-nome"),ramo:v("cl-ramo"),cnpj:dig(v("cl-cnpj")),horario:v("cl-hora"),responsavel:v("cl-resp"),whats:dig(v("cl-whats")),
    telefone:dig(v("cl-tel")),email:v("cl-email"),cep:dig(v("cl-cep")),rua:v("cl-rua"),numero:v("cl-num"),complemento:v("cl-comp"),
    bairro:v("cl-bairro"),cidade:v("cl-cid"),uf:v("cl-uf"),obs:v("cl-obs")};
  if(d.nome.length<2)return erro("Coloque o nome da loja.","cl-nome");
  if(d.cnpj&&!cnpjOk(d.cnpj))return erro("CNPJ inválido. Confira ou deixe em branco.","cl-cnpj");
  if(d.responsavel.length<2)return erro("Coloque o nome do responsável.","cl-resp");
  if(d.whats.length<10)return erro("WhatsApp da loja com DDD, ex.: (62) 99999-9999.","cl-whats");
  if(d.telefone&&d.telefone.length<10)return erro("Telefone fixo com DDD, ou deixe em branco.","cl-tel");
  if(d.email&&!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email))return erro("E-mail inválido. Confira ou deixe em branco.","cl-email");
  if(d.cep.length!==8)return erro("CEP com 8 números.","cl-cep");
  if(d.rua.length<3)return erro("Coloque a rua.","cl-rua");
  if(!d.numero)return erro("Coloque o número (ou s/n).","cl-num");
  if(d.bairro.length<2)return erro("Coloque o bairro.","cl-bairro");
  if(d.cidade.length<2)return erro("Coloque a cidade.","cl-cid");
  if(!d.uf)return erro("Escolha o estado (UF).","cl-uf");
  if(!el("cl-ok").checked)return erro("Confirme que o responsável autorizou o cadastro.");
  const b=el("cl-salvar");b.disabled=true;
  try{
    if(!geoAtual){b.textContent="Achando a loja no mapa…";
      const q=[`${d.rua}, ${d.numero}, ${d.bairro}, ${d.cidade} - ${d.uf}`,`${d.rua}, ${d.cidade} - ${d.uf}`,`${d.bairro}, ${d.cidade} - ${d.uf}`];
      for(const x of q){const g=await geoEndereco(x+", Brasil");if(g){geoAtual={...g,origem:"endereco"};geoPinta("endereco");break}}}
    b.textContent="Salvando…";
    const r=await sb.rpc("promotor_loja_salvar",{d:{...d,lat:geoAtual?String(geoAtual.lat):"",lng:geoAtual?String(geoAtual.lng):"",geo:geoAtual?.origem||""}});
    if(r.error){erro(erroDe(r.error));return}
    recemConvite={nome:d.nome,responsavel:d.responsavel,whats:d.whats,convite:r.data.convite};
    cadAberto=false;await carregar();scrollTo(0,0);toast("Loja cadastrada! Mande o convite.");
  }finally{b.disabled=false;b.textContent="Salvar loja e gerar convite"}
});

/* ---------- a loja abre o convite ---------- */
const CONV="cx-convite";
try{const tk=String(new URLSearchParams(location.search).get("l")||"").toLowerCase().replace(/[^a-z0-9]/g,"");
  if(tk){localStorage.setItem(CONV,tk);const u=new URL(location.href);u.searchParams.delete("l");history.replaceState(history.state,"",u.pathname+u.search+u.hash)}}catch(e){}
const convite=()=>{try{return localStorage.getItem(CONV)||""}catch(e){return""}};
// antes de entrar: mostra de qual loja é o convite e já abre "Criar conta" como loja
setTimeout(async()=>{const tk=convite();if(!tk||uid||!sb||!el("a-tipo"))return;
  const r=await sb.rpc("promotor_convite_info",{tk});if(r.error||!r.data||r.data.status!=="pendente")return;
  el("a-tipo").querySelectorAll("[data-tipo]").forEach(x=>x.setAttribute("aria-checked",x.dataset.tipo==="cliente"));
  const l=document.querySelector("#s-auth .lead");if(l)l.textContent="Ative a conta da sua loja no Cadernex.";
  const tw=el("a-tipo-w");if(tw){tw.style.display="none";
    if(!el("cv-aviso"))tw.insertAdjacentHTML("beforebegin",`<div class="pm-convite" id="cv-aviso"><b>${esc(r.data.loja)}</b><span>Cadastrada no Cadernex por ${esc(r.data.promotor)}. Crie a senha para ativar: a loja já entra com nome, endereço e contato preenchidos. Se a loja já tem conta, toque em “Já tenho conta”.</span></div>`)}
  if(typeof setModo==="function")setModo("criar")},800);
let aceitando=false;
async function aceitar(){const tk=convite();if(!tk||!sb||!uid||aceitando||soPromo())return;aceitando=true;
  try{const r=await sb.rpc("promotor_loja_aceitar",{tk});
    if(r.error){const m=r.error.message||"";if(/convite|ja_vinculada|proprio/.test(m)){try{localStorage.removeItem(CONV)}catch(x){}toast(erroDe(r.error))}return}
    try{localStorage.removeItem(CONV)}catch(x){}
    const p=await sb.from("perfis").select("*").eq("user_id",uid).maybeSingle();if(!p.error&&p.data)Object.assign(perfil,p.data);
    if(r.data!=="ja_ativa"){meuPromotor=r.data;if(typeof aplicaPapel==="function")aplicaPapel(true);lojaRender();toast(`Loja ativada! Cadastrada pelo promotor ${r.data}.`)}
  }finally{aceitando=false}}

/* ---------- moderador: saques pra pagar e lista de promotores ---------- */
let adm={saques:[],promotores:[]},admAberto=false;try{admAberto=localStorage.getItem("cx-pma-aberto")==="1"}catch(e){}
async function admLoad(){
  const c=el("pma-card");if(!c)return;
  if(!sb||!uid||!perfil.admin){c.hidden=true;return}c.hidden=false;
  const r=await sb.rpc("promotores_admin");
  if(r.error){el("pma-lista").innerHTML=`<p class="hint">Não deu pra carregar. Rodou o promotores.sql no Supabase?</p>`;return}
  adm=r.data||{saques:[],promotores:[]};admPinta();
}
function admPinta(){
  el("pma-abre").setAttribute("aria-expanded",admAberto);el("pma-corpo").hidden=!admAberto;
  const S=adm.saques||[],P=adm.promotores||[],tot=S.reduce((s,x)=>s+Number(x.valor),0),lojas=P.reduce((s,x)=>s+Number(x.lojas),0);
  el("pma-res").textContent=S.length?`${S.length} saque${S.length==1?"":"s"} pra pagar · ${brl(tot)}`:P.length?`${P.length} promotor${P.length==1?"":"es"} · ${lojas} loja${lojas==1?"":"s"}`:"Ninguém ainda";
  const zap=w=>{w=String(w||"").replace(/\D/g,"");return w?` · <a href="https://wa.me/55${w}" target="_blank" rel="noopener">WhatsApp</a>`:""};
  el("pma-lista").innerHTML=`<b>Saques pra pagar</b>`+(S.length?S.map(x=>`<div class="adm-it"><div class="cad-l1"><span class="t">${esc(x.nome||"(sem nome)")}</span><b class="num">${brl(Number(x.valor))}</b></div>
      <div class="s">Pedido em ${data(x.pedido)} · código ${esc(x.codigo)}${x.cpf?` · CPF ${esc(cpfFmt(x.cpf))}`:" · <b>sem CPF</b>"}${zap(x.whats)}</div>
      <div class="pma-pg"><span class="pm-link">Pix: ${esc(x.pix)}</span><button class="link" type="button" data-pmapix="${esc(x.pix)}">Copiar chave</button></div>
      <div class="grid2"><button class="btn" type="button" data-pmapg="${x.id}" data-v="${x.valor}">Já fiz o Pix</button><button class="btn ghost" type="button" data-pmarec="${x.id}">Recusar</button></div></div>`).join("")
      :`<p class="hint" style="margin:0">Nenhum saque esperando.</p>`)
    +`<b>Promotores</b>`+(P.length?P.map(x=>`<div class="adm-it"><div class="cad-l1"><span class="t">${esc(x.nome||"(sem nome)")}</span><span class="cad-tp">${esc(x.codigo)}</span></div>
      <div class="s">${x.lojas} loja${x.lojas==1?"":"s"} · ganhou ${brl(Number(x.ganho))} · pago ${brl(Number(x.pago))} · saldo ${brl(Number(x.disponivel))}</div>
      <div class="s">${x.cpf?`CPF ${esc(cpfFmt(x.cpf))}`:"<b>Sem CPF</b>"}${x.cidade?` · ${esc(x.cidade)}/${esc(x.uf||"")}`:""}${x.termos?` · termo aceito em ${data(x.termos)}`:" · termo não aceito"}</div>
      <div class="s">Pix: ${esc(x.pix||"—")}${zap(x.whats)}</div></div>`).join("")
      :`<p class="empty">Quando alguém virar promotor, aparece aqui.</p>`);
}
document.addEventListener("click",e=>{
  if(e.target.closest("#pma-abre")){admAberto=!admAberto;try{localStorage.setItem("cx-pma-aberto",admAberto?"1":"0")}catch(x){}admPinta();return}
  if(e.target.closest("#pma-atual")){admLoad().then(()=>toast("Lista atualizada"));return}
  const c=e.target.closest("[data-pmapix]");if(c){const k=c.dataset.pmapix;(navigator.clipboard?navigator.clipboard.writeText(k):Promise.reject()).then(()=>toast("Chave Pix copiada"),()=>window.prompt("Copie a chave:",k));return}
  const b=e.target.closest("[data-pmapg],[data-pmarec]");if(!b)return;
  const pagar=!!b.dataset.pmapg,sid=Number(b.dataset.pmapg||b.dataset.pmarec);
  if(b.dataset.ok!=="1"){b.dataset.ok="1";b.textContent=pagar?`Confirmar Pix de ${brl(Number(b.dataset.v))}?`:"Recusar mesmo?";return}
  const nota=pagar?null:(window.prompt("Motivo (o promotor vê):","")||null);
  b.disabled=true;sb.rpc("promotor_saque_mudar",{sid,acao:pagar?"pagar":"recusar",nota}).then(async r=>{b.disabled=false;
    if(r.error){toast(erroDe(r.error));return}await admLoad();toast(pagar?"Saque marcado como pago":"Saque recusado: o valor voltou pro saldo")});
});

/* ---------- conta de promotor: só a área de promotor e a conta ---------- */
// link direto pro cadastro de promotor: cadernex.com.br/#promotor
if(/promotor/.test(location.hash)&&el("a-tipo")){el("a-tipo").querySelectorAll("[data-tipo]").forEach(x=>x.setAttribute("aria-checked",x.dataset.tipo==="promotor"));
  const l=document.querySelector("#s-auth .lead");if(l)l.textContent="Cadastre lojas no Cadernex e ganhe 2% da taxa delas por 24 meses.";setTimeout(()=>{if(typeof setModo==="function")setModo("criar")},0)}
const soPromo=()=>document.body.classList.contains("promo");
const TELAS_PROMO=["promotor","config"];

/* ---------- ligações com o resto do app ---------- */
if(typeof go==="function"){const g=go;go=function(v){if(soPromo()&&!TELAS_PROMO.includes(v))v="promotor";g(v);
  if(soPromo())document.querySelectorAll(".tab.so-promo").forEach(t=>{if(t.dataset.v===v)t.setAttribute("aria-current","page");else t.removeAttribute("aria-current")});
  if(v==="promotor"){pinta();carregar()}if(v==="mais")admLoad();if(v==="perfilc")lojaRender()}}
const _al=window.agendaLoad;window.agendaLoad=async()=>{await _al();lojaRender();admLoad();aceitar();if(soPromo()&&!document.querySelector("#v-promotor:not([hidden]),#v-config:not([hidden])"))go("promotor");
  // entrou pelo link de um promotor e já é loja: vincula sozinho
  if(ehLoja()&&!perfil.indicado_por&&guardado())vincular(guardado(),false)};
if(uid)setTimeout(()=>{lojaRender();admLoad();if(soPromo())go("promotor")},0);
})();
