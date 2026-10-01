/* Cadernex — Faculdades perto de você (dados do OpenStreetMap via Overpass) */
(function(){
const SERV=["https://overpass-api.de/api/interpreter","https://overpass.private.coffee/api/interpreter","https://maps.mail.ru/osm/tools/overpass/api/interpreter"];
const AUTO="cx-fac-auto",CACHE="cx-fac-cache";
let mapa=null,eu=null,lista=[],marcas=[],buscando=false;
const tira=s=>(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase();
const PALAVRAS_FRACAS=new Set(["faculdade","faculdades","universidade","centro","universitario","instituto","federal","de","do","da","dos","das","e","campus","goiania","goias","escola","the","area","camp","campus","unidade","sede"]);
function minhaFac(nome){ // compara o nome com a instituição que a pessoa cadastrou
  const f=tira(perfil.faculdade);if(!f)return false;const n=tira(nome);
  if(n.includes(f)||f.includes(n))return true;
  const fortes=x=>x.split(/[^a-z0-9]+/).filter(w=>w.length>3&&!PALAVRAS_FRACAS.has(w));
  return fortes(f).some(w=>n.includes(w))||fortes(n).some(w=>w.length>4&&f.includes(w)); // ex.: "UniAnhanguera" acha "Centro Universitário Anhanguera"
}
const wazeLL=(la,ln)=>`https://waze.com/ul?ll=${la},${ln}&navigate=yes`;
const mapsLL=(la,ln,n)=>"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(n+" "+la+","+ln);

function comPrazo(url,op,ms){const c=new AbortController(),t=setTimeout(()=>c.abort(),ms);return fetch(url,{...op,signal:c.signal}).finally(()=>clearTimeout(t))}
async function overpass(lat,lng,raio){
  const q=`[out:json][timeout:12];nwr["amenity"~"^(university|college)$"]["name"](around:${raio},${lat},${lng});out center tags;`;
  for(const url of SERV){ // tenta cada servidor por até 13 s
    try{const r=await comPrazo(url,{method:"POST",body:"data="+encodeURIComponent(q),headers:{"Content-Type":"application/x-www-form-urlencoded"}},13000);
      if(r.ok){const j=await r.json();if(j.elements)return j.elements}}catch(e){}
  }
  return nominatim(lat,lng); // reserva: busca por nome no OpenStreetMap
}
async function nominatim(lat,lng){
  const d=0.15,vb=[lng-d,lat+d,lng+d,lat-d].join(","),out=[];
  for(const termo of ["universidade","faculdade","centro universitário"]){
    try{const r=await comPrazo(`https://nominatim.openstreetmap.org/search?format=jsonv2&accept-language=pt-BR&limit=25&bounded=1&viewbox=${vb}&q=${encodeURIComponent(termo)}`,{},10000);
      if(!r.ok)continue;(await r.json()).forEach(x=>{const n=x.name||(x.display_name||"").split(",")[0];
        const ok=(x.category==="amenity"&&["university","college"].includes(x.type))||(["amenity","building","office"].includes(x.category)&&/faculdade|universidade|universit[aá]rio|instituto federal/i.test(n)&&!/^(rua|av\.?|avenida|alameda|pra[cç]a|travessa|rodovia|ponto)\b/i.test(n));
        if(ok&&n)out.push({lat:+x.lat,lon:+x.lon,tags:{name:n,amenity:x.type==="college"?"college":"university"}})})}catch(e){}
  }
  if(!out.length)throw new Error("sem resposta");
  return out;
}
function limpa(els,lat,lng){
  const vistos=new Map();
  els.forEach(e=>{const la=e.lat??e.center?.lat,ln=e.lon??e.center?.lon,n=(e.tags?.name||"").trim();if(la==null||!n)return;
    const d=cxMapa.metros(lat,lng,la,ln),k=tira(n);
    if(!vistos.has(k)||vistos.get(k).d>d)vistos.set(k,{nome:n,lat:la,lng:ln,d,tipo:e.tags.amenity})});
  return [...vistos.values()].sort((a,b)=>(minhaFac(b.nome)-minhaFac(a.nome))||a.d-b.d);
}
function pos(){return new Promise((ok,falha)=>{if(!navigator.geolocation)return falha(new Error("geo"));
  navigator.geolocation.getCurrentPosition(p=>ok({lat:p.coords.latitude,lng:p.coords.longitude}),falha,{enableHighAccuracy:false,timeout:20000,maximumAge:300000})})}

async function buscar(){
  if(buscando)return;buscando=true;const st=$("fc-st"),bt=$("fc-btn");bt.hidden=true;st.textContent="Pegando sua localização…";
  try{eu=await pos()}catch(e){st.textContent="Não deu pra pegar sua localização. Libere a localização do navegador e toque de novo.";bt.hidden=false;bt.textContent="Tentar de novo";buscando=false;return}
  try{localStorage.setItem(AUTO,"1")}catch(e){}
  // só mandamos ao OpenStreetMap um ponto arredondado (~1 km), nunca o exato
  const la=+eu.lat.toFixed(2),ln=+eu.lng.toFixed(2),ck=la+","+ln;
  let els=null;try{const c=JSON.parse(sessionStorage.getItem(CACHE)||"null");if(c&&c.k===ck)els=c.els}catch(e){}
  if(!els){st.textContent="Procurando faculdades perto de você… (pode levar uns segundos)";
    try{els=await overpass(la,ln,10000);if(els.length<3){try{const e2=await overpass(la,ln,25000);if(e2.length>els.length)els=e2}catch(e){}}
      try{sessionStorage.setItem(CACHE,JSON.stringify({k:ck,els}))}catch(e){}}
    catch(e){st.textContent="O serviço de mapas não respondeu agora. Tente daqui a pouco.";bt.hidden=false;bt.textContent="Tentar de novo";buscando=false;return}}
  lista=limpa(els,eu.lat,eu.lng).slice(0,12);buscando=false;desenha();
}
async function desenha(){
  const st=$("fc-st"),ul=$("fc-lista"),w=$("fc-mapa");
  if(!lista.length){st.textContent="Não achei faculdades cadastradas no mapa perto de você.";ul.innerHTML="";w.hidden=true;return}
  const minha=lista.find(f=>minhaFac(f.nome));
  st.textContent=minha?`Sua faculdade fica a uns ${cxMapa.kmTxt(minha.d*1.3)} de você.`:`${lista.length} faculdade${lista.length>1?"s":""} perto de você.`;
  ul.innerHTML=lista.slice(0,8).map((f,i)=>`<li class="fc-it${minhaFac(f.nome)?" sua":""}" data-i="${i}"><div class="l"><b></b><span>${cxMapa.kmTxt(f.d*1.3)}${minhaFac(f.nome)?" · sua faculdade":f.tipo==="college"?" · faculdade/técnico":""}</span></div><div class="mlinks"><a class="mbtn" target="_blank" rel="noopener" href="${mapsLL(f.lat,f.lng,f.nome)}">Maps</a><a class="mbtn" target="_blank" rel="noopener" href="${wazeLL(f.lat,f.lng)}">Waze</a></div></li>`).join("");
  ul.querySelectorAll(".fc-it").forEach(li=>li.querySelector("b").textContent=lista[+li.dataset.i].nome);
  w.hidden=false;
  try{await cxMapa.leaflet()}catch(e){w.hidden=true;return}
  if(!$("fc-map").offsetWidth)return;
  if(!mapa)mapa=cxMapa.novoMapa($("fc-map"),[eu.lat,eu.lng],13);else mapa.invalidateSize();
  marcas.forEach(m=>m.remove());
  marcas=[L.marker([eu.lat,eu.lng],{icon:cxMapa.pino("●","voce"),title:"Você",zIndexOffset:500}).addTo(mapa)]
    .concat(lista.map(f=>L.marker([f.lat,f.lng],{icon:cxMapa.pino("🎓",minhaFac(f.nome)?"fac sua":"fac"),title:f.nome}).addTo(mapa)));
  const alvo=minha||lista[0];
  mapa.fitBounds([[eu.lat,eu.lng],[alvo.lat,alvo.lng],...lista.slice(0,5).map(f=>[f.lat,f.lng])],{padding:[28,28],maxZoom:15});
}
$("fc-btn").onclick=buscar;
$("fc-lista").addEventListener("click",e=>{const li=e.target.closest(".fc-it");if(!li||e.target.closest("a")||!mapa)return;const f=lista[+li.dataset.i];mapa.setView([f.lat,f.lng],16);$("fc-map").scrollIntoView({behavior:"smooth",block:"center"})});
// abre sozinho se a pessoa já usou antes
if(typeof go==="function"){const g=go;go=function(v){g(v);if(v==="agenda"){let a=false;try{a=localStorage.getItem(AUTO)==="1"}catch(e){}if(a&&!lista.length&&!buscando)setTimeout(buscar,200);else if(lista.length)setTimeout(desenha,50)}}}
})();
