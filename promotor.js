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
const limpa=c=>String(c||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,12);
const ehLoja=()=>!!(perfil.loja&&String(perfil.loja_nome||"").trim());

/* ---------- código que veio no link ---------- */
try{const c=limpa(new URLSearchParams(location.search).get("p"));if(c)localStorage.setItem(KEY,c)}catch(e){}
const guardado=()=>{try{return localStorage.getItem(KEY)||""}catch(e){return""}};
const esquece=()=>{try{localStorage.removeItem(KEY)}catch(e){}};

const ERROS={codigo:"Esse código de promotor não existe. Confira as letras.",proprio:"Você não pode ser promotor da sua própria loja.",
  ja_vinculada:"Sua loja já tem um promotor.",semana:"Você já sacou esta semana. Tente de novo na data indicada.",minimo:"Saldo abaixo do mínimo para saque.",saque_aberto:"Você já tem um saque esperando o Pix.",saque:"Esse saque já foi resolvido.",nao_loja:"Salve o nome da loja primeiro.",pix:"Coloque uma chave Pix válida.",bloqueado:"Sua conta está em análise.",admin:"Só o moderador."};
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
  const w=el("lj-promo-w");if(!w)return;
  if(perfil.indicado_por){w.innerHTML=`<p class="hint" style="margin:0">Loja cadastrada pelo promotor <b>${esc(meuPromotor||"…")}</b>.</p>`;
    if(!meuPromotor&&sb&&uid)sb.rpc("promotor_meu").then(r=>{if(!r.error&&r.data){meuPromotor=r.data;lojaRender()}});return}
  if(!w.querySelector("#lj-promo"))w.innerHTML=`<label>Código do promotor <small class="hint" style="font-weight:400">(opcional: quem te apresentou o Cadernex)</small><input type="text" id="lj-promo" maxlength="12" autocapitalize="characters" autocomplete="off" spellcheck="false" placeholder="ex.: K7M2QX"></label>`;
  const i=el("lj-promo");if(i&&!i.value&&document.activeElement!==i)i.value=guardado();
}
document.addEventListener("input",e=>{if(e.target.id==="lj-promo")e.target.value=limpa(e.target.value)});
// depois que a loja salva as informações, faz o vínculo com o código digitado ou do link
const _sp=savePerfil;savePerfil=async function(patch){await _sp(patch);
  if(ehLoja()&&!perfil.indicado_por){const c=el("lj-promo")?.value||guardado();if(c)await vincular(c,!!el("lj-promo")?.value)}};

