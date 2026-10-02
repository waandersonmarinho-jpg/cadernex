/* Caderno do Corre — lógica do app (Supabase) */
const CATS=["Gasolina","Manutenção","Alimentação","Celular/Internet","Aluguel da moto","Multa/Taxa","Outro"];
const brl=v=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v||0);
const brl0=v=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0}).format(v||0);
const num=s=>{s=String(s||"").trim().replace(/\s|R\$/g,"");if(s.includes(","))s=s.replace(/\./g,"").replace(",",".");const n=parseFloat(s);return isNaN(n)?0:n};
const pad=n=>String(n).padStart(2,"0");
const ymd=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const hm=d=>pad(d.getHours())+":"+pad(d.getMinutes());
const fmtH=min=>{const h=Math.floor(min/60),m=Math.round(min%60);return h+"h"+(m?pad(m):"")};
const $=id=>document.getElementById(id);
function mins(ini,fim){const[a,b]=ini.split(":").map(Number),[c,d]=fim.split(":").map(Number);let m=(c*60+d)-(a*60+b);if(m<=0)m+=1440;return m}
function toast(t){const el=$("toast");el.textContent=t;el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>el.hidden=true,2400)}
const N=v=>Number(v)||0;

let sb=null,uid=null,turnos=[],gastos=[],perfil={meta:0,nome:"",turno_inicio:null},periodo="semana";

/* ---------------- telas ---------------- */
function show(which){ // "setup" | "auth" | "app"
  $("s-setup").hidden=which!=="setup";$("s-auth").hidden=which!=="auth";if($("s-dados"))$("s-dados").hidden=which!=="dados";
  $("s-app").hidden=which!=="app";$("nav").hidden=which!=="app";
  if(which==="auth"){$("ola").textContent="Envios e entregas";$("sync").textContent="";document.documentElement.classList.remove("area-loja")}
}

/* ---------------- início ---------------- */
async function boot(){
  const c=window.CORRE_CONFIG||{};
  if(!window.supabase||!c.SUPABASE_URL||c.SUPABASE_URL.startsWith("COLE")){show("setup");return}
  sb=window.supabase.createClient(c.SUPABASE_URL,c.SUPABASE_KEY);
  const {data:{session}}=await sb.auth.getSession();
  sb.auth.onAuthStateChange((_e,s)=>{if(s&&s.user&&s.user.id!==uid)enter(s.user);if(!s){uid=null;show("auth")}});
  if(session&&session.user)enter(session.user);else show("auth");
}
async function enter(user){
  uid=user.id;show("app");go("resumo");$("sync").textContent="Carregando…";
  await loadAll();
}
async function loadAll(){
  try{
    const since=new Date();since.setDate(since.getDate()-400);const s=ymd(since);
    const [t,g,p]=await Promise.all([
      sb.from("turnos").select("*").gte("data",s).order("data",{ascending:false}),
      sb.from("despesas").select("*").gte("data",s).order("data",{ascending:false}),
      sb.from("perfis").select("*").eq("user_id",uid).maybeSingle()
    ]);
    if(t.error||g.error||p.error)throw(t.error||g.error||p.error);
    turnos=t.data.map(x=>({...x,ganho:N(x.ganho),gorjeta:N(x.gorjeta),km:N(x.km)}));
    gastos=g.data.map(x=>({...x,valor:N(x.valor)}));
    if(p.data)perfil={...p.data,meta:N(p.data.meta)};
    else{const md=(await sb.auth.getUser()).data.user?.user_metadata||{};const nome=md.nome||"",tipo=md.tipo==="cliente"?"cliente":"entregador";perfil={meta:0,nome,tipo,turno_inicio:null};await sb.from("perfis").upsert({user_id:uid,nome,tipo})}
    $("sync").textContent="Salvo na nuvem";
    if(window.agendaLoad)window.agendaLoad();
  }catch(e){$("sync").textContent="Sem conexão";toast("Não carregou. Confira a internet.")}
  render();
}
async function savePerfil(patch){
  const {error}=await sb.from("perfis").upsert({user_id:uid,...perfil,...patch,updated_at:new Date().toISOString()});
  if(error)throw error;perfil={...perfil,...patch};render();
}
async function safe(fn,ok){try{await fn();if(ok)toast(ok)}catch(e){console.error(e);toast("Não salvou. Confira a internet e tente de novo.")}}

