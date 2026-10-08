/* Cadernex — Resenha: chat entre os entregadores */
const SALAS=[["geral","Geral"],["dicas","Dicas do corre"],["faculdade","Faculdade"]];
let sala="geral",msgs=[],chatOk=true,canal=null,chatAberto=false,naoLidas=0,msgSel=null;
const SIL_KEY="cadernex_silenciados";
let silenciados=(()=>{try{return JSON.parse(localStorage.getItem(SIL_KEY))||[]}catch(e){return[]}})();
function salvaSil(){try{localStorage.setItem(SIL_KEY,JSON.stringify(silenciados))}catch(e){}}

async function chatLoad(){
  if(!sb||!uid)return;
  const r=await sb.from("mensagens").select("*").eq("sala",sala).order("created_at",{ascending:false}).limit(60);
  if(r.error){chatOk=false;chatRender();return}
  chatOk=true;msgs=r.data.reverse();chatRender(true);chatSub();
}
function chatSub(){
  if(canal||!sb.channel)return;
  canal=sb.channel("resenha")
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"mensagens"},p=>{const m=p.new;
      if(m.sala!==sala){return}
      if(msgs.some(x=>x.id===m.id))return;msgs.push(m);if(msgs.length>200)msgs.shift();
      const perto=chatPerto();chatRender(perto||m.user_id===uid);
      if(!chatAberto&&m.user_id!==uid&&!silenciados.includes(m.user_id)){naoLidas++;badge()}})
    .on("postgres_changes",{event:"DELETE",schema:"public",table:"mensagens"},p=>{msgs=msgs.filter(x=>x.id!==p.old.id);chatRender()})
    .on("postgres_changes",{event:"UPDATE",schema:"public",table:"mensagens"},p=>{const m=p.new;if(m.oculta&&m.user_id!==uid&&!perfil.admin)msgs=msgs.filter(x=>x.id!==m.id);else msgs=msgs.map(x=>x.id===m.id?m:x);chatRender()})
    .subscribe();
}
function badge(){const t=document.querySelector('.tab[data-v="chat"]');if(!t)return;let b=t.querySelector(".nb");if(!naoLidas){b&&b.remove();return}if(!b){b=document.createElement("span");b.className="nb";t.appendChild(b)}b.textContent=naoLidas>9?"9+":naoLidas}
function chatPerto(){const el=$("ch-lista");return el.scrollHeight-el.scrollTop-el.clientHeight<120}
const hora=iso=>{const d=new Date(iso),h=new Date();const mesmo=d.toDateString()===h.toDateString();return(mesmo?"":d.toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})+" ")+pad(d.getHours())+":"+pad(d.getMinutes())};

function chatRender(rolar){
  if(!$("v-chat"))return;
  { const lim=Date.now()-864e5; msgs=msgs.filter(m=>new Date(m.created_at).getTime()>lim); } // a Resenha guarda só as últimas 24 horas
  $("ch-erro").hidden=chatOk;
  $("ch-salas").innerHTML=SALAS.map(([k,n])=>`<button type="button" class="chip" data-sala="${k}" aria-pressed="${k===sala}">${n}</button>`).join("");
  const vis=msgs.filter(m=>!silenciados.includes(m.user_id));
  if(!vis.length){$("ch-lista").innerHTML=`<div class="ch-vazio"><b>Ninguém falou nada aqui ainda.</b><span>Puxa o assunto: qual o melhor horário na sua região hoje?</span></div>`}
  else{let h="",ult="";vis.forEach(m=>{const meu=m.user_id===uid,dia=new Date(m.created_at).toDateString();
    if(dia!==ult){ult=dia;h+=`<div class="ch-dia">${new Date(m.created_at).toLocaleDateString("pt-BR",{weekday:"long",day:"2-digit",month:"short"})}</div>`}
    const acoes=msgSel===m.id?`<div class="ch-acoes">${meu||perfil.admin?`<button type="button" data-apagar="${m.id}">Apagar</button>`:""}${meu?"":`<button type="button" data-denunciar="${m.id}">Denunciar</button><button type="button" data-silenciar="${m.user_id}">Silenciar ${esc(m.nome||"")}</button>`}</div>`:"";
    h+=`<div class="ch-m${meu?" meu":""}${m.oculta?" oculta":""}" data-id="${m.id}"><div class="ch-b">${meu?"":`<div class="ch-n">${esc(m.nome||"Entregador")}${m.apoiador?' <span class="selo">Apoiador</span>':""}</div>`}<div class="ch-t"></div><div class="ch-h">${hora(m.created_at)}${m.oculta?" · escondida":""}</div></div>${acoes}</div>`});
    $("ch-lista").innerHTML=h;
    const bs=$("ch-lista").querySelectorAll(".ch-m .ch-t");vis.forEach((m,i)=>bs[i].textContent=m.texto);}
  $("ch-sil").hidden=!silenciados.length;$("ch-sil").textContent=`${silenciados.length} pessoa${silenciados.length>1?"s":""} silenciada${silenciados.length>1?"s":""} · desfazer`;
  if(rolar)requestAnimationFrame(()=>{$("ch-lista").scrollTop=$("ch-lista").scrollHeight});
}

