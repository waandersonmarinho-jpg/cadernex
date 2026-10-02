/* Cadernex — GPS ao vivo da corrida: o entregador liga, o cliente acompanha no mapa */
(function(){
const ATIVO=["aceita","coletada"],VEL={moto:25,bike:14,qualquer:20,carroceria:22,picape_p:25,picape_m:25,caminhao:20};
const icV=v=>(VEIC[v]||VEIC.moto).i; // km/h médios na cidade
let gpsOn=false,watchId=null,ultimo=null,enviado=null,erroEnvio=false,wake=null,carregou=false,canal=null,leafletP=null;
const pos={},mapas={};
try{gpsOn=sessionStorage.getItem("cx-gps")==="1"}catch(e){}
const guarda=()=>{try{sessionStorage.setItem("cx-gps",gpsOn?"1":"0")}catch(e){}};
const ativasEnt=()=>minhas.filter(c=>c.entregador_id===uid&&ATIVO.includes(c.status));
const ativasCli=()=>minhas.filter(c=>c.cliente_id===uid&&c.entregador_id&&ATIVO.includes(c.status));
function metros(a,b,c,d){const R=6371e3,r=x=>x*Math.PI/180;const h=Math.sin(r(c-a)/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(r(d-b)/2)**2;return 2*R*Math.asin(Math.sqrt(h))}
const haS=t=>{const s=Math.max(0,Math.round((Date.now()-t)/1000));return s<10?"agora":s<60?`há ${s} s`:s<3600?`há ${Math.floor(s/60)} min`:"há mais de 1 hora"};
const kmTxt=m=>m<1000?`${Math.round(m/10)*10} m`:`${String((m/1000).toFixed(1)).replace(".",",")} km`;

/* ---------- entregador ---------- */
function ligar(){
  if(!navigator.geolocation){toast("Seu celular não liberou a localização");return}
  gpsOn=true;guarda();
  if(watchId==null)watchId=navigator.geolocation.watchPosition(onPos,onErr,{enableHighAccuracy:true,maximumAge:5000,timeout:30000});
  pedirWake();pintar();
}
function desligar(msg){
  gpsOn=false;guarda();if(watchId!=null)navigator.geolocation.clearWatch(watchId);watchId=null;ultimo=null;
  if(wake){wake.release().catch(()=>{});wake=null}
  pintar();if(msg)toast(msg);
}
async function pedirWake(){try{if(gpsOn&&!wake&&navigator.wakeLock&&!document.hidden){wake=await navigator.wakeLock.request("screen");wake.addEventListener("release",()=>wake=null)}}catch(e){}}
document.addEventListener("visibilitychange",()=>{if(!document.hidden)pedirWake()});
async function onPos(p){
  ultimo={lat:+p.coords.latitude.toFixed(6),lng:+p.coords.longitude.toFixed(6),precisao:Math.round(p.coords.accuracy||0),t:Date.now()};
  const as=ativasEnt();if(!as.length){if(carregou)desligar("GPS desligado: você não tem corrida em andamento.");return}
  // manda no máximo a cada 8 s, e só se andou 15 m ou se passou 30 s
  const longe=!enviado||metros(enviado.lat,enviado.lng,ultimo.lat,ultimo.lng)>15;
  if(enviado&&(Date.now()-enviado.t<8000||(!longe&&Date.now()-enviado.t<30000))){pintar();return}
  enviado={...ultimo,t:Date.now()};
  const agora=new Date().toISOString();
  const{error}=await sb.from("corrida_pos").upsert(as.map(c=>({corrida_id:c.id,lat:ultimo.lat,lng:ultimo.lng,precisao:ultimo.precisao,atualizado_em:agora})));
  erroEnvio=!!error;if(error)enviado=null;pintar();
}
function onErr(e){if(e.code===1)desligar("Você bloqueou a localização. Libere nas configurações do navegador pra ligar o GPS.")}

/* ---------- cliente ---------- */
async function posLoad(){
  const ids=ativasCli().map(c=>c.id);if(!ids.length)return;
  const r=await sb.from("corrida_pos").select("*").in("corrida_id",ids);
  if(!r.error)r.data.forEach(x=>pos[x.corrida_id]=x);pintar();
}
function posSub(){
  if(canal||!sb.channel)return;
  canal=sb.channel("corrida_pos").on("postgres_changes",{event:"*",schema:"public",table:"corrida_pos"},p=>{
    if(p.eventType==="DELETE"){delete pos[p.old.corrida_id];pintar();return}
    if(p.new&&minhas.some(c=>c.id===p.new.corrida_id&&c.cliente_id===uid)){pos[p.new.corrida_id]=p.new;pintar()}}).subscribe();
}
function leaflet(){
  if(window.L)return Promise.resolve();
  if(leafletP)return leafletP;
  leafletP=new Promise((ok,falha)=>{
    const css=document.createElement("link");css.rel="stylesheet";css.href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";document.head.appendChild(css);
    const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";s.onload=ok;s.onerror=()=>{leafletP=null;falha()};document.head.appendChild(s)});
  return leafletP;
}
const pino=(t,cls)=>L.divIcon({className:"rpin "+cls,html:`<span>${t}</span>`,iconSize:[26,26],iconAnchor:[13,13]});
function montaMapa(el,c){
  const id=c.id;
  if(mapas[id]){if(mapas[id].el!==el){el.replaceWith(mapas[id].el);mapas[id].map.invalidateSize()}return mapas[id]}
  if(!window.L){leaflet().then(()=>pintar()).catch(()=>{el.innerHTML=`<p class="hint" style="margin:8px">Não deu pra carregar o mapa. Verifique a internet.</p>`});return null}
  const map=L.map(el,{zoomControl:false,attributionControl:true}).setView([-14.235,-51.925],4); // Brasil (o mapa centraliza na pessoa quando tem a posição)
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
  const m={el,map,ent:null,mexeu:false,pts:L.layerGroup().addTo(map)};
  map.on("dragstart zoomstart",e=>{if(e.originalEvent||e.type==="dragstart")m.mexeu=true});
  const d=dets[id];
  if(d&&d.coleta_lat!=null)L.marker([d.coleta_lat,d.coleta_lng],{icon:pino("C","col"),title:"Coleta"}).addTo(m.pts);
  if(d&&d.entrega_lat!=null)L.marker([d.entrega_lat,d.entrega_lng],{icon:pino("E","ent"),title:"Entrega"}).addTo(m.pts);
  mapas[id]=m;setTimeout(()=>map.invalidateSize(),50);return m;
}
function atualizaMapa(m,c){
  const p=pos[c.id];if(!m)return;
  if(p){const ll=[p.lat,p.lng];
    if(!m.ent)m.ent=L.marker(ll,{icon:pino(icV(c.ent_veiculo||c.veiculo),"mot"),zIndexOffset:1000,title:"Entregador"}).addTo(m.map);else m.ent.setLatLng(ll);
    if(!m.mexeu){const d=dets[c.id],alvo=c.status==="aceita"?[d?.coleta_lat,d?.coleta_lng]:[d?.entrega_lat,d?.entrega_lng];
      if(alvo[0]!=null)m.map.fitBounds([ll,alvo],{padding:[36,36],maxZoom:16});else m.map.setView(ll,15)}}
  else if(m.ent){m.ent.remove();m.ent=null}
}

/* ---------- pintar os blocos de GPS nos cartões ---------- */
function pintar(){
  document.querySelectorAll(".gps[data-gps]").forEach(el=>{
    const id=el.dataset.gps,c=minhas.find(x=>x.id===id);if(!c)return;
    if(el.dataset.papel==="ent")el.innerHTML=blocoEnt();else blocoCli(el,c);
  });
  // tira mapas de corridas que acabaram
  Object.keys(mapas).forEach(id=>{if(!ativasCli().some(c=>c.id===id)){mapas[id].map.remove();delete mapas[id]}});
}
function blocoEnt(){
  if(!gpsOn)return `<div class="gps-h"><span class="gps-dot off"></span><b>GPS pro cliente desligado</b></div>
    <p class="hint">Ligue pra o cliente ver você no mapa até a entrega. Só ele vê, e só durante esta corrida.</p>
    <button class="btn full" type="button" data-gpson>Ligar GPS pro cliente</button>`;
  const st=erroEnvio?`<span style="color:var(--bad)">Falha ao enviar. Confira a internet.</span>`:enviado?`Enviado ${haS(enviado.t)}${ultimo&&ultimo.precisao?` · precisão ~${ultimo.precisao} m`:""}`:"Procurando sinal do GPS…";
  return `<div class="gps-h"><span class="gps-dot"></span><b>GPS ligado</b><button class="link" type="button" data-gpsoff style="margin-left:auto;padding:0">Desligar</button></div>
    <p class="hint">${st}</p>
    <p class="hint">Deixe o Cadernex aberto na tela: a tela não apaga sozinha enquanto o GPS estiver ligado. Se sair do app ou apagar a tela, o cliente fica vendo o último ponto enviado.</p>`;
}
function blocoCli(el,c){
  const p=pos[c.id],d=dets[c.id];
  let box=el.querySelector(".gps-mapa"),txt=el.querySelector(".gps-txt");
  if(!box){el.innerHTML=`<div class="gps-mapa"><div class="rmap" data-rmap="${c.id}"></div></div><p class="hint gps-txt"></p>`;box=el.querySelector(".gps-mapa");txt=el.querySelector(".gps-txt")}
  const cont=box.querySelector(".rmap");
  if(!p&&!mapas[c.id]){box.hidden=true;txt.innerHTML=`<b>Mapa ao vivo</b><br>Aparece aqui quando ${esc(c.entregador_nome||"o entregador")} ligar o GPS. Você também pode pedir pela conversa da corrida.`;return}
  box.hidden=false;
  const m=montaMapa(cont,c);atualizaMapa(m,c);
  if(!p){txt.textContent="O entregador desligou o GPS. Mostrando o mapa sem a posição dele.";return}
  const alvo=c.status==="aceita"?[d?.coleta_lat,d?.coleta_lng,"da coleta"]:[d?.entrega_lat,d?.entrega_lng,"da entrega"];
  const velha=Date.now()-new Date(p.atualizado_em)>120000;
  let t=`<b>${esc(c.entregador_nome||"Entregador")}</b> · posição ${haS(new Date(p.atualizado_em))}`;
  if(alvo[0]!=null){const mm=metros(p.lat,p.lng,alvo[0],alvo[1])*1.3,min=Math.max(1,Math.round(mm/1000/(VEL[c.veiculo]||20)*60));
    t+=`<br>A uns ${kmTxt(mm)} ${alvo[2]}${mm>150?`, cerca de ${min} min`:" — chegando!"}`}
  if(velha)t+=`<br><span style="color:var(--muted)">Sem atualização faz um tempo. O app dele pode estar fechado ou sem sinal.</span>`;
  txt.innerHTML=t;
}

/* ---------- ligar tudo ao app ---------- */
document.addEventListener("click",e=>{
  if(e.target.closest("[data-gpson]")){ligar();return}
  if(e.target.closest("[data-gpsoff]")){desligar("GPS desligado");return}
});

/* ---------- mapa de quem está disponível ---------- */
const GRADE=0.004,arred=x=>+(Math.round(x/GRADE)*GRADE).toFixed(3),GYN=[-16.6869,-49.2648];
let dWatch=null,dEu=null,dEnviado=null,dNegado=false,dMapEnt=null,dMarkEnt=null,dMarkVei=null,dCentrou=false,dMexeu=false,dMapCli=null,dMarksCli=[],dKey="";
function novoMapa(el,ll,z){const map=L.map(el,{zoomControl:false}).setView(ll,z);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(map);
  setTimeout(()=>map.invalidateSize(),60);return map}
function dispLigar(){
  if(dWatch!=null||dNegado||!navigator.geolocation)return;
  dWatch=navigator.geolocation.watchPosition(async p=>{
    dEu={lat:p.coords.latitude,lng:p.coords.longitude,prec:Math.round(p.coords.accuracy||0)};pintarDisp();
    const la=arred(dEu.lat),ln=arred(dEu.lng);
    if(dEnviado&&dEnviado.lat===la&&dEnviado.lng===ln)return; // só manda quando muda de quadra (~400 m)
    dEnviado={lat:la,lng:ln};await sb.from("disponiveis").update({lat:la,lng:ln}).eq("user_id",uid);
  },e=>{if(e.code===1){dNegado=true;dispDesligar();pintarDisp()}},{enableHighAccuracy:true,maximumAge:10000,timeout:30000});
}
let dAuto=false;
function dispDesligar(){if(dWatch!=null)navigator.geolocation.clearWatch(dWatch);dWatch=null;dEu=null;dEnviado=null;dCentrou=false;dMexeu=false}
function pintarDisp(){
  if(typeof meuDisp!=="function")return;
  // entregador: ele mesmo no mapa, ponto exato (só no celular dele)
  const md=meuDisp(),w=$("co-dmap-w"),el=$("co-dmap"),tx=$("co-dtxt");
  if(md&&perfil.tipo==="entregador"&&!perfil.bloqueado){
    dispLigar();w.hidden=false;
    if(dNegado){el.hidden=true;tx.textContent="Libere a localização do navegador pra aparecer no mapa.";}
    else if(!dEu){el.hidden=true;tx.textContent="Procurando seu GPS…";}
    else if(!window.L){leaflet().then(pintarDisp).catch(()=>{tx.textContent="Não deu pra carregar o mapa. Verifique a internet."});}
    else{el.hidden=false;const ll=[dEu.lat,dEu.lng],ic=icV(md.veiculo);
      if(!el.offsetWidth)return; // tela não visível ainda
      if(!dMapEnt){dMapEnt=novoMapa(el,ll,16);dMapEnt.on("dragstart",()=>dMexeu=true);dMapEnt.on("zoomstart",e=>{if(dCentrou&&e&&e.target&&dMapEnt._loaded&&!dAuto)dMexeu=true})}else dMapEnt.invalidateSize();
      if(dMarkEnt&&dMarkVei!==ic){dMarkEnt.remove();dMarkEnt=null}
      if(!dMarkEnt){dMarkEnt=L.marker(ll,{icon:pino(ic,"mot on"),title:"Você"}).addTo(dMapEnt);dMarkVei=ic}else dMarkEnt.setLatLng(ll);
      if(!dMexeu){dAuto=true;dMapEnt.setView(ll,dCentrou?dMapEnt.getZoom():16);dAuto=false;dCentrou=true}
      tx.textContent=`Você está aqui${dEu.prec?` (precisão ~${dEu.prec} m)`:""}. Quem pede vê só uma posição aproximada, de uns 400 m.`}
  }else{w.hidden=true;if(dWatch!=null)dispDesligar();}
  // cliente: entregadores disponíveis por perto (posição aproximada)
  const cw=$("pd-dmap-w"),on=(disp||[]).filter(d=>fresco(d)&&d.lat!=null&&d.lng!=null&&d.user_id!==uid&&(pfTipo==="frete")===FRETE_VEIC.includes(d.veiculo));
  if(!on.length){cw.hidden=true;return}
  if(!window.L){leaflet().then(pintarDisp).catch(()=>{cw.hidden=true});return}
  cw.hidden=false;
  if(!$("pd-dmap").offsetWidth)return;
  if(!dMapCli)dMapCli=novoMapa($("pd-dmap"),GYN,13);else dMapCli.invalidateSize();
  const k=on.map(d=>d.user_id+d.veiculo+d.lat+","+d.lng).join("|");
  if(k!==dKey){dKey=k;dMarksCli.forEach(m=>m.remove());
    dMarksCli=on.map(d=>L.marker([d.lat,d.lng],{icon:pino(icV(d.veiculo),"mot on"),title:d.nome||"Entregador"}).addTo(dMapCli));
    if(on.length===1)dMapCli.setView([on[0].lat,on[0].lng],14);else dMapCli.fitBounds(on.map(d=>[d.lat,d.lng]),{padding:[30,30],maxZoom:15})}
  $("pd-dtxt").textContent=`${on.length} ${pfTipo==="frete"?"freteiro"+(on.length>1?"s":""):"entregador"+(on.length>1?"es":"")} no mapa agora. A posição é aproximada (uns 400 m) pra proteger quem trabalha.`;
}
if(typeof go==="function"){const g1=go;go=function(v){g1(v);if(v==="pedir"||v==="corridas")setTimeout(pintarDisp,30)}}

window.cxMapa={leaflet,novoMapa,pino,metros,kmTxt};
const _render=corrRender;corrRender=function(){_render();pintar();pintarDisp()};
const _load=corrLoad;corrLoad=async function(){await _load();carregou=true;
  if(gpsOn&&ativasEnt().length)ligar();else if(gpsOn&&!ativasEnt().length)desligar();
  posSub();posLoad()};
setInterval(()=>{if(document.querySelector(".gps[data-gps]"))pintar()},15000);
if(uid&&minhas.length){carregou=true;posSub();posLoad();pintar()}
if(uid)pintarDisp();
})();
