/* Cadernex — alerta de corrida nova: som, vibração, cartão grande com Aceitar e notificação do celular */
(function(){
let ctx=null,tocando=null,atual=null,timer=null;
const TEMPO=40; // segundos que o cartão fica na tela

/* ---------- som (o navegador só libera depois do primeiro toque na tela) ---------- */
function liberarSom(){try{if(!ctx)ctx=new (window.AudioContext||window.webkitAudioContext)();if(ctx.state==="suspended")ctx.resume()}catch(e){}}
document.addEventListener("pointerdown",liberarSom,{once:false,passive:true});
function bip(f,ini,dur,vol){const o=ctx.createOscillator(),g=ctx.createGain();o.type="sine";o.frequency.value=f;o.connect(g);g.connect(ctx.destination);
  const t=ctx.currentTime+ini;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.02);g.gain.setValueAtTime(vol,t+dur-.05);g.gain.linearRampToValueAtTime(0,t+dur);o.start(t);o.stop(t+dur)}
function chamar(vezes){ // toque de chamada: dois tons, repete
  pararSom();if(!ctx)return;let n=0;
  const um=()=>{if(!ctx)return;bip(880,0,.18,.35);bip(1175,.22,.28,.35);if(++n>=vezes)pararSom()};
  um();tocando=setInterval(um,1400);
}
function pararSom(){if(tocando){clearInterval(tocando);tocando=null}}
function plim(){if(!ctx)return;bip(988,0,.12,.25);bip(1319,.14,.2,.25)}

/* ---------- notificação do celular (app aberto em segundo plano) ---------- */
function pedirPermissao(){try{if("Notification" in window&&Notification.permission==="default")Notification.requestPermission()}catch(e){}}
function notificar(titulo,corpo,tag){
  try{if(!("Notification" in window)||Notification.permission!=="granted"||!navigator.serviceWorker)return;
    navigator.serviceWorker.ready.then(r=>r.showNotification(titulo,{body:corpo,icon:"icon-192.png",badge:"icon-192.png",tag,renotify:true,vibrate:[300,120,300,120,300],data:{url:"./"}}))}catch(e){}
}
// pede a permissão quando o entregador fica disponível (é quando ele quer ser avisado)
document.addEventListener("submit",e=>{if(e.target.id==="fDisp"){liberarSom();if(!window.cxPushAtivar)pedirPermissao()}});

/* ---------- cartão grande de corrida nova ---------- */
function fechar(){pararSom();clearInterval(timer);timer=null;atual=null;$("ac-dlg").hidden=true}
const vistos=new Set();
window.alertaCorrida=function(c){
  if(vistos.has(c.id))return;vistos.add(c.id);
  if(atual&&atual.id!==c.id){toast(`Mais uma corrida: ${c.coleta_bairro} → ${c.entrega_bairro} · ${brl(Number(c.valor))}`);return}
  atual=c;const fr=c.tipo==="frete",km=c.distancia_km?`${String(Number(c.distancia_km)).replace(".",",")} km`:"";
  $("ac-tit").textContent=fr?"Frete novo":"Corrida nova";
  $("ac-val").textContent=brl(Number(c.valor));
  $("ac-rota").textContent=`${c.coleta_bairro} → ${c.entrega_bairro}`;
  $("ac-info").textContent=[c.item,km,c.veiculo&&c.veiculo!=="qualquer"?veiNome(c.veiculo):""].filter(Boolean).join(" · ");
  $("ac-ok").dataset.id=c.id;$("ac-ok").disabled=false;$("ac-ok").textContent=`Aceitar por ${brl(Number(c.valor))}`;
  $("ac-dlg").hidden=false;
  let resta=TEMPO;const barra=$("ac-barra");barra.style.transition="none";barra.style.width="100%";
  requestAnimationFrame(()=>{barra.style.transition=`width ${TEMPO}s linear`;barra.style.width="0%"});
  clearInterval(timer);timer=setInterval(()=>{if(--resta<=0)fechar()},1000);
  chamar(6);try{navigator.vibrate&&navigator.vibrate([300,120,300,120,300])}catch(e){}
  if(document.hidden)notificar(`${fr?"Frete":"Corrida"} nova · ${brl(Number(c.valor))}`,`${c.coleta_bairro} → ${c.entrega_bairro}${km?" · "+km:""}`,"corrida-"+c.id);
};
$("ac-nao").onclick=fechar;
$("ac-dlg").addEventListener("click",e=>{if(e.target.id==="ac-dlg")fechar()});
$("ac-ok").onclick=()=>{const b=$("ac-ok"),id=b.dataset.id;b.disabled=true;b.textContent="Aceitando…";pararSom();
  safe(async()=>{const{error}=await sb.rpc("aceitar_corrida",{cid:id});if(error)throw error;fechar();corrAberta=id;go("corridas");await corrLoad()},"Corrida aceita! Veja o endereço de coleta.")
    .finally(()=>{if(atual){b.disabled=false;b.textContent=`Aceitar por ${brl(Number(atual.valor))}`}})};
// se outra pessoa aceitou primeiro, o cartão some
window.alertaSumir=function(id){if(atual&&atual.id===id){fechar();toast("Outro entregador aceitou essa corrida.")}};

/* ---------- cliente: aviso quando o pedido muda ---------- */
// outras partes do app usam o mesmo som e a mesma notificação
window.cxSom=(n)=>{liberarSom();chamar(n||3)};window.cxNotificar=notificar;
window.alertaPedido=function(c,txt){plim();try{navigator.vibrate&&navigator.vibrate(200)}catch(e){}
  if(document.hidden)notificar("Seu pedido no Cadernex",txt,"pedido-"+c.id)};
// o cliente também recebe notificação: pede quando ele faz o primeiro pedido
document.addEventListener("submit",e=>{if(e.target.id==="fPedir"||e.target.id==="fLote"){liberarSom();if(!window.cxPushAtivar)pedirPermissao()}});
/* ---------- conferência a cada 20 s (se o aviso em tempo real falhar) ---------- */
const serve=c=>{const md=typeof meuDisp==="function"&&meuDisp();return md&&c&&c.status==="aberta"&&c.cliente_id!==uid&&perfil.tipo==="entregador"
  &&(c.veiculo==="qualquer"||c.veiculo===md.veiculo||(c.veiculo==="carroceria"&&FRETE_VEIC.includes(md.veiculo)))&&!(md.veiculo==="bike"&&Number(c.distancia_km)>BIKE_MAX)};
let primeira=true;
function confere(){
  if(typeof abertas==="undefined")return;
  abertas.forEach(c=>{if(!serve(c)){return}
    const recente=Date.now()-new Date(c.created_at).getTime()<3*60000; // na 1ª conferência, só avisa os pedidos de até 3 min
    if(primeira&&!recente){vistos.add(c.id);return}
    alertaCorrida(c)});
  primeira=false;
}
if(typeof corrLoad==="function"){const cl=corrLoad;corrLoad=async function(){const r=await cl.apply(this,arguments);try{confere()}catch(e){}return r}}
setInterval(()=>{if(uid&&perfil.tipo==="entregador"&&typeof meuDisp==="function"&&meuDisp())corrLoad()},20000);

/* ---------- testar o som ---------- */
document.addEventListener("click",e=>{if(!e.target.closest("#ac-teste"))return;liberarSom();
  setTimeout(()=>{if(!ctx){toast("Seu celular não liberou som pro app.");return}chamar(2);try{navigator.vibrate&&navigator.vibrate([300,120,300])}catch(e){}
    toast("É assim que toca quando chega corrida. Deixe o volume ligado.")},50)});

})();
