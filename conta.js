/* Cadernex — excluir a própria conta (Configurações). Quem faz é a função excluir-conta no servidor. */
(function(){
const ab=$("ex-abre"),corpo=$("ex-corpo"),inp=$("ex-conf"),btn=$("ex-btn");if(!ab)return;
ab.onclick=()=>{const v=corpo.hidden;corpo.hidden=!v;ab.setAttribute("aria-expanded",v);if(v)inp.focus()};
inp.addEventListener("input",()=>{btn.disabled=inp.value.length<6});
async function erroDe(error,data){if(data&&data.erro)return data.erro;try{const j=await error.context.json();if(j&&j.erro)return j.erro}catch(e){}
  return /Failed to send|FunctionsFetchError|404/i.test(String(error&&error.message))?"A exclusão pelo app ainda não foi ligada. Escreva para suporte@cadernex.com.br.":"Não deu certo agora. Confira a internet e tente de novo."}
async function limparCelular(){
  try{const ks=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&/^(cx-|cadernex|sb-)/.test(k))ks.push(k)}ks.forEach(k=>localStorage.removeItem(k))}catch(e){}
  try{sessionStorage.clear()}catch(e){}
  try{if(indexedDB.databases){(await indexedDB.databases()).forEach(d=>{if(d.name&&/cadernex|cx/i.test(d.name))indexedDB.deleteDatabase(d.name)})}}catch(e){}
}
btn.onclick=async()=>{
  if(inp.value.length<6)return;
  if(!confirm("Excluir sua conta do Cadernex para sempre? Não dá pra desfazer."))return;
  btn.disabled=true;const t=btn.textContent;btn.textContent="Excluindo…";
  const{data,error}=await sb.functions.invoke("excluir-conta",{body:{senha:inp.value}});
  if(error||!data||!data.ok){btn.disabled=false;btn.textContent=t;const m=await erroDe(error,data);toast(m);if(/Senha/.test(m)){inp.value="";btn.disabled=true;inp.focus()}return}
  await limparCelular();
  try{await sb.auth.signOut()}catch(e){}
  turnos=[];gastos=[];perfil={meta:0};document.body.classList.remove("cli","promo");if(typeof papelAplicado!=="undefined")papelAplicado=null;
  inp.value="";btn.textContent=t;corpo.hidden=true;
  show("auth");toast("Sua conta foi excluída. Obrigado por ter usado o Cadernex.");
};
})();