/* ---------- tela do promotor ---------- */
let painel=null,carregando=false;
async function carregar(){
  if(!sb||!uid||carregando)return;carregando=true;
  try{const r=await sb.rpc("promotor_painel");painel=r.error?{erro:true}:r.data}finally{carregando=false}
  pinta();
}
function pinta(){
  const w=el("pm-corpo");if(!w)return;
  if(!painel){w.innerHTML=`<p class="hint">Carregando…</p>`;return}
  if(painel.erro){w.innerHTML=`<div class="card"><p class="hint" style="margin:0">Não deu pra carregar agora. Confira a internet.</p></div>`;return}
  if(!painel.promotor){w.innerHTML=`
    <div class="card stack pm-intro">
      <h2>Ganhe cadastrando lojas</h2>
      <p style="margin:0">Apresente o Cadernex pra farmácias, restaurantes e lojas do seu bairro. Cada loja que se cadastrar com o seu código te rende <b>${pct(0.02)} de tudo que o Cadernex recebe dela durante 24 meses</b>: nas entregas que ela pede e nas vendas pelo app.</p>
      <ul class="pm-passos"><li>Você recebe um link e um código só seus.</li><li>A loja cria a conta pelo link ou coloca o código em “Informações da loja”.</li><li>Cada loja rende comissão por <b>24 meses</b> a partir do cadastro.</li><li>Toda semana você pode sacar o saldo, que cai por Pix na sua chave.</li></ul>
      <p class="hint" style="margin:0">Exemplo: se o Cadernex recebe R$ 500 em taxas das suas lojas no mês, você ganha R$ 10. Quanto mais lojas, mais soma.</p>
    </div>
    <form class="card stack" id="pm-entrar">
      <label>Sua chave Pix (pra receber)<input type="text" id="pm-pix" maxlength="120" autocomplete="off" spellcheck="false" placeholder="CPF, celular, e-mail ou chave aleatória"></label>
      <button class="btn full" type="submit">Quero ser promotor</button>
      <p class="hint" style="margin:0">Não pode cadastrar a própria loja. Comissão só sobre o que é pago pelo app; devoluções não contam.</p>
    </form>`;return}
  const p=painel,disp=Number(p.disponivel)||0,pend=(p.saques||[]).find(x=>x.status==="pedido"),link=linkDe(p.codigo);
  const msg=`Oi! Sua loja já faz entregas pelo Cadernex? Motoboys e bikes da região, pagamento por Pix, sem mensalidade. Cadastre aqui: ${link} (ou use o código ${p.codigo})`;
  const prox=p.proximo?new Date(p.proximo):null,podeSemana=prox&&prox<=new Date(),min=Number(p.minimo)||5;
  const saque=pend?`<div class="pm-aviso"><b>Saque de ${brl(Number(pend.valor))} pedido em ${data(pend.pedido)}</b><span>O Pix vai para ${esc(pend.pix)}. Avisamos aqui quando cair.</span></div>`
    :!podeSemana?`<button class="btn full" type="button" disabled>Próximo saque em ${data(prox)}</button>`
    :disp<min?`<button class="btn full" type="button" disabled>Saque a partir de ${brl(min)}</button>`
    :`<button class="btn full" type="button" data-pmsaca>Sacar ${brl(disp)} no Pix</button>`;
  w.innerHTML=`
    <div class="card hero pm-hero stack">
      <span class="eyebrow">Disponível pra sacar</span><b class="big num">${brl(disp)}</b>
      <div class="pm-tot"><div><b class="num">${brl(Number(p.mes))}</b><span>Este mês</span></div><div><b class="num">${brl(Number(p.ganho))}</b><span>Total ganho</span></div><div><b class="num">${p.lojas.length}</b><span>Loja${p.lojas.length==1?"":"s"}</span></div></div>
      ${saque}
      <p class="hint" style="margin:0">Você ganha ${pct(p.taxa)} da taxa do Cadernex sobre o que cada loja paga pelo app, por ${p.meses||24} meses desde o cadastro dela. Um saque por semana, a partir de ${brl(min)}, na chave Pix <b>${esc(p.pix)}</b>.</p>
    </div>
    <div class="card stack">
      <h2>Seu link de promotor</h2>
      <div class="pm-cod"><span class="eyebrow">Código</span><b class="num">${esc(p.codigo)}</b></div>
      <div class="pm-link">${esc(link)}</div>
      <div class="grid2"><button class="btn ghost" type="button" data-pmcopia>Copiar link</button><a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(msg)}">Mandar no WhatsApp</a></div>
      <p class="hint" style="margin:0">Na loja, peça pra criar a conta pelo link. Se a loja já tem conta, ela coloca o código em Perfil → Informações da loja.</p>
    </div>
    <div class="card stack">
      <h2>Suas lojas</h2>
      ${p.lojas.length?`<div class="stack" style="gap:8px">${p.lojas.map(l=>`<div class="adm-it"><div class="cad-l1"><span class="t">${esc(l.nome||"(sem nome)")}</span><b class="num">${brl(Number(l.comissao))}</b></div>
        <div class="s">${[esc(l.bairro),new Date(l.ate)>new Date()?`Comissão até ${data(l.ate)}`:`Prazo encerrado em ${data(l.ate)}`,l.mov?`${l.mov} pagamento${l.mov==1?"":"s"} pelo app`:"Ainda sem pagamento pelo app"].filter(Boolean).join(" · ")}</div></div>`).join("")}</div>`
        :`<p class="hint" style="margin:0">Nenhuma loja ainda. Mande seu link pra primeira loja hoje.</p>`}
    </div>
    <div class="card stack">
      <h2>Seus saques</h2>
      ${(p.saques||[]).length?`<div class="stack" style="gap:6px">${p.saques.map(x=>`<div class="row"><span>${data(x.pago||x.pedido)} · ${{pedido:"Esperando o Pix",pago:"Pago",recusado:"Recusado"}[x.status]||x.status}${x.obs?` · ${esc(x.obs)}`:""}</span><b class="num">${brl(Number(x.valor))}</b></div>`).join("")}</div>
        <p class="hint" style="margin:0">Total recebido: ${brl(Number(p.pago))}</p>`
        :`<p class="hint" style="margin:0">Nenhum saque ainda.</p>`}
    </div>
    <form class="card stack" id="pm-entrar">
      <label>Trocar chave Pix<input type="text" id="pm-pix" maxlength="120" autocomplete="off" spellcheck="false" value="${esc(p.pix)}"></label>
      <button class="btn ghost full" type="submit">Salvar chave Pix</button>
    </form>`;
}
document.addEventListener("submit",e=>{if(e.target.id!=="pm-entrar")return;e.preventDefault();
  const pix=el("pm-pix").value.trim();if(pix.length<5){toast("Coloque sua chave Pix");el("pm-pix").focus();return}
  const novo=!painel?.promotor,b=e.target.querySelector("button");b.disabled=true;
  sb.rpc("promotor_entrar",{pix}).then(async r=>{b.disabled=false;if(r.error){toast(erroDe(r.error));return}
    perfil.promotor=true;await carregar();toast(novo?"Pronto! Agora é só divulgar seu link.":"Chave Pix salva")})});
