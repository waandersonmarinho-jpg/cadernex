// Configurações: tema claro/escuro, conta, trocar senha, sair e entrar com outra conta
(function(){
const raiz=document.documentElement;
function lerTema(){let t;try{t=localStorage.getItem("cx-tema")}catch(e){}return t==="light"||t==="dark"?t:(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark")}
function aplicaTema(t){
  raiz.dataset.theme=t;
  const m=document.querySelector('meta[name="theme-color"]');if(m)m.content=t==="dark"?"#0c0e11":"#f7f5ef";
  document.querySelectorAll("[data-tema]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.tema===t));
}
document.addEventListener("click",e=>{const b=e.target.closest("[data-tema]");if(!b)return;
  const t=b.dataset.tema;try{localStorage.setItem("cx-tema",t)}catch(e){}aplicaTema(t)});
aplicaTema(lerTema());

// Conta
async function contaRender(){
  if(typeof sb==="undefined"||!sb||!uid)return;
  const u=(await sb.auth.getUser()).data.user;if(!u)return;
  $("cf-email").textContent=u.email||"—";
  const p=typeof perfil!=="undefined"?perfil:{},loja=!!(p.loja&&String(p.loja_nome||"").trim()),cli=p.tipo==="cliente";
  $("cf-tipo").textContent=cli?"· conta de cliente":"· conta de entregador";
  const nome=String(p.nome||"").trim();
  $("cf-nome").textContent=nome||"Sem nome";
  $("cf-tag").textContent=p.admin?"Moderador":loja?"Lojista":cli?"Cliente":"Entregador";
  $("cf-mail").textContent=u.email||"";
  const ft=document.querySelector(".pf-foto .pf-av img"),av=$("cf-av");
  if(ft&&ft.src)av.innerHTML=`<img src="${ft.src}" alt="">`;
  else av.textContent=(nome.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("")||"?").toUpperCase();
  $("cf-nome-l").textContent="Seu nome";
  $("cf-nome-h").textContent=cli?"É assim que lojas e entregadores veem você nos pedidos.":"É assim que clientes e lojas veem você quando aceita uma corrida.";
}
// editar o nome
const fN=$("fNome"),bEd=$("cf-ed");
function abreNome(sim){fN.hidden=!sim;bEd.hidden=sim;bEd.setAttribute("aria-expanded",String(sim));$("cf-nome-msg").textContent="";
  if(sim){$("cf-nome-in").value=(typeof perfil!=="undefined"&&perfil.nome)||"";setTimeout(()=>$("cf-nome-in").focus(),30)}}
bEd.onclick=()=>abreNome(true);$("cf-nome-x").onclick=()=>abreNome(false);
const fmtNome=t=>String(t||"").replace(/\s+/g," ").trim().toLowerCase().replace(/(^|\s)(\p{L})/gu,(m,a,b)=>a+b.toUpperCase()).replace(/\b(Da|De|Do|Das|Dos|E)\b/g,m=>m.toLowerCase()).replace(/^./,c=>c.toUpperCase());
fN.addEventListener("submit",async e=>{e.preventDefault();
  const msg=$("cf-nome-msg"),v=fmtNome($("cf-nome-in").value);msg.style.color="";
  if(v.length<2||!/\p{L}/u.test(v)){msg.textContent="Coloque um nome com pelo menos 2 letras.";return}
  if(/[<>{}@]|https?:|www\./i.test(v)){msg.textContent="Use só o seu nome, sem links ou símbolos.";return}
  msg.textContent="Salvando…";
  try{await savePerfil({nome:v});abreNome(false);contaRender();toast("Nome atualizado ✓")}
  catch(err){console.error(err);msg.textContent="Não salvou. Confira a internet e tente de novo."}
});
if(typeof go==="function"){const g0=go;go=function(v){g0(v);if(v==="config"){$("cf-msg").textContent="";contaRender()}}}

$("fSenha").addEventListener("submit",async e=>{e.preventDefault();
  const s=$("cf-senha").value,msg=$("cf-msg");msg.style.color="";
  if(s.length<6){msg.textContent="A senha precisa ter pelo menos 6 caracteres.";return}
  msg.textContent="Salvando…";
  const {error}=await sb.auth.updateUser({password:s});
  if(error){msg.textContent=/different|same/i.test(error.message)?"Essa já é sua senha atual.":"Não deu pra trocar agora. Tente de novo.";return}
  $("cf-senha").value="";msg.style.color="var(--good)";msg.textContent="Senha trocada. Use a nova da próxima vez que entrar.";
});

// "sair" (botão #sair, lógica de limpeza em app.js) com confirmação
const btnSair=$("sair"),limpar=btnSair.onclick;
btnSair.onclick=async()=>{if(!confirm("Sair da sua conta neste celular?"))return;await limpar();if(typeof setModo==="function")setModo("entrar");scrollTo(0,0)};
$("cf-trocar").onclick=async()=>{await limpar();$("a-email").value="";$("a-senha").value="";if(typeof setModo==="function")setModo("entrar");scrollTo(0,0);setTimeout(()=>$("a-email").focus(),50)};
})();
