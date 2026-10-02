// Deixa o app instalável e abre a tela mesmo sem sinal (os dados precisam de internet).
const C="cadernex-v27",F=["./","index.html","app.js","agenda.js","licoes.js","negocio.js","chat.js","corridas.js","dados.js","ajustes.js","rastreio.js","faculdades.js","mp.js","veiculo.js","loja.js","config.js","manifest.json","icon-192.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(F)));self.skipWaiting()});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));self.clients.claim()});
self.addEventListener("fetch",e=>{const u=new URL(e.request.url);if(e.request.method!=="GET"||u.origin!==location.origin)return;
  e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(C).then(c=>c.put(e.request,cp));return r}).catch(()=>caches.match(e.request)))});
