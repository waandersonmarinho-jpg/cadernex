/* Cadernex — Agenda: faculdade + trabalhos + janelas de pico */
let agenda=[],tarefas=[],agDia=new Date().getDay(),agOk=true;
const DIAS=["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
const DIAS_L=["domingo","segunda","terça","quarta","quinta","sexta","sábado"];
const PICOS=[[11*60,14*60,"Pico do almoço"],[18*60,22*60,"Pico da janta"]];
const DIA_INI=6*60,DIA_FIM=24*60;
const toMin=s=>{const[a,b]=String(s||"0:0").split(":").map(Number);return a*60+(b||0)};
const toHM=m=>pad(Math.floor(m/60)%24)+":"+pad(m%60);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

/* ---------- dados ---------- */
async function agendaLoad(){
  if(!sb||!uid)return;
  const [a,t]=await Promise.all([sb.from("agenda").select("*"),sb.from("tarefas").select("*").order("data")]);
  if(a.error||t.error){agOk=false;agendaRender();return}
  agOk=true;agenda=a.data;tarefas=t.data.map(x=>({...x,nota:x.nota==null?null:Number(x.nota)}));agendaRender();
}
window.agendaLoad=agendaLoad;

/* ---------- cálculo ---------- */
function blocosDoDia(d){return agenda.filter(b=>(b.dias||[]).includes(d)).map(b=>{const i=toMin(b.inicio);let f=toMin(b.fim);if(f<=i)f=DIA_FIM;return{...b,i,f}}).sort((x,y)=>x.i-y.i)}
function merge(iv){iv=iv.slice().sort((a,b)=>a[0]-b[0]);const o=[];for(const x of iv){if(o.length&&x[0]<=o[o.length-1][1])o[o.length-1][1]=Math.max(o[o.length-1][1],x[1]);else o.push([x[0],x[1]])}return o}
function subtrai(base,tira){let r=[base];for(const[a,b]of tira){const n=[];for(const[x,y]of r){if(b<=x||a>=y){n.push([x,y]);continue}if(a>x)n.push([x,a]);if(b<y)n.push([b,y])}r=n}return r}
function taxas(){ // R$/h bruto por pico, a partir do histórico
  const g={0:{v:0,m:0},1:{v:0,m:0}},all={v:0,m:0};
  turnos.forEach(t=>{if(!t.minutos)return;const v=(t.ganho||0)+(t.gorjeta||0);all.v+=v;all.m+=t.minutos;const h=toMin(t.inicio);
    if(h>=10*60&&h<15*60){g[0].v+=v;g[0].m+=t.minutos}else if(h>=17*60&&h<23*60){g[1].v+=v;g[1].m+=t.minutos}});
  const avg=all.m>=60?all.v/(all.m/60):null;
  return[g[0].m>=60?g[0].v/(g[0].m/60):avg,g[1].m>=60?g[1].v/(g[1].m/60):avg];
}
function planoDoDia(d){
  const desl=Number(perfil.deslocamento??30)||0,bl=blocosDoDia(d);
  const ocupado=merge(bl.map(b=>[Math.max(DIA_INI,b.i-desl),Math.min(DIA_FIM,b.f+desl)]));
  const livre=subtrai([DIA_INI,DIA_FIM],ocupado);const tx=taxas();
  const janelas=[];PICOS.forEach(([a,b,nome],k)=>{livre.forEach(([x,y])=>{const i=Math.max(a,x),f=Math.min(b,y);if(f-i>=45)janelas.push({i,f,nome,est:tx[k]!=null?tx[k]*(f-i)/60:null})})});
  const estudo=[];livre.forEach(iv=>subtrai(iv,PICOS.map(p=>[p[0],p[1]])).forEach(([i,f])=>{if(f-i>=60)estudo.push({i,f})}));
  return{bl,janelas,estudo,min:janelas.reduce((s,j)=>s+j.f-j.i,0),est:janelas.every(j=>j.est!=null)?janelas.reduce((s,j)=>s+j.est,0):null};
}

/* ---------- desenho ---------- */
function agendaRender(){
  if(!$("v-agenda"))return;
  $("ag-erro").hidden=agOk;
  $("ag-dias").innerHTML=DIAS.map((n,i)=>`<button type="button" class="chip${i===new Date().getDay()?" hoje":""}" data-d="${i}" aria-pressed="${i===agDia}">${n}</button>`).join("");
  const p=planoDoDia(agDia),H=30,top=m=>((m-DIA_INI)/60*H);
  let h="";for(let x=6;x<=24;x++)h+=`<div class="tl-h" style="top:${(x-6)*H}px"><span>${pad(x%24)}h</span></div>`;
  PICOS.forEach(([a,b])=>h+=`<div class="tl-pico" style="top:${top(a)}px;height:${top(b)-top(a)}px"></div>`);
  p.bl.forEach(b=>{const i=Math.max(b.i,DIA_INI),f=Math.min(b.f,DIA_FIM);if(f<=i)return;h+=`<div class="tl-b t-${b.tipo}" style="top:${top(i)}px;height:${Math.max(18,top(f)-top(i))}px"><b>${esc(b.titulo)}</b><span>${b.inicio}–${b.fim}${b.local?" · "+esc(b.local):""}</span></div>`});
  p.janelas.forEach(j=>h+=`<div class="tl-b t-rodar" style="top:${top(j.i)}px;height:${top(j.f)-top(j.i)}px"><b>Rodar</b><span>${toHM(j.i)}–${toHM(j.f)}${j.est!=null?" · ~"+brl0(j.est):""}</span></div>`);
  $("ag-tl").style.height=(18*H)+"px";$("ag-tl").innerHTML=h;
  $("ag-diatit").textContent=(agDia===new Date().getDay()?"Hoje, ":"")+DIAS_L[agDia];
  $("ag-diares").innerHTML=p.janelas.length?`${fmtH(p.min)} de pico livre${p.est!=null?` · dá uns <b>${brl0(p.est)}</b>`:""}`:"Sem janela de pico livre nesse dia.";
  const noite=p.bl.some(b=>b.tipo==="aula"&&b.i<22*60&&b.f>18*60);
  $("ag-noite").hidden=!noite;
  $("ag-estudo").innerHTML=p.estudo.length?"Livre fora do pico, bom pra estudar: "+p.estudo.map(e=>`<b>${toHM(e.i)}–${toHM(e.f)}</b>`).join(", "):"";

  // semana
  let tot=0,totE=0,okE=true;
  $("ag-semana").innerHTML=[1,2,3,4,5,6,0].map(d=>{const q=planoDoDia(d);tot+=q.min;if(q.est==null)okE=false;else totE+=q.est;
    return`<tr${d===agDia?' class="sel"':""} data-d="${d}"><td>${DIAS[d]}</td><td>${q.janelas.map(j=>toHM(j.i)+"–"+toHM(j.f)).join("<br>")||'<span class="hint">—</span>'}</td><td class="num">${q.min?fmtH(q.min):""}</td><td class="num">${q.est!=null&&q.min?brl0(q.est):""}</td></tr>`}).join("");
  $("ag-semtot").innerHTML=tot?`Na semana: <b>${fmtH(tot)}</b> de pico livre${okE?` · potencial de <b>${brl0(totE)}</b>`:""}`:"Cadastre suas aulas e trabalhos pra ver onde encaixar as entregas.";
  $("ag-semnota").textContent=taxas()[0]!=null?"Estimativa usando o seu ganho por hora nos picos, tirado dos seus turnos.":"Anote alguns turnos pra aparecer quanto dá pra ganhar em cada janela.";

  // grade cadastrada
  $("ag-grade").innerHTML=agenda.length?agenda.slice().sort((a,b)=>a.tipo.localeCompare(b.tipo)||toMin(a.inicio)-toMin(b.inicio)).map(b=>`<div class="item"><span class="dot t-${b.tipo}"></span><div class="l"><div class="t">${esc(b.titulo)}</div><div class="s">${(b.dias||[]).slice().sort((x,y)=>((x+6)%7)-((y+6)%7)).map(d=>DIAS[d]).join(", ")} · ${b.inicio}–${b.fim}${b.local?" · "+esc(b.local):""}</div></div><button class="del" data-ag="${b.id}" aria-label="Apagar">✕</button></div>`).join(""):`<p class="empty">Nada cadastrado ainda. Comece pelas aulas da faculdade e pelo horário do seu outro trabalho.</p>`;

  // provas e trabalhos
  const hoje=ymd(new Date()),dd=d=>Math.round((new Date(d+"T12:00")-new Date(hoje+"T12:00"))/864e5);
  const pend=tarefas.filter(t=>!t.feito),feitas=tarefas.filter(t=>t.feito).slice(-8).reverse();
  const f=new Intl.DateTimeFormat("pt-BR",{weekday:"short",day:"2-digit",month:"short"});
  const linha=t=>{const n=dd(t.data),[y,m,d]=t.data.split("-").map(Number);const pill=t.feito?"":n<0?'<span class="pill p-bad">atrasado</span>':n===0?'<span class="pill p-bad">hoje</span>':n<=3?`<span class="pill p-bad">${n===1?"amanhã":n+" dias"}</span>`:n<=7?`<span class="pill p-warn">${n} dias</span>`:`<span class="pill">${n} dias</span>`;
    return`<div class="item${t.feito?" done":""}"><button class="chk" data-tf="${t.id}" aria-pressed="${t.feito}" aria-label="Marcar como feito"></button><div class="l"><div class="t">${esc(t.titulo)}</div><div class="s">${{prova:"Prova",trabalho:"Trabalho",leitura:"Leitura"}[t.tipo]}${t.materia?" · "+esc(t.materia):""} · ${f.format(new Date(y,m-1,d))}${t.nota!=null?" · nota "+String(t.nota).replace(".",","):""}</div></div>${pill}<button class="del" data-tx="${t.id}" aria-label="Apagar">✕</button></div>`};
  $("ag-tarefas").innerHTML=(pend.length?pend.map(linha).join(""):`<p class="empty">Nenhuma prova ou trabalho pendente.</p>`)+(feitas.length?`<div class="daylabel">Feitos</div>`+feitas.map(linha).join(""):"");

  // matérias no formulário de provas
  const mats=[...new Set(agenda.filter(b=>b.tipo==="aula").map(b=>b.titulo))];
  $("tf-mats").innerHTML=mats.map(m=>`<option value="${esc(m)}"></option>`).join("");
  if(document.activeElement!==$("ag-desl"))$("ag-desl").value=perfil.deslocamento??30;
  hojeCard();
}

function hojeCard(){
  const el=$("hojeCard");if(!el)return;
  if(!agenda.length&&!tarefas.length){el.hidden=true;return}
  el.hidden=false;const d=new Date().getDay(),p=planoDoDia(d),agora=new Date().getHours()*60+new Date().getMinutes();
  const itens=[...p.bl.map(b=>({i:b.i,f:b.f,t:b.titulo,k:b.tipo})),...p.janelas.map(j=>({i:j.i,f:j.f,t:"Rodar · "+j.nome.replace("Pico do ","").replace("Pico da ",""),k:"rodar",e:j.est}))].filter(x=>x.f>agora).sort((a,b)=>a.i-b.i).slice(0,4);
  const hoje=ymd(new Date());const prox=tarefas.filter(t=>!t.feito&&t.data>=hoje).slice(0,1)[0];
  $("hojeList").innerHTML=(itens.length?itens.map(x=>`<div class="hj"><span class="dot t-${x.k}"></span><span class="num">${toHM(x.i)}–${toHM(x.f)}</span><span>${esc(x.t)}${x.e!=null&&x.k==="rodar"?" · ~"+brl0(x.e):""}</span></div>`).join(""):`<p class="hint" style="margin:0">Nada mais na agenda hoje.</p>`)+(prox?`<p class="hint" style="margin:6px 0 0">Próxima entrega: <b>${esc(prox.titulo)}</b> (${prox.data.split("-").reverse().slice(0,2).join("/")})</p>`:"");
}

/* ---------- ações ---------- */
$("ag-dias").addEventListener("click",e=>{const b=e.target.closest("[data-d]");if(!b)return;agDia=+b.dataset.d;agendaRender()});
$("ag-semana").addEventListener("click",e=>{const r=e.target.closest("tr[data-d]");if(!r)return;agDia=+r.dataset.d;agendaRender();$("ag-diatit").scrollIntoView({behavior:"smooth",block:"start"})});
chips($("ab-tipo"),["Aula","Trabalho","Outro"],"Aula");
(function(){const el=$("ab-dias");[1,2,3,4,5,6,0].forEach(d=>{const c=document.createElement("button");c.type="button";c.className="chip";c.textContent=DIAS[d];c.dataset.d=d;c.setAttribute("aria-pressed","false");c.onclick=()=>c.setAttribute("aria-pressed",c.getAttribute("aria-pressed")!=="true");el.appendChild(c)})})();
chips($("tf-tipo"),["Prova","Trabalho","Leitura"],"Prova");
$("tf-data").value=ymd(new Date(Date.now()+7*864e5));

$("fAgenda").onsubmit=e=>{e.preventDefault();
  const dias=[...$("ab-dias").querySelectorAll('[aria-pressed="true"]')].map(c=>+c.dataset.d);
  const titulo=$("ab-tit").value.trim();if(!titulo){toast("Coloque o nome");return}if(!dias.length){toast("Escolha pelo menos um dia");return}
  const o={tipo:picked($("ab-tipo")).toLowerCase(),titulo,dias,inicio:$("ab-ini").value,fim:$("ab-fim").value,local:$("ab-local").value.trim()||null};
  safe(async()=>{const{data,error}=await sb.from("agenda").insert(o).select().single();if(error)throw error;agenda.push(data);
    $("ab-tit").value="";$("ab-local").value="";$("ab-dias").querySelectorAll(".chip").forEach(c=>c.setAttribute("aria-pressed","false"));agendaRender()},"Salvo na agenda")};

$("fTarefa").onsubmit=e=>{e.preventDefault();const titulo=$("tf-tit").value.trim();if(!titulo){toast("Escreva o que é");return}
  const o={tipo:picked($("tf-tipo")).toLowerCase(),titulo,materia:$("tf-mat").value.trim()||null,data:$("tf-data").value};
  safe(async()=>{const{data,error}=await sb.from("tarefas").insert(o).select().single();if(error)throw error;tarefas.push({...data,nota:null});tarefas.sort((a,b)=>a.data.localeCompare(b.data));
    $("tf-tit").value="";agendaRender()},"Anotado")};

$("fDesl").onsubmit=e=>{e.preventDefault();const v=Math.max(0,Math.min(180,Math.round(num($("ag-desl").value))));safe(async()=>{await savePerfil({deslocamento:v});agendaRender()},"Deslocamento salvo")};

function armar(b,fn){if(!b.classList.contains("armed")){document.querySelectorAll(".del.armed").forEach(x=>{x.classList.remove("armed");x.textContent="✕"});b.classList.add("armed");b.textContent="Apagar?";return}fn()}
$("ag-grade").addEventListener("click",e=>{const b=e.target.closest("[data-ag]");if(!b)return;armar(b,()=>safe(async()=>{const{error}=await sb.from("agenda").delete().eq("id",b.dataset.ag);if(error)throw error;agenda=agenda.filter(x=>x.id!==b.dataset.ag);agendaRender()},"Apagado"))});
$("ag-tarefas").addEventListener("click",e=>{
  const c=e.target.closest("[data-tf]");if(c){const t=tarefas.find(x=>x.id===c.dataset.tf);if(!t)return;const feito=!t.feito;
    safe(async()=>{const{error}=await sb.from("tarefas").update({feito}).eq("id",t.id);if(error)throw error;t.feito=feito;agendaRender()},feito?"Feito!":null);return}
  const d=e.target.closest("[data-tx]");if(d)armar(d,()=>safe(async()=>{const{error}=await sb.from("tarefas").delete().eq("id",d.dataset.tx);if(error)throw error;tarefas=tarefas.filter(x=>x.id!==d.dataset.tx);agendaRender()},"Apagado"));
});
setInterval(hojeCard,60000);

/* ---------- gastos da faculdade ---------- */
let gfac=[];const GCATS=["Mensalidade","Matrícula","Livros/Material","Xerox/Impressão","Transporte","Alimentação","Outro"];
async function gfacLoad(){const r=await sb.from("gastos_fac").select("*").order("data",{ascending:false});if(r.error){agOk=false;agendaRender();return}gfac=r.data.map(x=>({...x,valor:Number(x.valor)||0}));gfacRender()}
function gfacRender(){
  const hoje=ymd(new Date()),mes=hoje.slice(0,7),ano=hoje.slice(0,4),sem=hoje.slice(5,7)<="06"?[ano+"-01",ano+"-06"]:[ano+"-07",ano+"-12"];
  const doMes=gfac.filter(g=>g.data.slice(0,7)===mes),tm=doMes.reduce((s,g)=>s+g.valor,0);
  const ts=gfac.filter(g=>g.data.slice(0,7)>=sem[0]&&g.data.slice(0,7)<=sem[1]).reduce((s,g)=>s+g.valor,0),tt=gfac.reduce((s,g)=>s+g.valor,0);
  $("gf-mes").textContent=brl(tm);$("gf-sem").textContent=brl0(ts);$("gf-tot").textContent=brl0(tt);
  // horas de entrega pra pagar o mês
  const d30=new Date();d30.setDate(d30.getDate()-29);const r=[ymd(d30),hoje];const T=turnos.filter(t=>t.data>=r[0]&&t.data<=r[1]);const m=T.reduce((s,t)=>s+(t.minutos||0),0);
  const liq=T.reduce((s,t)=>s+t.ganho+t.gorjeta,0)-gastos.filter(g=>g.data>=r[0]&&g.data<=r[1]).reduce((s,g)=>s+g.valor,0);const ph=m>=60?liq/(m/60):null;
  $("gf-horas").innerHTML=tm&&ph>0?`Pra pagar a faculdade deste mês você precisa de uns <b>${fmtH(Math.ceil(tm/ph*60))}</b> de entrega (pelo seu ganho de ${brl(ph)}/h).`:tm?"Anote turnos pra ver quantas horas de entrega pagam a faculdade.":"";
  // por categoria (mês)
  const cat={};doMes.forEach(g=>cat[g.categoria]=(cat[g.categoria]||0)+g.valor);const mx=Math.max(1,...Object.values(cat));
  $("gf-cats").innerHTML=Object.keys(cat).length?Object.entries(cat).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`<div class="gcat"><div class="row" style="color:var(--fg)"><span>${esc(k)}</span><span class="num">${brl(v)}</span></div><div class="bar"><i style="width:${v/mx*100}%"></i></div></div>`).join(""):`<p class="empty">Nenhum gasto da faculdade neste mês.</p>`;
  const f=new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short"});
  $("gf-lista").innerHTML=gfac.slice(0,30).map(g=>{const[y,mm,d]=g.data.split("-").map(Number);return`<div class="item"><div class="l"><div class="t">${esc(g.categoria)}</div><div class="s">${f.format(new Date(y,mm-1,d))}${g.nota?" · "+esc(g.nota):""}</div></div><div class="v num neg">−${brl(g.valor)}</div><button class="del" data-gf="${g.id}" aria-label="Apagar">✕</button></div>`}).join("");
}
chips($("gf-cat"),GCATS,"Mensalidade");$("gf-data").value=ymd(new Date());
$("fGfac").onsubmit=e=>{e.preventDefault();const v=num($("gf-valor").value);if(v<=0){toast("Coloque o valor");return}
  safe(async()=>{const{data,error}=await sb.from("gastos_fac").insert({data:$("gf-data").value,categoria:picked($("gf-cat")),valor:v,nota:$("gf-nota").value.trim()||null}).select().single();if(error)throw error;
    gfac.unshift({...data,valor:Number(data.valor)});gfac.sort((a,b)=>b.data.localeCompare(a.data));$("gf-valor").value="";$("gf-nota").value="";gfacRender()},"Gasto salvo")};
