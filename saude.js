/* Cadernex — Saúde do app (só o moderador): erros que aconteceram nos celulares e o backup dos dados. */
(function(){
const el=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const DIA=864e5;
let lista=[],aberto=false;try{aberto=localStorage.getItem("cx-sd-aberto")==="1"}catch(e){}
const quando=d=>new Date(d).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
const aparelho=u=>!u?"":/iPhone|iPad/.test(u)?"iPhone":/Android/.test(u)?"Android":/Windows/.test(u)?"Windows":/Mac/.test(u)?"Mac":"Outro";
function abre(){el("sd-abre").setAttribute("aria-expanded",aberto);el("sd-corpo").hidden=!aberto}
function pinta(){
  const hoje=lista.filter(e=>Date.now()-new Date(e.created_at)<DIA).length;
  const r=el("sd-res");r.textContent=hoje?`${hoje} erro${hoje>1?"s":""} nas últimas 24 h`:lista.length?"Nenhum erro nas últimas 24 h":"Nenhum erro registrado";
  r.className=hoje?"sd-alerta":"";
  el("sd-lista").innerHTML=lista.length?lista.slice(0,40).map(e=>`<div class="adm-it"><div class="s">${quando(e.created_at)} · ${esc(e.nome||"sem login")}${e.tipo?` (${e.tipo==="entregador"?"motoboy":"envio"})`:""} · tela ${esc(e.tela||"?")}</div>
    <div class="sd-msg">${esc(e.msg)}</div><div class="s">${[e.onde?esc(e.onde):"",esc(aparelho(e.aparelho)),e.versao?esc(e.versao):""].filter(Boolean).join(" · ")}</div></div>`).join("")
    :`<p class="empty">Tudo certo por aqui. Quando algo der erro no celular de alguém, aparece nesta lista.</p>`;
  el("sd-limpar").hidden=!lista.length;abre();
}
async function carregar(){
  const card=el("sd-card");if(!card)return;
  if(!sb||!uid||!perfil.admin){card.hidden=true;return}
  card.hidden=false;
  const r=await sb.rpc("erros_admin");
  if(r.error){el("sd-res").textContent="Rode o monitor.sql no Supabase";abre();return}
  lista=r.data||[];pinta();
}
async function backup(b){
  b.disabled=true;const t=b.textContent;b.textContent="Gerando backup…";
  try{const r=await sb.rpc("backup_admin");if(r.error)throw r.error;
    const d=r.data,n=Object.keys(d).filter(k=>Array.isArray(d[k])).reduce((s,k)=>s+d[k].length,0);
    const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(d)],{type:"application/json"}));
    a.download=`backup-cadernex-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(a);a.click();
    setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},800);
    toast(`Backup baixado: ${n} registros`);
  }catch(e){console.error(e);toast("Não deu para gerar o backup. Tente de novo.")}
  b.disabled=false;b.textContent=t;
}
document.addEventListener("click",e=>{
  if(e.target.closest("#sd-abre")){aberto=!aberto;try{localStorage.setItem("cx-sd-aberto",aberto?"1":"0")}catch(x){}abre();return}
  if(e.target.closest("#sd-atual")){carregar().then(()=>toast("Lista atualizada"));return}
  const b=e.target.closest("#sd-backup");if(b){backup(b);return}
  const l=e.target.closest("#sd-limpar");if(l){if(l.dataset.ok!=="1"){l.dataset.ok="1";l.textContent="Toque de novo pra apagar a lista";return}
    l.dataset.ok="";l.textContent="Limpar lista de erros";
    safe(async()=>{const{error}=await sb.from("erros_app").delete().gt("id",0);if(error)throw error;await carregar()},"Lista de erros limpa")}
});
if(typeof go==="function"){const g=go;go=function(v){g(v);if(v==="mais")carregar()}}
const _al=window.agendaLoad;window.agendaLoad=async()=>{await _al();carregar()};
if(uid)setTimeout(carregar,0);
})();
