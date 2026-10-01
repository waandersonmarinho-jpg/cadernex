/* Cadernex — Pix do entregador: a chave é o CPF do próprio titular */
(function(){
let meu=null; // {cpf, pix_ativo} do entregador logado
const pixCache={}; // corrida_id -> {chave,titular} | "sem" | {erro}
const fmtCpf=c=>c.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,"$1.$2.$3-$4");
const mascara=c=>"***."+c.slice(3,6)+"."+c.slice(6,9)+"-**";

async function meuLoad(){
  if(!sb||!uid)return;
  const r=await sb.from("dados_pessoais").select("cpf,pix_ativo").eq("user_id",uid).maybeSingle();
  meu=r.error?{erro:true}:(r.data||null);cfgRender();pintar();
}
function cfgRender(){
  const card=$("cf-pix");if(!card)return;
  card.hidden=perfil.tipo==="cliente";if(card.hidden)return;
  const st=$("cf-pix-st"),bt=$("cf-pix-btn");
  if(!meu){st.innerHTML="Pra receber por Pix, complete primeiro seu cadastro com CPF.";bt.textContent="Completar cadastro";bt.dataset.acao="cad";return}
  if(meu.erro||meu.pix_ativo===undefined){st.textContent="Falta atualizar o banco. Rode o arquivo pix.sql no Supabase.";bt.hidden=true;return}
  bt.hidden=false;
  if(meu.pix_ativo){st.innerHTML=`<b class="pix-on">Pix ativo</b> · chave CPF ${mascara(meu.cpf)}<br>O cliente de cada corrida que você aceitar vê essa chave pra te pagar.`;bt.textContent="Desativar Pix";bt.dataset.acao="off";bt.className="btn ghost full"}
  else{st.innerHTML=`Chave: seu CPF ${mascara(meu.cpf)}, o mesmo do seu cadastro. Só dá pra usar o CPF do titular da conta.`;bt.textContent="Ativar Pix com meu CPF";bt.dataset.acao="on";bt.className="btn full"}
}
$("cf-pix-btn").onclick=()=>{const a=$("cf-pix-btn").dataset.acao;
  if(a==="cad"){if(typeof abrirDados==="function")abrirDados();return}
  const b=$("cf-pix-btn");if(a==="on"&&b.dataset.ok!=="1"){b.dataset.ok="1";b.textContent="Toque de novo pra confirmar";return}
  b.dataset.ok="";
  safe(async()=>{const{error}=await sb.from("dados_pessoais").update({pix_ativo:a==="on"}).eq("user_id",uid);if(error)throw error;meu.pix_ativo=a==="on";cfgRender();pintar()},a==="on"?"Pix ativado":"Pix desativado")};

/* cartões das corridas */
function pintar(){
  document.querySelectorAll(".pixbox[data-pix]").forEach(el=>{
    const id=el.dataset.pix;
    if(el.dataset.papel==="ent"){
      el.innerHTML=meu&&meu.pix_ativo?`<span class="pix-on">Pix ativo</span> <span class="hint">· o cliente vê sua chave CPF pra te pagar</span>`
        :`<span class="hint">Quer receber por Pix? </span><button class="link" type="button" data-go="config" style="padding:0">Ativar meu Pix</button>`;return}
    const p=pixCache[id];
    if(!p){el.innerHTML=`<button class="btn ghost full" type="button" data-verpix="${id}">Ver Pix do entregador</button>`;return}
    if(p==="carregando"){el.innerHTML=`<p class="hint" style="margin:0">Buscando o Pix…</p>`;return}
    if(p==="sem"){el.innerHTML=`<p class="hint" style="margin:0">Esse entregador ainda não ativou o Pix. Combinem o pagamento pela conversa da corrida. <button class="link" type="button" data-verpix="${id}" style="padding:0">Ver de novo</button></p>`;return}
    if(p.erro){el.innerHTML=`<p class="hint" style="margin:0"></p>`;el.firstChild.textContent=p.erro;return}
    el.innerHTML=`<div class="pix-k"><div><span class="eyebrow">Pix · CPF do titular</span><b class="num">${fmtCpf(p.chave)}</b><span class="hint">Titular: <span data-tit></span> · confira o nome no banco antes de pagar</span></div><button class="btn" type="button" data-copiapix="${id}">Copiar</button></div>`;
    el.querySelector("[data-tit]").textContent=p.titular;
  });
}
document.addEventListener("click",async e=>{
  const v=e.target.closest("[data-verpix]");
  if(v){const id=v.dataset.verpix;pixCache[id]="carregando";pintar();
    const r=await sb.rpc("pix_da_corrida",{cid:id});
    if(r.error)pixCache[id]={erro:/pix_da_corrida|function/i.test(r.error.message)?"O Pix ainda não foi ligado no app. Combinem pela conversa.":r.error.message};
    else pixCache[id]=r.data&&r.data.length?r.data[0]:"sem";
    pintar();return}
  const c=e.target.closest("[data-copiapix]");
  if(c){const p=pixCache[c.dataset.copiapix];if(!p||!p.chave)return;
    try{await navigator.clipboard.writeText(p.chave);c.textContent="Copiado ✓";toast("Chave Pix copiada. Cole no app do seu banco.")}
    catch(err){toast("Copie a chave: "+p.chave)}}
});
const _r=corrRender;corrRender=function(){_r();pintar()};
if(typeof go==="function"){const g=go;go=function(v){g(v);if(v==="config"){cfgRender();meuLoad()}}}
const _al=window.agendaLoad;window.agendaLoad=async()=>{await _al();meuLoad()};
if(uid)meuLoad();
})();