/* ---------------- login ---------------- */
let modo="entrar";
function setModo(m){modo=m;$("a-nome-w").hidden=m!=="criar";$("a-tipo-w").hidden=m!=="criar";$("a-title").textContent=m==="criar"?"Criar conta":"Entrar";
  $("a-btn").textContent=m==="criar"?"Criar minha conta":"Entrar";$("a-swap").textContent=m==="criar"?"Já tenho conta":"Não tenho conta ainda";$("a-msg").textContent=""}
$("a-tipo").addEventListener("click",e=>{const b=e.target.closest("[data-tipo]");if(!b)return;$("a-tipo").querySelectorAll("[data-tipo]").forEach(x=>x.setAttribute("aria-checked",x===b))});
if(/pedir/.test(location.hash)){$("a-tipo").querySelectorAll("[data-tipo]").forEach(x=>x.setAttribute("aria-checked",x.dataset.tipo==="cliente"));document.querySelector("#s-auth .lead").textContent="Peça entregas rápidas com entregadores da sua região.";setTimeout(()=>setModo("criar"),0)}
$("a-swap").onclick=()=>setModo(modo==="criar"?"entrar":"criar");
$("a-reset").onclick=async()=>{const email=$("a-email").value.trim();if(!email){$("a-msg").textContent="Digite seu e-mail acima e toque de novo.";return}
  const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin+location.pathname});
  $("a-msg").textContent=error?"Não deu pra enviar agora. Tente mais tarde.":"Se o e-mail tiver conta, chegou um link pra criar senha nova."};
$("fAuth").onsubmit=async e=>{e.preventDefault();const email=$("a-email").value.trim(),senha=$("a-senha").value;
  if(senha.length<6){$("a-msg").textContent="A senha precisa ter pelo menos 6 caracteres.";return}
  $("a-btn").disabled=true;$("a-msg").textContent="";
  try{
    if(modo==="criar"){const nome=$("a-nome").value.trim();
      const tipo=document.querySelector('#a-tipo [aria-checked="true"]')?.dataset.tipo||"entregador";
      const {data,error}=await sb.auth.signUp({email,password:senha,options:{data:{nome,tipo}}});
      if(error)throw error;if(!data.session)$("a-msg").textContent="Conta criada! Abra seu e-mail e confirme pra entrar.";}
    else{const {error}=await sb.auth.signInWithPassword({email,password:senha});if(error)throw error}
  }catch(err){const m=String(err.message||"");
    $("a-msg").textContent=m.includes("Invalid login")?"E-mail ou senha errados.":m.includes("already registered")?"Esse e-mail já tem conta. Toque em \"Já tenho conta\".":m.includes("confirm")?"Confirme seu e-mail antes de entrar.":/rate limit|too many/i.test(m)?"Muitos cadastros agora. Espere alguns minutos e tente de novo.":/Password should|weak/i.test(m)?"Senha fraca. Use pelo menos 6 caracteres, misturando letras e números.":/invalid.*email|email.*invalid/i.test(m)?"Esse e-mail não parece válido. Confira e tente de novo.":/fetch|network/i.test(m)?"Sem conexão. Confira a internet e tente de novo.":"Não deu certo agora. Tente de novo em instantes."}
  $("a-btn").disabled=false};
$("sair").onclick=async()=>{await sb.auth.signOut();turnos=[];gastos=[];perfil={meta:0};if(typeof agenda!=="undefined"){agenda=[];tarefas=[];gfac=[]}if(typeof cofre!=="undefined")cofre=[];document.body.classList.remove("cli");if(typeof papelAplicado!=="undefined")papelAplicado=null;};

/* recuperação de senha: quando volta pelo link do e-mail */
if(location.hash.includes("type=recovery")){setTimeout(async()=>{
  const nova=window.prompt("Digite sua senha nova (mínimo 6 caracteres):");
  if(nova&&nova.length>=6&&sb){const {error}=await sb.auth.updateUser({password:nova});toast(error?"Não trocou a senha":"Senha trocada")}},1500)}

/* ---------------- período ---------------- */
function range(p){const n=new Date();const e=ymd(n);if(p==="hoje")return[e,e];
  if(p==="semana"){const d=new Date(n);const wd=(d.getDay()+6)%7;d.setDate(d.getDate()-wd);return[ymd(d),e]}
  return[e.slice(0,8)+"01",e]}
const inR=(d,[a,b])=>d>=a&&d<=b;