$("ch-salas").addEventListener("click",e=>{const b=e.target.closest("[data-sala]");if(!b||b.dataset.sala===sala)return;sala=b.dataset.sala;msgs=[];msgSel=null;chatRender();chatLoad()});
$("ch-lista").addEventListener("click",e=>{
  const ap=e.target.closest("[data-apagar]"),de=e.target.closest("[data-denunciar]"),si=e.target.closest("[data-silenciar]");
  if(ap){if(ap.dataset.ok!=="1"){ap.dataset.ok="1";ap.textContent="Apagar mesmo?";return}
    safe(async()=>{const{error}=await sb.from("mensagens").delete().eq("id",ap.dataset.apagar);if(error)throw error;msgs=msgs.filter(x=>x.id!==ap.dataset.apagar);msgSel=null;chatRender()},"Mensagem apagada");return}
  if(de){safe(async()=>{const{error}=await sb.from("denuncias").insert({msg_id:de.dataset.denunciar});if(error&&error.code!=="23505")throw error;msgSel=null;chatRender()},"Denúncia enviada. Obrigado.");return}
  if(si){silenciados.push(si.dataset.silenciar);salvaSil();msgSel=null;chatRender();toast("Você não vai mais ver essa pessoa");return}
  const m=e.target.closest(".ch-m");if(!m)return;msgSel=msgSel===m.dataset.id?null:m.dataset.id;chatRender();
});
$("ch-sil").onclick=()=>{silenciados=[];salvaSil();chatRender();toast("Ninguém mais silenciado")};
$("fChat").onsubmit=async e=>{e.preventDefault();const t=$("ch-txt").value.trim();if(!t)return;if(t.length>500){toast("Máximo de 500 letras");return}
  $("ch-env").disabled=true;
  const{data,error}=await sb.from("mensagens").insert({sala,texto:t}).select().single();
  $("ch-env").disabled=false;
  if(error){const m=String(error.message||"");toast(m.includes("Calma")||m.includes("Muitas")?m:"Não enviou. Confira a internet.");return}
  $("ch-txt").value="";$("ch-cont").textContent="";if(!msgs.some(x=>x.id===data.id))msgs.push(data);chatRender(true);$("ch-txt").focus()};
$("ch-txt").addEventListener("input",()=>{const el=$("ch-txt");el.style.height="auto";el.style.height=Math.min(120,el.scrollHeight)+"px";const n=el.value.length;$("ch-cont").textContent=n>400?(500-n)+"":""});
$("ch-txt").addEventListener("keydown",e=>{if(e.key==="Enter"&&!e.shiftKey&&!/Android|iPhone/i.test(navigator.userAgent)){e.preventDefault();$("fChat").requestSubmit()}});

// quando abre a aba
const _go=go;go=function(v){_go(v);chatAberto=v==="chat";document.body.classList.toggle("em-chat",chatAberto);if(chatAberto){naoLidas=0;badge();if(!msgs.length)chatLoad();else chatRender(true)}};
const _agL3=window.agendaLoad;window.agendaLoad=async()=>{await _agL3();chatLoad()};
chatRender();if(uid)chatLoad();
