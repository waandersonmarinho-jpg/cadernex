/* Cadernex — Do corre ao negócio: regra dos 10% + 50 lições */
let cofre=[],cofreOk=true,licAberta=null;
async function negocioLoad(){if(!sb||!uid)return;const r=await sb.from("cofre").select("*").order("data",{ascending:false});
  if(r.error){cofreOk=false;negocioRender();return}cofreOk=true;cofre=r.data.map(x=>({...x,valor:Number(x.valor)||0}));negocioRender()}
function bruto(lista){return lista.reduce((s,t)=>s+(t.ganho||0)+(t.gorjeta||0),0)}
function negocioRender(){
  if(!$("v-negocio"))return;
  $("ng-erro").hidden=cofreOk;
  const w=range("semana"),m=range("mes");
  const sem=bruto(turnos.filter(t=>t.data>=w[0]&&t.data<=w[1])),mes=bruto(turnos.filter(t=>t.data>=m[0]&&t.data<=m[1]));
  const gMes=cofre.filter(c=>c.data>=m[0]&&c.data<=m[1]).reduce((s,c)=>s+c.valor,0),total=cofre.reduce((s,c)=>s+c.valor,0);
  const alvoMes=mes*0.1,falta=Math.max(0,alvoMes-gMes);
  $("ng-total").textContent=brl(total);
  $("ng-sem").textContent=brl0(sem*0.1);$("ng-mesalvo").textContent=brl0(alvoMes);$("ng-mesg").textContent=brl0(gMes);
  $("ng-bar").style.width=(alvoMes?Math.min(100,gMes/alvoMes*100):0)+"%";
  $("ng-msg").innerHTML=!mes?"Anote seus turnos que o Cadernex calcula os seus 10%.":falta>0.5?`Faltam <b>${brl(falta)}</b> pra fechar os 10% deste mês.`:"Você guardou os 10% deste mês. É assim que se fica rico devagar e sempre.";
  $("ng-rapido").textContent=falta>0.5?"Guardei "+brl(falta):"Guardei outro valor";$("ng-rapido").dataset.v=falta>0.5?falta.toFixed(2):"";
  const f=new Intl.DateTimeFormat("pt-BR",{day:"2-digit",month:"short"});
  $("ng-hist").innerHTML=cofre.slice(0,6).map(c=>{const[y,mm,d]=c.data.split("-").map(Number);return`<div class="item"><div class="l"><div class="t">Guardado</div><div class="s">${f.format(new Date(y,mm-1,d))}</div></div><div class="v num pos">+${brl(c.valor)}</div><button class="del" data-cf="${c.id}" aria-label="Apagar">✕</button></div>`}).join("");
  // lições
  const lidas=new Set(perfil.licoes||[]),apoio=!!perfil.apoiador;let n=0,html="";
  $("ng-prog").textContent=`${lidas.size} de 50 lições feitas`;$("ng-progbar").style.width=(lidas.size/50*100)+"%";
  TRILHAS.forEach((tr,ti)=>{const trava=!tr.livre&&!apoio;const feitas=tr.l.filter((_,i)=>lidas.has(ti*10+i+1)).length;
    html+=`<details class="mod trilha"${ti===0?" open":""}><summary><span class="step">${ti+1}</span><span class="mt">${esc(tr.t)}<small>${trava?"Para Apoiadores":feitas+" de 10 feitas"} · ${esc(tr.s)}</small></span></summary><div class="mb">`;
    if(trava)html+=`<div class="lock"><b>Trilha para Apoiadores</b><p>Apoie o Cadernex pra liberar as 40 lições das trilhas 2 a 5. O seu apoio paga o servidor e as novidades do app.</p><ul class="lock-l">${tr.l.map(x=>`<li>${esc(x[0])}</li>`).join("")}</ul></div>`;
    else html+=tr.l.map((x,i)=>{const id=ti*10+i+1,ok=lidas.has(id);return`<div class="lic${ok?" ok":""}"><div class="lic-h"><span class="lic-n num">${id}</span><b>${esc(x[0])}</b></div><p>${esc(x[1])}</p><p class="faca"><span>Faça hoje:</span> ${esc(x[2])}</p><button type="button" class="btn ${ok?"ghost":""} lic-b" data-lic="${id}">${ok?"Feita ✓":"Marcar como feita"}</button></div>`}).join("");
    html+=`</div></details>`});
  $("ng-trilhas").innerHTML=html;
  $("ng-apoio").hidden=apoio;$("ng-selo").hidden=!apoio;
  // resumo
  if($("res10"))$("res10").innerHTML=sem?`Regra dos 10%: guarde <b>${brl0(sem*0.1)}</b> desta semana`:"";
}
$("ng-trilhas").addEventListener("click",e=>{const b=e.target.closest("[data-lic]");if(!b)return;const id=+b.dataset.lic;const s=new Set(perfil.licoes||[]);
  s.has(id)?s.delete(id):s.add(id);const arr=[...s].sort((a,b)=>a-b);const aberto=[...$("ng-trilhas").querySelectorAll("details")].map(d=>d.open);
  safe(async()=>{await savePerfil({licoes:arr});negocioRender();$("ng-trilhas").querySelectorAll("details").forEach((d,i)=>d.open=aberto[i])},s.has(id)?"Lição feita!":null)});
async function guardar(v){if(!(v>0)){toast("Coloque o valor");return}
  await safe(async()=>{const{data,error}=await sb.from("cofre").insert({data:ymd(new Date()),valor:Math.round(v*100)/100}).select().single();if(error)throw error;
    cofre.unshift({...data,valor:Number(data.valor)});$("ng-valor").value="";negocioRender()},"Guardado no cofre")}
$("ng-rapido").onclick=()=>{const v=Number($("ng-rapido").dataset.v);if(v>0)guardar(v);else $("ng-valor").focus()};
$("fCofre").onsubmit=e=>{e.preventDefault();guardar(num($("ng-valor").value))};
$("ng-hist").addEventListener("click",e=>{const b=e.target.closest("[data-cf]");if(!b)return;armar(b,()=>safe(async()=>{const{error}=await sb.from("cofre").delete().eq("id",b.dataset.cf);if(error)throw error;cofre=cofre.filter(x=>x.id!==b.dataset.cf);negocioRender()},"Apagado"))});
const _agL2=window.agendaLoad;window.agendaLoad=async()=>{await _agL2();await negocioLoad()};
negocioRender();if(uid)negocioLoad();
