// Deixa o app instalável e abre na hora: os arquivos do app saem da memória do celular
// e são atualizados por trás. Os dados (Supabase) sempre vêm da internet.
const C="cadernex-v77";
const F=["./","index.html","app.js","agenda.js","licoes.js","negocio.js","chat.js","corridas.js","dados.js","ajustes.js","instalar.js","alerta.js","push.js","rastreio.js","faculdades.js","mp.js","veiculo.js","pedir.js","lote.js","enviar.js","ganhos.js","foto.js","cadastros.js","saude.js","lojainfo.js","monitor.js","config.js","manifest.json","icon-192.png","icon.svg","marca.svg"];
const LIB="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>Promise.all([c.addAll(F.map(u=>new Request(u,{cache:"reload"}))),c.add(LIB).catch(()=>{})])));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;
  const u=new URL(e.request.url);
  // biblioteca do Supabase: da memória na hora, atualiza por trás
  if(u.href===LIB){e.respondWith(caches.open(C).then(c=>c.match(LIB).then(g=>{const rede=fetch(e.request).then(x=>{if(x.ok)c.put(LIB,x.clone());return x}).catch(()=>g);if(g){e.waitUntil(rede);return g}return rede})));return}
  if(u.origin!==location.origin)return;
  // arquivos do app: responde na hora com o que está guardado e atualiza por trás
  e.respondWith(caches.open(C).then(c=>c.match(e.request,{ignoreSearch:true}).then(guardado=>{
    const rede=fetch(e.request,{cache:"no-cache"}).then(r=>{if(r.ok)c.put(e.request.url.split("?")[0],r.clone());return r}).catch(()=>guardado||c.match("./").then(x=>x||Response.error()));
    if(guardado){e.waitUntil(rede);return guardado}
    return rede;
  })));
});
// toque na notificação: abre (ou traz pra frente) o Cadernex
self.addEventListener("notificationclick",e=>{e.notification.close();e.waitUntil(self.clients.matchAll({type:"window",includeUncontrolled:true}).then(l=>{const a=l.find(c=>"focus" in c);return a?a.focus():self.clients.openWindow("./")}))});
// aviso do servidor (app fechado): pergunta o texto e mostra a notificação
const PUSH_FN="https://pwmnczoiybktyxavjbjl.supabase.co/functions/v1/push";
self.addEventListener("push",e=>{e.waitUntil(self.registration.pushManager.getSubscription()
  .then(s=>s?fetch(PUSH_FN+"?e="+encodeURIComponent(s.endpoint)).then(r=>r.json()):{}).catch(()=>({}))
  .then(m=>self.registration.showNotification(m.titulo||"Cadernex",{body:m.corpo||"Tem novidade no Cadernex. Toque pra ver.",icon:"icon-192.png",badge:"icon-192.png",tag:m.tag||"cadernex",renotify:true,vibrate:[300,120,300,120,300],requireInteraction:/^(corrida|enc)-/.test(m.tag||""),data:{url:"./"}})))});
