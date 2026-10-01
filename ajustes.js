// Configurações: tema claro/escuro, conta, trocar senha, sair e entrar com outra conta
(function(){
const raiz=document.documentElement,mq=matchMedia("(prefers-color-scheme: dark)");
function lerTema(){try{return localStorage.getItem("cx-tema")||"auto"}catch(e){return "auto"}}
function aplicaTema(t){
  if(t==="light"||t==="dark")raiz.dataset.theme=t;else delete raiz.dataset.theme;
  const escuro=t==="dark"||(t!=="light"&&mq.matches);
  const m=document.querySelector('meta[name="theme-color"]');if(m)m.content=escuro?"#0c0e11":"#f7f5ef";
  document.querySelectorAll("[data-tema]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.tema===t));
}
document.addEventListener("click",e=>{const b=e.target.closest("[data-tema]");if(!b)return;
  const t=b.dataset.tema;try{if(t==="auto")localStorage.removeItem("cx-tema");else localStorage.setItem("cx-tema",t)}catch(e){}aplicaTema(t)});
mq.addEventListener?.("change",()=>aplicaTema(lerTema()));
aplicaTema(lerTema());

// Conta
async function contaRender(){
  if(typeof sb==="undefined"||!sb||!uid)return;
  const u=(await sb.auth.getUser()).data.user;if(!u)return;
  $("cf-email").textContent=u.email||"—";
  $("cf-tipo").textContent=(typeof perfil!=="undefined"&&perfil.tipo==="cliente")?"· conta de cliente":"· conta de entregador";
}
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
