/* Cadernex — cadastro completo (nome, celular, nascimento, CPF, nacionalidade) */
let dadosOk=null;
const soNum=v=>String(v||"").replace(/\D/g,"");
function cpfValido(c){c=soNum(c);if(c.length!==11||/^(\d)\1{10}$/.test(c))return false;
  let s=0;for(let i=0;i<9;i++)s+=+c[i]*(10-i);let d1=(s*10)%11;if(d1===10)d1=0;
  s=0;for(let i=0;i<10;i++)s+=+c[i]*(11-i);let d2=(s*10)%11;if(d2===10)d2=0;
  return d1===+c[9]&&d2===+c[10]}
function idade(d){const n=new Date(d+"T12:00"),h=new Date();let a=h.getFullYear()-n.getFullYear();const m=h.getMonth()-n.getMonth();if(m<0||(m===0&&h.getDate()<n.getDate()))a--;return a}
$("dd-cpf").addEventListener("input",e=>{const v=soNum(e.target.value).slice(0,11);e.target.value=v.replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d{1,2})$/,"$1-$2")});
$("dd-cel").addEventListener("input",e=>{const v=soNum(e.target.value).slice(0,11);e.target.value=v.length>10?v.replace(/(\d{2})(\d{5})(\d{0,4})/,"($1) $2-$3"):v.replace(/(\d{2})(\d{0,4})(\d{0,4})/,(m,a,b,c)=>a+(b?") "+b:"")+(c?"-"+c:"")).replace(/^(\d{2})\)/,"($1)")});

async function dadosCheck(){
  if(!sb||!uid)return;
  const r=await sb.from("dados_pessoais").select("user_id").eq("user_id",uid).maybeSingle();
  if(r.error){dadosOk=true;return} // tabela ainda não criada: não trava ninguém
  dadosOk=!!r.data;
  document.querySelectorAll(".cad-falta").forEach(el=>el.hidden=dadosOk);
  if(!dadosOk){let pul=false;try{pul=sessionStorage.getItem("cadernex_dados_depois")==="1"}catch(e){}
    if(!pul)abrirDados()}
}
function abrirDados(){$("dd-nome").value=$("dd-nome").value||perfil.nome||"";if(!$("dd-cel").value&&perfil.telefone){$("dd-cel").value=perfil.telefone;$("dd-cel").dispatchEvent(new Event("input"))}
  $("dd-msg").textContent="";show("dados");scrollTo(0,0)}
document.addEventListener("click",e=>{if(e.target.closest("[data-cad]"))abrirDados()});
$("dd-depois").onclick=()=>{try{sessionStorage.setItem("cadernex_dados_depois","1")}catch(e){}show("app");if(typeof aplicaPapel==="function")aplicaPapel(true)};

$("fDados").onsubmit=async e=>{e.preventDefault();const msg=$("dd-msg");msg.textContent="";
  const nome=$("dd-nome").value.trim().replace(/\s+/g," "),cel=soNum($("dd-cel").value),nasc=$("dd-nasc").value,cpf=soNum($("dd-cpf").value),nac=$("dd-nac").value;
  if(nome.split(" ").length<2){msg.textContent="Escreva o nome completo, com sobrenome.";return}
  if(cel.length<10||cel.length>11){msg.textContent="Celular com DDD, só números. Ex.: 62999999999.";return}
  if(!nasc){msg.textContent="Coloque a data de nascimento.";return}
  if(idade(nasc)<18){msg.textContent="É preciso ter 18 anos ou mais pra usar as corridas.";return}
  if(!cpfValido(cpf)){msg.textContent="CPF inválido. Confira os números.";return}
  if(!$("dd-ok").checked){msg.textContent="Pra continuar, aceite a Política de Privacidade.";return}
  $("dd-btn").disabled=true;
  const{error}=await sb.from("dados_pessoais").insert({nome_completo:nome,celular:cel,nascimento:nasc,cpf,nacionalidade:nac});
  $("dd-btn").disabled=false;
  if(error){const m=String(error.message||"");msg.textContent=m.includes("CPF")||m.includes("anos")||m.includes("nascimento")?m:"Não salvou. Confira a internet e tente de novo.";return}
  try{await savePerfil({telefone:perfil.telefone||cel,nome:perfil.nome||nome.split(" ")[0]})}catch(e){}
  dadosOk=true;document.querySelectorAll(".cad-falta").forEach(el=>el.hidden=true);$("dd-cpf").value="";
  show("app");if(typeof aplicaPapel==="function")aplicaPapel(true);toast("Cadastro completo!")};

const _agL6=window.agendaLoad;window.agendaLoad=async()=>{await _agL6();dadosCheck()};
if(uid)dadosCheck();