function render(){
  $("ola").textContent=perfil.nome?"Oi, "+perfil.nome.split(" ")[0]:"Envios e entregas";
  const r=range(periodo);
  const T=turnos.filter(t=>inR(t.data,r)),G=gastos.filter(g=>inR(g.data,r));
  const bruto=T.reduce((s,t)=>s+t.ganho+t.gorjeta,0),desp=G.reduce((s,g)=>s+g.valor,0);
  const min=T.reduce((s,t)=>s+(t.minutos||0),0),km=T.reduce((s,t)=>s+t.km,0),liq=bruto-desp;
  $("liq").textContent=brl(liq);$("liq").className="big num"+(liq<0?" neg":"");
  $("bruto").textContent=brl0(bruto);$("desp").textContent=brl0(desp);$("horas").textContent=fmtH(min);$("nturnos").textContent=T.length;
  $("phora").textContent=min?brl(liq/(min/60)):"—";$("pkm").textContent=km?brl(bruto/km):"—";$("pkmBox").hidden=!km;$("nturnosBox").classList.toggle("wide",!km);
  const w=range("semana");const wl=turnos.filter(t=>inR(t.data,w)).reduce((s,t)=>s+t.ganho+t.gorjeta,0)-gastos.filter(g=>inR(g.data,w)).reduce((s,g)=>s+g.valor,0);
  if(perfil.meta>0){const pc=Math.max(0,Math.min(100,wl/perfil.meta*100));$("metaBar").style.width=pc+"%";$("metaPc").textContent=Math.floor(pc)+"%";$("metaTxt").textContent=brl0(wl)+" de "+brl0(perfil.meta)+(wl<perfil.meta?" · faltam "+brl0(perfil.meta-wl):" · batida!")}
  else{$("metaPc").textContent="";$("metaBar").style.width="0%";$("metaTxt").textContent="defina em Histórico → Ajustes"}
  const days=[];for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);days.push(d)}
  const vals=days.map(d=>{const k=ymd(d);return turnos.filter(t=>t.data===k).reduce((s,t)=>s+t.ganho+t.gorjeta,0)-gastos.filter(g=>g.data===k).reduce((s,g)=>s+g.valor,0)});
  const mx=Math.max(1,...vals.map(v=>Math.max(0,v)));const wn=["dom","seg","ter","qua","qui","sex","sáb"];
  $("chart").innerHTML=days.map((d,i)=>{const v=vals[i],h=v>0?Math.max(3,v/mx*88):0;return`<div class="col"><em class="num">${v>0?Math.round(v):""}</em><div class="b ${v>0?"":"zero"}" style="height:${h?h+"px":"2px"}"></div><span>${wn[d.getDay()]}</span></div>`}).join("");
  const fx={"Manhã (6–12h)":[6,12],"Almoço (11–14h)":[11,14],"Tarde (14–18h)":[14,18],"Janta (18–23h)":[18,23],"Madrugada":[23,30]};
  const agg={};turnos.forEach(t=>{if(!t.inicio||!t.minutos)return;let h=+t.inicio.split(":")[0];if(h<6)h+=24;for(const[k,[a,b]]of Object.entries(fx)){if(h>=a&&h<b){agg[k]=agg[k]||{g:0,m:0};agg[k].g+=t.ganho+t.gorjeta;agg[k].m+=t.minutos;break}}});
  const rk=Object.entries(agg).filter(([,v])=>v.m>=60).map(([k,v])=>[k,v.g/(v.m/60)]).sort((a,b)=>b[1]-a[1]);
  $("best").innerHTML=rk.length?rk.map(([k,v],i)=>`<div class="row" style="color:var(--fg);padding:4px 0"><span>${i===0?"<b>"+k+"</b>":k}</span><span class="num">${brl(v)}/h bruto</span></div>`).join("")+`<p class="hint" style="margin-top:6px">Conta pelo horário em que o turno começou.</p>`:"Registre alguns turnos que eu mostro em qual faixa do dia você ganha mais por hora.";
  if(perfil.turno_inicio){$("timerLbl").textContent="Em turno desde "+hm(new Date(perfil.turno_inicio));$("timerBtn").textContent="Encerrar turno"}
  else{$("timerLbl").textContent="Fora de turno";$("timerBtn").textContent="Começar turno";$("clock").textContent="00:00"}
  const d30=new Date();d30.setDate(d30.getDate()-29);const r30=[ymd(d30),ymd(new Date())];
  const T30=turnos.filter(t=>inR(t.data,r30)),m30=T30.reduce((s,t)=>s+(t.minutos||0),0);
  const l30=T30.reduce((s,t)=>s+t.ganho+t.gorjeta,0)-gastos.filter(g=>inR(g.data,r30)).reduce((s,g)=>s+g.valor,0);
  $("l-hora").textContent=m30?brl(l30/(m30/60)):"anote turnos";
  tick();renderHist();
  if(typeof agendaRender==="function"&&typeof agenda!=="undefined"){agendaRender();gfacRender()}
  if(typeof negocioRender==="function"&&typeof cofre!=="undefined")negocioRender();
  if(document.activeElement!==$("c-meta"))$("c-meta").value=perfil.meta?String(perfil.meta).replace(".",","):"";
  if(document.activeElement!==$("c-nome"))$("c-nome").value=perfil.nome||"";
}
const VELHO=14*60; // minutos: turno aberto há mais de 14h provavelmente foi esquecido
function tick(){const v=$("turnoVelho");if(perfil.turno_inicio){const m=Math.max(0,Math.floor((Date.now()-new Date(perfil.turno_inicio))/60000));$("clock").textContent=pad(Math.floor(m/60))+":"+pad(m%60);
  v.hidden=m<VELHO;if(m>=VELHO)v.innerHTML=`<b>Esqueceu de encerrar?</b> Esse turno está aberto há ${Math.floor(m/60)} horas. Toque em <b>Encerrar turno</b> e coloque o horário em que você parou de verdade.`}else v.hidden=true}
