/* Cadernex — odômetro automático do turno
   Enquanto o turno está aberto, o GPS soma os km rodados sozinho e calcula a gasolina gasta.
   • App aberto: soma ponto a ponto, ignorando a "tremida" do GPS e pontos imprecisos.
   • Tela apagada ou app no fundo: o celular para o GPS. Quando volta, o app estima o trecho
     pela linha reta entre o último ponto e o novo, × 1,3 (as ruas não são retas).
   • Garantia mínima: nunca fica abaixo da soma dos km das corridas entregues no turno.
   Ao fechar o turno, os km já vêm preenchidos e a gasolina estimada vira uma despesa (dá pra desmarcar). */
(function(){
const $=id=>document.getElementById(id);
if(!$("odo"))return;
const CFG="cx-odo-cfg",PAD={moto:35,bike:0,picape_p:11,picape_m:9,caminhao:6},PRECO=6.3;
let st=null,watch=null,tSalvar=null;
const rad=x=>x*Math.PI/180;
const dist=(a,b)=>{const R=6371e3,dl=rad(b.lat-a.lat),dn=rad(b.lng-a.lng),h=Math.sin(dl/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(h))};
const n1=x=>(Math.round(x*10)/10).toFixed(1).replace(".",",");
const veic=()=>{try{return(JSON.parse(localStorage.getItem("cadernex_disp"))||{}).veiculo||"moto"}catch(e){return"moto"}};
function cfg(){let c={};try{c=JSON.parse(localStorage.getItem(CFG))||{}}catch(e){}
  const v=veic(),cons=c[v]!=null?c[v]:PAD[v]!=null?PAD[v]:35;return{v,cons:Number(cons)||0,preco:Number(c.preco)||PRECO}}
function salvarCfg(patch){let c={};try{c=JSON.parse(localStorage.getItem(CFG))||{}}catch(e){}Object.assign(c,patch);try{localStorage.setItem(CFG,JSON.stringify(c))}catch(e){}}
const kmCorridas=()=>{if(!st||typeof minhas==="undefined")return 0;const ini=new Date(st.ini);
  return minhas.filter(c=>c.entregador_id===uid&&c.status==="entregue"&&c.entregue_em&&new Date(c.entregue_em)>=ini).reduce((s,c)=>s+(Number(c.distancia_km)||0),0)};
function conta(){if(!st)return{km:0,gps:0,est:0,corr:0,rs:0,fonte:""};
  const gps=st.m/1000,est=st.est/1000,corr=kmCorridas(),soma=gps+est,km=Math.max(soma,corr),c=cfg(),rs=c.cons>0?km/c.cons*c.preco:0;
  return{km,gps,est,corr,rs,c,fonte:soma>=corr?(est>0.05?"GPS + trechos estimados":"GPS"):"km das corridas entregues"}}

const chave=()=>"odo:"+uid;
function guardar(){clearTimeout(tSalvar);tSalvar=setTimeout(()=>{if(st&&window.cxOff)cxOff.set(chave(),st)},3000)}
async function carregar(){
  if(!uid||!perfil||!perfil.turno_inicio){if(st){st=null;parar()}pinta();return}
  if(!st||st.ini!==perfil.turno_inicio){
    const s=window.cxOff?await cxOff.get(chave()):null;
    st=s&&s.ini===perfil.turno_inicio?s:{ini:perfil.turno_inicio,m:0,est:0,last:null};
  }
  ligar();pinta();
}
function ligar(){
  if(watch!=null||!st||st.negado||!navigator.geolocation||document.hidden)return;
  watch=navigator.geolocation.watchPosition(ponto,e=>{if(e.code===1&&st){st.negado=1;parar();pinta()}},{enableHighAccuracy:true,maximumAge:5000,timeout:30000});
}
function parar(){if(watch!=null)navigator.geolocation.clearWatch(watch);watch=null}
function ponto(p){
  if(!st)return;const c=p.coords,t=p.timestamp||Date.now();
  if(!(c.accuracy<=40))return; // ponto impreciso: ignora
  const q={lat:c.latitude,lng:c.longitude,t};
  if(!st.last){st.last=q;guardar();return}
  const d=dist(st.last,q),dt=Math.max(1,(t-st.last.t)/1000);
  if(d<Math.max(20,c.accuracy*1.2))return; // parado ou tremida do GPS
  const v=d/dt; // m/s
  if(dt>120){if(v*1.3<30)st.est+=d*1.3}   // ficou sem GPS (tela apagada): estima o trecho, se a velocidade faz sentido (<108 km/h)
  else if(v<45)st.m+=d;                    // trecho normal (<162 km/h); acima disso é salto de GPS
  st.last=q;guardar();pinta();
}
function pinta(){
  const box=$("odo");if(!box)return;
  box.hidden=!st;if(!st)return;
  const r=conta();
  $("odo-km").textContent=n1(r.km)+" km";
  $("odo-rs").textContent=r.c.cons>0?brl(r.rs):"Bike: R$ 0";
  $("odo-st").textContent=st.negado?"Libere a localização do navegador para o app contar os km sozinho. Enquanto isso, ele usa os km das corridas entregues."
    :watch!=null?"Contando pelo GPS. Com a tela apagada, o app estima o trecho quando você volta.":"O GPS volta a contar quando o app estiver aberto.";
  const ci=$("odo-cons"),pi=$("odo-preco");
  if(document.activeElement!==ci)ci.value=r.c.cons?String(r.c.cons).replace(".",","):"0";
  if(document.activeElement!==pi)pi.value=r.c.preco.toFixed(2).replace(".",",");
  $("odo-vei").textContent={moto:"moto",bike:"bike",picape_p:"picape pequena",picape_m:"picape média",caminhao:"caminhão"}[r.c.v]||r.c.v;
}
const num2=s=>Number(String(s||"").replace(/\./g,"").replace(",","."))||0;
$("odo-cons").addEventListener("change",e=>{salvarCfg({[veic()]:Math.max(0,num2(e.target.value))});pinta()});
$("odo-preco").addEventListener("change",e=>{const v=num2(e.target.value);if(v>0)salvarCfg({preco:v});pinta()});

// fechar turno: preenche os km e oferece lançar a gasolina estimada
$("timerBtn").addEventListener("click",()=>{setTimeout(()=>{
  if($("turnoTitle").dataset.fechando!=="1"||!st)return;
  const r=conta();
  if(r.km>0.05&&!$("t-km").value)$("t-km").value=n1(r.km);
  const src=$("t-km-src");src.hidden=!(r.km>0.05);src.textContent=`Km calculado automaticamente (${r.fonte}). Pode corrigir se quiser.`;
  const w=$("t-comb-w");w.hidden=!(r.rs>0.01);
  $("t-comb-txt").textContent=`Lançar gasolina estimada: ${brl(r.rs)} (${n1(r.km)} km ÷ ${String(r.c.cons).replace(".",",")} km/l × ${brl(r.c.preco)}). Desmarque se você já anota quando abastece.`;
},0)});
// chamado pelo app depois que o turno foi salvo
window.cxTurnoFim=async function(){
  try{
    const w=$("t-comb-w");
    if(st&&!w.hidden&&$("t-comb").checked){
      const r=conta(),kmForm=num2($("t-km").value)||r.km,valor=r.c.cons>0?Math.round(kmForm/r.c.cons*r.c.preco*100)/100:0;
      if(valor>0){
        const row={data:$("t-data").value,categoria:"Gasolina",valor,nota:`Estimado: ${n1(kmForm)} km ÷ ${String(r.c.cons).replace(".",",")} km/l × ${brl(r.c.preco)}`};
        if(window.cxOff)row.id=cxOff.novoId();
        const{data,error}=await sb.from("despesas").insert(row).select().single();
        if(error){if(window.cxOff&&cxOff.semRede(error))await cxOff.fila.add({tab:"despesas",row});else throw error}
        const d=error?row:data;gastos.unshift({...d,valor:N(d.valor)});
      }
    }
  }catch(e){console.error("Gasolina estimada não salvou: "+(e.message||e))}
  $("t-comb-w").hidden=true;$("t-km-src").hidden=true;
  st=null;parar();if(window.cxOff)cxOff.set(chave(),null);pinta();
};
window.cxTurnoIni=()=>{st=null;carregar()};

document.addEventListener("visibilitychange",()=>{if(document.hidden){if(st&&window.cxOff)cxOff.set(chave(),st);parar()}else carregar()});
setInterval(()=>{if(uid&&((perfil&&perfil.turno_inicio)||null)!==(st&&st.ini||null))carregar();else if(st)pinta()},5000);
if(typeof go==="function"){const g=go;go=function(v){g(v);if(v==="turno"||v==="resumo")carregar()}}
setTimeout(carregar,1500);
})();
