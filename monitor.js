/* Cadernex — registro de erros: quando algo quebra no celular de alguém, grava um aviso curto
   (sem dados pessoais) para o moderador ver em Mais → Saúde do app. Carrega antes de tudo. */
(function(){
const MAX=8,vistos=new Set(),fila=[];let enviados=0,versao="",enviando=false;
try{caches.keys().then(k=>{const v=k.find(x=>/^cadernex-v\d+$/.test(x));if(v)versao=v.replace("cadernex-","")}).catch(()=>{})}catch(e){}
const cliente=()=>{try{return typeof sb!=="undefined"&&sb?sb:null}catch(e){return null}};
const tela=()=>{const v=[...document.querySelectorAll("section.view")].find(s=>!s.hidden&&s.offsetParent!==null);return v?v.id.replace(/^v-/,""):"login"};
const corta=(s,n)=>String(s||"").replace(/https?:\/\/[^\s)]*\//g,"").slice(0,n); // tira o endereço do site, fica só o arquivo
const ruido=m=>!m||/ResizeObserver|Script error\.?$|Load failed|Failed to fetch|NetworkError|AbortError|cancelad/i.test(m)||!navigator.onLine;
function registrar(msg,onde){
  msg=corta(msg,500);if(ruido(msg))return;
  const chave=msg+"|"+onde;if(vistos.has(chave)||enviados+fila.length>=MAX)return;vistos.add(chave);
  fila.push({msg,onde:corta(onde,300)||null,tela:tela(),aparelho:navigator.userAgent.slice(0,200)});
  enviar();
}
async function enviar(){
  const c=cliente();if(!c){setTimeout(enviar,3000);return}
  if(enviando)return;enviando=true;
  while(fila.length){const e=fila.shift();e.versao=versao||null;enviados++;
    try{await c.from("erros_app").insert(e)}catch(x){} // se falhar, deixa pra lá: nunca trava o app
  }
  enviando=false;
}
window.addEventListener("error",e=>{if(e.message)registrar(e.message,e.filename?`${e.filename}:${e.lineno}:${e.colno}`:"")});
window.addEventListener("unhandledrejection",e=>{const r=e.reason;registrar(r&&(r.message||r.msg)||String(r),r&&r.stack?String(r.stack).split("\n")[1]:"")});
// erros que o app já trata (ex.: "Não salvou") também ficam registrados
const ce=console.error.bind(console);
console.error=function(...a){ce(...a);try{const x=a.find(v=>v&&(v.message||v.msg))||a[0];
  if(x&&typeof x==="object"&&(x.message||x.msg))registrar((x.code?x.code+": ":"")+(x.message||x.msg),x.stack?String(x.stack).split("\n")[1]:"");
  else if(typeof x==="string")registrar(x,"")}catch(e){}};
window.cxErro=registrar;
})();