setInterval(tick,20000);

function renderHist(){
  const all=[...turnos.map(t=>({...t,k:"turnos",v:t.ganho+t.gorjeta,t:"Turno · "+fmtH(t.minutos||0),s:`${t.inicio||""}–${t.fim||""}${t.km?" · "+t.km+" km":""}${t.entregas?" · "+t.entregas+" entregas":""}${t.gorjeta?" · gorjeta "+brl(t.gorjeta):""}`,o:t.inicio||""})),
    ...gastos.map(g=>({...g,k:"despesas",v:-g.valor,t:g.categoria,s:g.nota||"",o:"99"}))].sort((a,b)=>b.data.localeCompare(a.data)||b.o.localeCompare(a.o));
  if(!all.length){$("hist").innerHTML=`<p class="empty">Nada anotado ainda. Use <b>Turno</b> para registrar o que ganhou e <b>Despesa</b> para gasolina, manutenção e o resto.</p>`;return}
  const list=all.slice(0,200);let last="",h="";const f=new Intl.DateTimeFormat("pt-BR",{weekday:"short",day:"2-digit",month:"short"});
  for(const x of list){if(x.data!==last){last=x.data;const[y,m,d]=x.data.split("-").map(Number);h+=`<div class="daylabel">${f.format(new Date(y,m-1,d))}</div>`}
    h+=`<div class="item"><div class="l"><div class="t"></div><div class="s"></div></div><div class="v num ${x.v<0?"neg":"pos"}">${x.v<0?"−":""}${brl(Math.abs(x.v))}</div><button class="del" data-k="${x.k}" data-id="${x.id}" aria-label="Apagar">✕</button></div>`}
  $("hist").innerHTML=h;
  const items=$("hist").querySelectorAll(".item");list.forEach((x,i)=>{items[i].querySelector(".t").textContent=x.t;items[i].querySelector(".s").textContent=x.s});
}
$("hist").addEventListener("click",e=>{const b=e.target.closest(".del");if(!b)return;
  if(!b.classList.contains("armed")){document.querySelectorAll(".del.armed").forEach(x=>{x.classList.remove("armed");x.textContent="✕"});b.classList.add("armed");b.textContent="Apagar?";return}
  safe(async()=>{const {error}=await sb.from(b.dataset.k).delete().eq("id",b.dataset.id);if(error)throw error;
    if(b.dataset.k==="turnos")turnos=turnos.filter(x=>x.id!==b.dataset.id);else gastos=gastos.filter(x=>x.id!==b.dataset.id);render()},"Apagado")});