document.addEventListener("click",e=>{
  const sq=e.target.closest("[data-pmsaca]");
  if(sq){if(sq.dataset.ok!=="1"){sq.dataset.ok="1";sq.textContent=`Confirmar saque de ${brl(Number(painel.disponivel))}?`;return}
    sq.disabled=true;sb.rpc("promotor_sacar").then(async r=>{if(r.error){sq.disabled=false;toast(erroDe(r.error));await carregar();return}
      await carregar();toast(`Saque de ${brl(Number(r.data))} pedido. O Pix cai na sua chave.`)});return}
  if(e.target.closest("[data-pmcopia]")&&painel?.codigo){const l=linkDe(painel.codigo);
    (navigator.clipboard?navigator.clipboard.writeText(l):Promise.reject()).then(()=>toast("Link copiado"),()=>{window.prompt("Copie o link:",l)})}
});

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
      <div class="s">Pedido em ${data(x.pedido)} · código ${esc(x.codigo)}${zap(x.whats)}</div>
      <div class="pma-pg"><span class="pm-link">Pix: ${esc(x.pix)}</span><button class="link" type="button" data-pmapix="${esc(x.pix)}">Copiar chave</button></div>
      <div class="grid2"><button class="btn" type="button" data-pmapg="${x.id}" data-v="${x.valor}">Já fiz o Pix</button><button class="btn ghost" type="button" data-pmarec="${x.id}">Recusar</button></div></div>`).join("")
      :`<p class="hint" style="margin:0">Nenhum saque esperando.</p>`)
    +`<b>Promotores</b>`+(P.length?P.map(x=>`<div class="adm-it"><div class="cad-l1"><span class="t">${esc(x.nome||"(sem nome)")}</span><span class="cad-tp">${esc(x.codigo)}</span></div>
      <div class="s">${x.lojas} loja${x.lojas==1?"":"s"} · ganhou ${brl(Number(x.ganho))} · pago ${brl(Number(x.pago))} · saldo ${brl(Number(x.disponivel))}</div>
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

/* ---------- ligações com o resto do app ---------- */
if(typeof go==="function"){const g=go;go=function(v){g(v);if(v==="promotor"){pinta();carregar()}if(v==="mais")admLoad();if(v==="perfilc")lojaRender()}}
const _al=window.agendaLoad;window.agendaLoad=async()=>{await _al();lojaRender();admLoad();
  // entrou pelo link de um promotor e já é loja: vincula sozinho
  if(ehLoja()&&!perfil.indicado_por&&guardado())vincular(guardado(),false)};
if(uid)setTimeout(()=>{lojaRender();admLoad()},0);
})();