$("gf-lista").addEventListener("click",e=>{const b=e.target.closest("[data-gf]");if(!b)return;armar(b,()=>safe(async()=>{const{error}=await sb.from("gastos_fac").delete().eq("id",b.dataset.gf);if(error)throw error;gfac=gfac.filter(x=>x.id!==b.dataset.gf);gfacRender()},"Apagado"))});
const _agLoad=agendaLoad;window.agendaLoad=async()=>{await _agLoad();if(agOk)await gfacLoad()};

/* ---------- curso ---------- */
const PER_HORA={"Manhã":["07:30","11:30"],"Tarde":["13:30","17:30"],"Noite":["19:00","22:30"],"EAD":["20:00","22:00"]};
chips($("c-per"),["Manhã","Tarde","Noite","EAD"],"Noite");
function cursoRender(editar){
  const tem=!!perfil.curso;$("curso-ver").hidden=!tem||editar;$("fCurso").hidden=tem&&!editar;
  if(tem){$("cv-curso").textContent=perfil.curso;$("cv-sub").textContent=[perfil.semestre?perfil.semestre+"º semestre":"",perfil.periodo,perfil.faculdade].filter(Boolean).join(" · ")}
  if(editar||!tem){$("c-curso").value=perfil.curso||"";$("c-fac").value=perfil.faculdade||"";$("c-sem").value=perfil.semestre||"";
    $("c-per").querySelectorAll(".chip").forEach(c=>c.setAttribute("aria-pressed",c.textContent===(perfil.periodo||"Noite")))}
  const h=PER_HORA[perfil.periodo||"Noite"];if(h&&!agenda.length){$("ab-ini").value=h[0];$("ab-fim").value=h[1]}
}
$("cv-edit").onclick=()=>cursoRender(true);
$("fCurso").onsubmit=e=>{e.preventDefault();const curso=$("c-curso").value.trim();if(!curso){toast("Escreva o nome do curso");return}
  const sem=Math.round(num($("c-sem").value))||null;
  safe(async()=>{await savePerfil({curso,faculdade:$("c-fac").value.trim()||null,periodo:picked($("c-per")),semestre:sem});cursoRender(false)},"Curso salvo")};
const _agRender=agendaRender;agendaRender=function(){_agRender();if(document.activeElement?.closest?.("#fCurso"))return;cursoRender(false)};
agendaRender();gfacRender();if(uid)window.agendaLoad();