/* ---------------- calculadora da reserva ---------------- */
$("r-gasto").addEventListener("input",()=>{const g=num($("r-gasto").value);
  if(g<=0){$("r-out").innerHTML='<span class="hint">Digite o valor pra ver sua meta.</span>';return}
  $("r-out").innerHTML=`<div><span>Mínimo (1 mês)</span><b class="num">${brl0(g)}</b></div><div><span>Boa (3 meses)</span><b class="num">${brl0(g*3)}</b></div><div><span>Ideal (6 meses)</span><b class="num">${brl0(g*6)}</b></div><p>Pra juntar 3 meses em 1 ano, guarde uns <b>${brl0(g*3/12)}</b> por mês, ou <b>${brl0(g*3/12/26)}</b> por dia rodado (26 dias por mês).</p>`});

/* ---------------- aba Corpo ---------------- */
function nextDose(){const n=new Date(),m=n.getHours()*60+n.getMinutes();let h,txt,lbl="Próxima dose";
  if(m<11*60){h=11;txt="30g de whey antes do pico do almoço."}
  else if(m<14*60){h=null;txt="Pico do almoço. Depois dele, almoço completo."}
  else if(m<19*60){h=19;txt="30g de whey antes do pico da janta."}
  else if(m<22*60){h=null;txt="Pico da janta. Bom corre e beba água."}
  else{h=11;lbl="Amanhã";txt="Jantar leve e dormir bem. Próxima dose às 11h."}
  if(h===null){$("n-lbl").textContent="Agora";$("n-hora").textContent="Pico";}
  else{const f=h*60-m;$("n-lbl").textContent=lbl;$("n-hora").textContent=pad(h)+":00";if(f>0&&f<=180)txt+=" Faltam "+(f>=60?Math.floor(f/60)+"h":"")+pad(f%60)+"min."}
  $("n-txt").textContent=txt}
nextDose();setInterval(nextDose,60000);
function wCalc(){const p=num($("w-preco").value),kg=num($("w-kg").value);
  if(p<=0||kg<=0){$("w-out").innerHTML='<span class="hint">Preencha pra ver o custo por mês.</span>';return}
  const pk=p/kg,mes=pk*0.06*30;
  $("w-out").innerHTML=`<div><span>Por kg</span><b class="num">${brl0(pk)}</b></div><div><span>Por dia (60g)</span><b class="num">${brl(pk*0.06)}</b></div><div><span>Por mês</span><b class="num">${brl0(mes)}</b></div><p>O pote dura uns <b>${Math.floor(kg/0.06)} dias</b>.</p>`}
$("w-preco").addEventListener("input",wCalc);$("w-kg").addEventListener("input",wCalc);

