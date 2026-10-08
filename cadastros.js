/* Cadernex — Cadastros (só o moderador): quem se cadastrou, motoboys e quem envia, com busca e planilha. */
(function(){
const el=id=>document.getElementById(id);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const VEI={moto:"Moto",bike:"Bike",picape_p:"Picape P",picape_m:"Picape M",caminhao:"Caminhão"};
const DIA=864e5,PAG=30;
let lista=[],filtro="todos",busca="",mostrar=PAG;
const ehMoto=p=>p.tipo==="entregador";
const rotulo=p=>ehMoto(p)?"Motoboy":p.loja?"Loja":"Envio";
const data=d=>d?new Date(d).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit",year:"2-digit"}):"—";
const fone=w=>{if(!w)return"";const d=String(w).replace(/\D/g,"");return d.length===11?`(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`:d.length===10?`(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`:d};
const semAc=s=>String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();

function filtrados(){
  const b=semAc(busca);
  return lista.filter(p=>(filtro==="todos"||(filtro==="moto"?ehMoto(p):!ehMoto(p)))&&
    (!b||semAc([p.nome,p.loja_nome,p.email,p.bairro,p.whats].join(" ")).includes(b)));
}
function pinta(){
  const card=el("cad-card");if(!card)return;
  const moto=lista.filter(ehMoto).length,env=lista.length-moto,novos=lista.filter(p=>Date.now()-new Date(p.criado_em)<7*DIA).length;
  el("cad-tot").innerHTML=`<div><b class="num">${moto}</b><span>Motoboys</span></div><div><b class="num">${env}</b><span>Enviam</span></div><div><b class="num">${novos}</b><span>Novos na semana</span></div>`;
  el("cad-chips").querySelectorAll("[data-cf]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.cf===filtro));
  const f=filtrados();
  el("cad-lista").innerHTML=f.length?f.slice(0,mostrar).map(p=>{
    const vs=(p.veiculos||[]).map(v=>VEI[v]||v).join(", ");
    const tags=[
      ehMoto(p)?(p.documentos?'<span class="ok">✓ Documentos</span>':'<span class="pend">Sem documentos</span>'):"",
      ehMoto(p)?(p.mp?'<span class="ok">✓ Mercado Pago</span>':'<span class="pend">Sem Mercado Pago</span>'):"",
      p.bloqueado?'<span class="pend">Bloqueado</span>':""].join("");
    const w=String(p.whats||"").replace(/\D/g,"");
    return `<div class="adm-it cad-it"><div class="cad-l1"><span class="t">${esc(p.loja&&p.loja_nome?p.loja_nome:p.nome||"(sem nome)")}</span><span class="cad-tp ${ehMoto(p)?"m":"e"}">${rotulo(p)}</span></div>
      <div class="s">${[p.loja&&p.loja_nome&&p.nome!==p.loja_nome?esc(p.nome):"",esc(p.bairro),vs?esc(vs):"",`Cadastro ${data(p.criado_em)}`].filter(Boolean).join(" · ")}</div>
      <div class="s">${ehMoto(p)?`${p.entregas} entrega${p.entregas==1?"":"s"}`:`${p.pedidos} pedido${p.pedidos==1?"":"s"}`} · Último acesso ${data(p.ultimo_acesso)}</div>
      ${tags.trim()?`<div class="cad-tags">${tags}</div>`:""}
      <div class="cad-ac">${w?`<a href="https://wa.me/55${w}" target="_blank" rel="noopener">WhatsApp ${esc(fone(w))}</a>`:'<span class="s">Sem WhatsApp</span>'}<span class="s">${esc(p.email)}</span></div></div>`}).join("")
    :`<p class="empty">${lista.length?"Ninguém com essa busca.":"Ainda ninguém cadastrado."}</p>`;
  el("cad-mais").hidden=f.length<=mostrar;
  el("cad-mais").textContent=`Ver mais (${f.length-mostrar})`;
}
async function carregar(){
  const card=el("cad-card");if(!card)return;
  if(!sb||!uid||!perfil.admin){card.hidden=true;return}
  card.hidden=false;
  const r=await sb.rpc("cadastros_admin");
  if(r.error){el("cad-lista").innerHTML=`<p class="hint">Rode o cadastros.sql no Supabase.</p>`;return}
  lista=r.data||[];pinta();
}
function planilha(){
  const f=filtrados(),q=v=>`"${String(v??"").replace(/"/g,'""')}"`;
  const linhas=[["Nome","Tipo","Loja","Bairro","WhatsApp","E-mail","Veículos","Documentos","Mercado Pago","Bloqueado","Entregas","Pedidos","Cadastro","Último acesso"],
    ...f.map(p=>[p.nome,rotulo(p),p.loja_nome,p.bairro,fone(p.whats),p.email,(p.veiculos||[]).map(v=>VEI[v]||v).join(", "),
      p.documentos?"Sim":"Não",p.mp?"Sim":"Não",p.bloqueado?"Sim":"Não",p.entregas,p.pedidos,data(p.criado_em),data(p.ultimo_acesso)])];
  const csv="﻿"+linhas.map(l=>l.map(q).join(";")).join("\r\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));
  a.download=`cadastros-cadernex-${new Date().toISOString().slice(0,10)}.csv`;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);
}
document.addEventListener("click",e=>{
  const c=e.target.closest("[data-cf]");if(c&&c.closest("#cad-chips")){filtro=c.dataset.cf;mostrar=PAG;pinta();return}
  if(e.target.closest("#cad-mais")){mostrar+=PAG;pinta();return}
  if(e.target.closest("#cad-csv")){if(!lista.length){toast("Ainda não tem cadastro pra baixar");return}planilha();return}
  if(e.target.closest("#cad-atual")){carregar().then(()=>toast("Lista atualizada"))}
});
document.addEventListener("input",e=>{if(e.target.id==="cad-busca"){busca=e.target.value;mostrar=PAG;pinta()}});
if(typeof go==="function"){const g=go;go=function(v){g(v);if(v==="mais")carregar()}}
const _al=window.agendaLoad;window.agendaLoad=async()=>{await _al();carregar()};
if(uid)setTimeout(carregar,0);
})();
