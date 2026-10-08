/* Cadernex — cadastro completo: pessoa (nome, celular, nascimento, CPF, nacionalidade)
   ou, para quem envia, empresa (nome da empresa, CNPJ, responsável e celular) */
let dadosOk=null,docTipo="cpf";
const soNum=v=>String(v||"").replace(/\D/g,"");
function cpfValido(c){c=soNum(c);if(c.length!==11||/^(\d)\1{10}$/.test(c))return false;
  let s=0;for(let i=0;i<9;i++)s+=+c[i]*(10-i);let d1=(s*10)%11;if(d1===10)d1=0;
  s=0;for(let i=0;i<10;i++)s+=+c[i]*(11-i);let d2=(s*10)%11;if(d2===10)d2=0;
  return d1===+c[9]&&d2===+c[10]}
// CNPJ: aceita o antigo (só números) e o novo com letras (Receita, 2026)
const cnpjLimpo=v=>String(v||"").toUpperCase().replace(/[^0-9A-Z]/g,"").slice(0,14);
function cnpjValido(c){c=cnpjLimpo(c);if(!/^[0-9A-Z]{12}[0-9]{2}$/.test(c)||/^(.)\1{13}$/.test(c))return false;
  const v=i=>c.charCodeAt(i)-48,dv=p=>{let s=0;p.forEach((w,i)=>s+=v(i)*w);const r=s%11;return r<2?0:11-r};
  return dv([5,4,3,2,9,8,7,6,5,4,3,2])===+c[12]&&dv([6,5,4,3,2,9,8,7,6,5,4,3,2])===+c[13]}
function docSet(t){docTipo=t;const emp=t==="cnpj";
  $("dd-doc").querySelectorAll("[data-doc]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.doc===t));
  $("dd-emp").hidden=!emp;$("dd-pf").hidden=emp;$("dd-nac-w").hidden=emp;
  $("dd-nasc").required=!emp;$("dd-cpf").required=!emp;
  $("dd-nome-lbl").textContent=emp?"Nome do responsável":"Nome completo";$("dd-msg").textContent=""}
$("dd-doc").addEventListener("click",e=>{const b=e.target.closest("[data-doc]");if(b)docSet(b.dataset.doc)});
$("dd-cnpj").addEventListener("input",e=>{const c=cnpjLimpo(e.target.value);let o=c.slice(0,2);
  if(c.length>2)o+="."+c.slice(2,5);if(c.length>5)o+="."+c.slice(5,8);if(c.length>8)o+="/"+c.slice(8,12);if(c.length>12)o+="-"+c.slice(12);e.target.value=o});
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
function abrirDados(){const cli=perfil.tipo==="cliente";$("dd-doc").hidden=!cli;if(!cli&&docTipo!=="cpf")docSet("cpf");
  $("dd-nome").value=$("dd-nome").value||perfil.nome||"";if(!$("dd-cel").value&&perfil.telefone){$("dd-cel").value=perfil.telefone;$("dd-cel").dispatchEvent(new Event("input"))}
  $("dd-msg").textContent="";show("dados");scrollTo(0,0)}
document.addEventListener("click",e=>{if(e.target.closest("[data-cad]"))abrirDados()});
$("dd-depois").onclick=()=>{try{sessionStorage.setItem("cadernex_dados_depois","1")}catch(e){}show("app");if(typeof aplicaPapel==="function")aplicaPapel(true)};

$("fDados").onsubmit=async e=>{e.preventDefault();const msg=$("dd-msg");msg.textContent="";
  const emp=docTipo==="cnpj"&&perfil.tipo==="cliente";
  const nome=$("dd-nome").value.trim().replace(/\s+/g," "),cel=soNum($("dd-cel").value),nasc=$("dd-nasc").value,cpf=soNum($("dd-cpf").value),nac=$("dd-nac").value;
  const empNome=$("dd-emp-nome").value.trim().replace(/\s+/g," "),cnpj=cnpjLimpo($("dd-cnpj").value);
  if(emp){
    if(empNome.length<2){msg.textContent="Coloque o nome da empresa.";return}
    if(!cnpjValido(cnpj)){msg.textContent="CNPJ inválido. Confira os números.";return}
  }
  if(nome.split(" ").length<2){msg.textContent=emp?"Escreva o nome completo do responsável, com sobrenome.":"Escreva o nome completo, com sobrenome.";return}
  if(cel.length<10||cel.length>11){msg.textContent="Celular com DDD, só números. Ex.: 62999999999.";return}
  if(!emp){
    if(!nasc){msg.textContent="Coloque a data de nascimento.";return}
    if(idade(nasc)<18){msg.textContent="É preciso ter 18 anos ou mais pra usar as corridas.";return}
    if(!cpfValido(cpf)){msg.textContent="CPF inválido. Confira os números.";return}
  }
  if(!$("dd-ok").checked){msg.textContent="Pra continuar, aceite a Política de Privacidade.";return}
  $("dd-btn").disabled=true;
  const linha=emp?{nome_completo:nome,celular:cel,cnpj,empresa_nome:empNome,nacionalidade:"Empresa"}:{nome_completo:nome,celular:cel,nascimento:nasc,cpf,nacionalidade:nac};
  const{error}=await sb.from("dados_pessoais").insert(linha);
  $("dd-btn").disabled=false;
  if(error){const m=String(error.message||"");msg.textContent=/CPF|CNPJ|anos|nascimento|empresa|Entregador/.test(m)?m:(emp&&/cnpj|column/i.test(m)?"O cadastro de empresa ainda não foi ativado. Tente de novo mais tarde.":"Não salvou. Confira a internet e tente de novo.");return}
  if(emp){perfil.loja=true;perfil.loja_nome=perfil.loja_nome||empNome}
  try{await savePerfil(emp?{telefone:perfil.telefone||cel,nome:perfil.nome||empNome}:{telefone:perfil.telefone||cel,nome:perfil.nome||nome.split(" ")[0]})}catch(e){}
  $("dd-cnpj").value="";
  dadosOk=true;document.querySelectorAll(".cad-falta").forEach(el=>el.hidden=true);$("dd-cpf").value="";
  show("app");if(typeof aplicaPapel==="function")aplicaPapel(true);toast("Cadastro completo!")};

const _agL6=window.agendaLoad;window.agendaLoad=async()=>{await _agL6();dadosCheck()};
if(uid)dadosCheck();
