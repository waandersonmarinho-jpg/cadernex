/* Cadernex — Saúde do app (só o moderador): erros que aconteceram nos celulares e o backup dos dados. */
(function(){
const el=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const DIA=864e5;
let lista=[],aberto=false;try{aberto=localStorage.getItem("cx-sd-aberto")==="1"}catch(e){}
const quando=d=>new Date(d).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"});
const aparelho=u=>!u?"":/iPhone|iPad/.test(u)?"iPhone":/Android/.test(u)?"Android":/Windows/.test(u)?"Windows":/Mac/.test(u)?"Mac":"Outro";
function abre(){el("sd-abre").setAttribute("aria-expanded",aberto);el("sd-corpo").hidden=!aberto}
let parados=[];
const fone=w=>{const d=String(w||"").replace(/\D/g,"");return d.length===11?`(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`:d.length===10?`(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`:d};
function pintaParados(){
  el("sd-parados-w").hidden=!parados.length;
  el("sd-parados").innerHTML=parados.map(p=>{const min=Math.floor((Date.now()-new Date(p.created_at))/60000),w=String(p.whats||"").replace(/\D/g,"");
    return `<div class="adm-it"><div class="cad-l1"><span class="t">${esc(p.coleta_bairro)} → ${esc(p.entrega_bairro)}</span><span class="cad-tp m">${brl(Number(p.valor))}</span></div>
    <div class="s">${esc(p.cliente||"")} · há ${min} min${p.distancia_km?` · ${String(Number(p.distancia_km)).replace(".",",")} km`:""} · avisado ${p.alertas||0}x</div>
    ${w?`<div class="cad-ac"><a href="https://wa.me/55${w}" target="_blank" rel="noopener">WhatsApp de quem pediu ${esc(fone(w))}</a></div>`:""}</div>`}).join("");
}
function pinta(){
  const hoje=lista.filter(e=>Date.now()-new Date(e.created_at)<DIA).length;
  const r=el("sd-res");const txt=hoje?`${hoje} erro${hoje>1?"s":""} nas últimas 24 h`:lista.length?"Nenhum erro nas últimas 24 h":"Nenhum erro registrado";
  r.textContent=parados.length?`${parados.length} pedido${parados.length>1?"s":""} parado${parados.length>1?"s":""} · ${txt}`:txt;
  r.className=hoje||parados.length?"sd-alerta":"";pintaParados();
  el("sd-lista").innerHTML=lista.length?lista.slice(0,40).map(e=>`<div class="adm-it"><div class="s">${quando(e.created_at)} · ${esc(e.nome||"sem login")}${e.tipo?` (${e.tipo==="entregador"?"motoboy":"envio"})`:""} · tela ${esc(e.tela||"?")}</div>
    <div class="sd-msg">${esc(e.msg)}</div><div class="s">${[e.onde?esc(e.onde):"",esc(aparelho(e.aparelho)),e.versao?esc(e.versao):""].filter(Boolean).join(" · ")}</div></div>`).join("")
    :`<p class="empty">Tudo certo por aqui. Quando algo der erro no celular de alguém, aparece nesta lista.</p>`;
  el("sd-limpar").hidden=!lista.length;abre();
}
async function carregar(){
  const card=el("sd-card");if(!card)return;
  if(!sb||!uid||!perfil.admin){card.hidden=true;return}
  card.hidden=false;
  const pr=await sb.rpc("parados_admin");parados=pr.error?[]:(pr.data||[]);
  const r=await sb.rpc("erros_admin");
  if(r.error){el("sd-res").textContent="Não deu pra carregar agora";abre();return}
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
setInterval(()=>{if(uid&&perfil.admin&&!document.hidden)carregar()},60000);
})();
