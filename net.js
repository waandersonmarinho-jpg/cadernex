/* Cadernex — rede resistente (sinal fraco na rua)
   1) cxFetch: o fetch que o Supabase usa. Leituras (GET/HEAD) tentam de novo sozinhas, com espera
      crescente (0,5 s → 1,5 s → 4 s, com sorteio pra não bater todo mundo junto) quando cai o sinal,
      dá tempo esgotado ou o servidor responde 429/502/503/504. Gravações NÃO repetem aqui:
      elas vão pra fila do celular (offline.js) ou mostram o erro, pra nunca gravar duas vezes.
   2) Aviso de conexão: "Sem sinal…" / "Reconectando…" / "Conectado ✓" no topo. */
(function(){
const ESPERAS=[500,1500,4000],TEMPO_LEITURA=15000,TEMPO_GRAVACAO=25000;
const REPETE_STATUS=new Set([408,425,429,500,502,503,504]);
const dorme=ms=>new Promise(r=>setTimeout(r,ms));
const sorteio=ms=>Math.round(ms*(0.7+Math.random()*0.6));

function comPrazo(input,init,ms){
  const ac=new AbortController(),de=init&&init.signal;
  if(de){if(de.aborted)ac.abort();else de.addEventListener("abort",()=>ac.abort(),{once:true})}
  const t=setTimeout(()=>ac.abort(),ms);
  return fetch(input,{...init,signal:ac.signal}).finally(()=>clearTimeout(t));
}
async function cxFetch(input,init={}){
  const metodo=String(init.method||(input&&input.method)||"GET").toUpperCase();
  const leitura=metodo==="GET"||metodo==="HEAD";
  const cancelada=()=>init.signal&&init.signal.aborted;
  for(let i=0;;i++){
    try{
      const r=await comPrazo(input,init,leitura?TEMPO_LEITURA:TEMPO_GRAVACAO);
      if(leitura&&REPETE_STATUS.has(r.status)&&i<ESPERAS.length){
        const ra=Number(r.headers.get("retry-after"));await dorme(ra>0&&ra<20?ra*1000:sorteio(ESPERAS[i]));continue}
      if(r.ok)estado("ok");
      return r;
    }catch(e){
      if(cancelada())throw e;                 // quem pediu cancelou: não insiste
      estado(navigator.onLine?"lento":"off");
      if(!leitura||i>=ESPERAS.length)throw e; // gravação: devolve o erro (a fila do celular cuida)
      await esperaRede(sorteio(ESPERAS[i]));
    }
  }
}
// espera o tempo, ou volta antes se o sinal voltar
function esperaRede(ms){return new Promise(r=>{const t=setTimeout(fim,ms);function fim(){clearTimeout(t);removeEventListener("online",fim);r()}addEventListener("online",fim)})}

/* ---------- aviso de conexão ---------- */
let atual="ok",tOk=null;
function barra(){let b=document.getElementById("net-bar");
  if(!b){b=document.createElement("div");b.id="net-bar";b.setAttribute("role","status");b.setAttribute("aria-live","polite");b.hidden=true;document.body.appendChild(b)}return b}
function estado(s){
  if(s===atual)return;const era=atual;atual=s;const b=barra();clearTimeout(tOk);
  if(s==="off"){b.className="off";b.textContent="Sem sinal. O que você fizer fica salvo no celular e sobe quando voltar.";b.hidden=false}
  else if(s==="lento"){b.className="lento";b.textContent="Sinal fraco. Tentando de novo…";b.hidden=false}
  else if(era!=="ok"){b.className="ok";b.textContent="Conectado ✓";b.hidden=false;tOk=setTimeout(()=>{b.hidden=true},2500)}
}
addEventListener("offline",()=>estado("off"));
addEventListener("online",()=>{estado("lento");fetch("manifest.json",{cache:"no-store"}).then(()=>estado("ok"),()=>{})});
if(!navigator.onLine)addEventListener("DOMContentLoaded",()=>estado("off"));

window.cxFetch=cxFetch;window.cxNet={estado,esperaRede};
})();