/* ---------------- exportar planilha (CSV) ---------------- */
$("exportar").onclick=()=>{
  const q=v=>'"'+String(v??"").replace(/"/g,'""')+'"';const d=v=>String(v).replace(".",",");
  const L=["tipo;data;app_ou_categoria;inicio;fim;horas;ganho;gorjeta;km;entregas;despesa;observacao"];
  turnos.forEach(t=>L.push(["turno",t.data,q("Cadernex"),t.inicio,t.fim,d((t.minutos/60).toFixed(2)),d(t.ganho),d(t.gorjeta),d(t.km),t.entregas,"",""].join(";")));
  gastos.forEach(g=>L.push(["despesa",g.data,q(g.categoria),"","","","","","","",d(g.valor),q(g.nota)].join(";")));
  const blob=new Blob(["﻿"+L.join("\n")],{type:"text/csv;charset=utf-8"});const a=document.createElement("a");
  a.href=URL.createObjectURL(blob);a.download="caderno-do-corre-"+ymd(new Date())+".csv";document.body.appendChild(a);a.click();a.remove();toast("Planilha baixada")};

/* ---------------- navegação e formulários ---------------- */
const TAB_DE={config:"mais",hist:"mais",aprender:"mais",corpo:"mais",negocio:"mais",pedir:"mais",pedidos:"mais",gasto:"turno"};
function go(v){document.querySelectorAll(".view").forEach(s=>s.hidden=s.id!=="v-"+v);const t0=document.body.classList.contains("cli")?(v==="config"?"perfilc":v==="pedir"&&document.documentElement.classList.contains("area-loja")?"loja":v):(TAB_DE[v]||v);document.querySelectorAll(".tab").forEach(t=>{if(t.dataset.v===t0)t.setAttribute("aria-current","page");else t.removeAttribute("aria-current")});scrollTo(0,0)}
document.addEventListener("click",e=>{const b=e.target.closest("[data-go]");if(b)go(b.dataset.go)});
document.querySelectorAll(".tab").forEach(t=>t.onclick=()=>go(t.dataset.v));
document.querySelectorAll(".seg button").forEach(b=>b.onclick=()=>{periodo=b.dataset.p;document.querySelectorAll(".seg button").forEach(x=>x.setAttribute("aria-pressed",x===b));render()});
function chips(el,list,sel){el.innerHTML="";list.forEach(n=>{const c=document.createElement("button");c.type="button";c.className="chip";c.textContent=n;c.setAttribute("aria-pressed",n===sel);c.onclick=()=>{el.querySelectorAll(".chip").forEach(x=>x.setAttribute("aria-pressed",x===c))};el.appendChild(c)})}
const picked=el=>el.querySelector('[aria-pressed="true"]')?.textContent||"";
chips($("g-cats"),CATS,"Gasolina");
function resetTurno(){const n=new Date();$("t-data").value=ymd(n);$("t-fim").value=hm(n);$("t-ini").value=hm(new Date(n-4*3600e3));["t-ganho","t-gorj","t-km","t-ent"].forEach(i=>$(i).value="");$("turnoTitle").textContent="Anotar turno";$("turnoTitle").dataset.fechando=""}
resetTurno();$("g-data").value=ymd(new Date());

$("timerBtn").onclick=()=>{
  if(perfil.turno_inicio){const s=new Date(perfil.turno_inicio),n=new Date();$("t-data").value=ymd(s);$("t-ini").value=hm(s);const velho=(n-s)/60000>=VELHO;$("t-fim").value=velho?"":hm(n);$("turnoTitle").dataset.fechando="1";$("turnoTitle").textContent=velho?"Que horas você parou nesse dia?":"Fechar turno: quanto ganhou?";go("turno");if(velho){toast("O turno ficou aberto "+Math.floor((n-s)/3600e3)+" horas. Coloque o horário em que parou.");$("t-fim").focus()}else $("t-ganho").focus()}
  else safe(()=>savePerfil({turno_inicio:new Date().toISOString()}),"Turno iniciado. Bom corre!")};

$("fTurno").onsubmit=e=>{e.preventDefault();const ganho=num($("t-ganho").value),gorjeta=num($("t-gorj").value);if(ganho<=0&&gorjeta<=0){toast("Coloque quanto ganhou");return}
  const o={data:$("t-data").value,inicio:$("t-ini").value,fim:$("t-fim").value,minutos:mins($("t-ini").value,$("t-fim").value),app:"Cadernex",ganho,gorjeta,km:num($("t-km").value),entregas:Math.round(num($("t-ent").value))};
  const fechando=$("turnoTitle").dataset.fechando==="1";
  safe(async()=>{const {data,error}=await sb.from("turnos").insert(o).select().single();if(error)throw error;
    turnos.unshift({...data,ganho:N(data.ganho),gorjeta:N(data.gorjeta),km:N(data.km)});
    if(fechando)await savePerfil({turno_inicio:null});resetTurno();render();go("resumo")},"Turno salvo")};

$("fGasto").onsubmit=e=>{e.preventDefault();const v=num($("g-valor").value);if(v<=0){toast("Coloque o valor");return}
  safe(async()=>{const {data,error}=await sb.from("despesas").insert({data:$("g-data").value,categoria:picked($("g-cats")),valor:v,nota:$("g-nota").value.trim()}).select().single();if(error)throw error;
    gastos.unshift({...data,valor:N(data.valor)});$("g-valor").value="";$("g-nota").value="";render();go("resumo")},"Despesa salva")};

$("fCfg").onsubmit=e=>{e.preventDefault();safe(()=>savePerfil({meta:num($("c-meta").value),nome:$("c-nome").value.trim()}),"Ajustes salvos")};

/* volta a sincronizar quando o app volta pra tela (ex.: usou em outro celular) */
document.addEventListener("visibilitychange",()=>{if(!document.hidden&&uid)loadAll()});

if("serviceWorker" in navigator){const tinha=!!navigator.serviceWorker.controller;let rec=false;navigator.serviceWorker.addEventListener("controllerchange",()=>{if(tinha&&!rec&&!document.querySelector("input:focus,textarea:focus")){rec=true;location.reload()}});navigator.serviceWorker.register("sw.js").catch(()=>{})}
boot();
