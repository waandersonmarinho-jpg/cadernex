/* Cadernex — mapa: busca de endereço e distância de rota.
   Usa o Geoapify (chave em config.js). Se ele falhar ou não achar, cai no OpenStreetMap
   (Nominatim / OSRM), como era antes. Devolve no mesmo formato do Nominatim pra o resto do app não mudar. */
(function(){
  const KEY=(window.CORRE_CONFIG||{}).GEOAPIFY_KEY||"";
  const prazo=(u,ms=8000)=>{const ac=new AbortController(),t=setTimeout(()=>ac.abort(),ms);
    return fetch(u,{signal:ac.signal,headers:{"Accept-Language":"pt-BR"}}).finally(()=>clearTimeout(t))};
  const CLASSE={building:"building",amenity:"amenity",street:"highway"};
  // resultado do Geoapify → formato do Nominatim (lat, lon, address, class, boundingbox)
  const comoNomi=r=>{const b=r.bbox;return{
    lat:String(r.lat),lon:String(r.lon),display_name:r.formatted||"",name:r.name||r.address_line1||"",
    class:CLASSE[r.result_type]||"place",type:r.result_type||"",
    address:{road:r.street,suburb:r.suburb,neighbourhood:r.neighbourhood||r.district,city_district:r.district,
      quarter:r.quarter,residential:r.residential,city:r.city,state:r.state,postcode:r.postcode},
    ...(b&&b.lat1!=null?{boundingbox:[String(Math.min(b.lat1,b.lat2)),String(Math.max(b.lat1,b.lat2)),String(Math.min(b.lon1,b.lon2)),String(Math.max(b.lon1,b.lon2))]}:{})}};

  async function geoapify(q,limit){
    const u=`https://api.geoapify.com/v1/geocode/search?format=json&lang=pt&filter=countrycode:br&limit=${limit}&text=${encodeURIComponent(q)}&apiKey=${KEY}`;
    const r=await prazo(u);if(!r.ok)throw new Error("geoapify "+r.status);
    return ((await r.json()).results||[]).map(comoNomi);
  }
  async function nominatim(q,limit){
    const r=await prazo(`https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=${limit}&countrycodes=br&q=${encodeURIComponent(q)}`);
    return await r.json();
  }
  // lista de lugares (formato Nominatim). precisaCaixa: só serve resultado com boundingbox (caixa da cidade)
  async function busca(q,limit=5,precisaCaixa=false){
    if(KEY){try{const l=await geoapify(q,limit);if(l.length&&(!precisaCaixa||l.some(x=>x.boundingbox)))return l}catch(e){}}
    return nominatim(q,limit);
  }
  // primeiro ponto achado: {lat,lng} ou null
  async function ponto(q){try{const d=await busca(q,1);return d&&d[0]?{lat:+d[0].lat,lng:+d[0].lon}:null}catch(e){return null}}
  // distância de carro em metros, ou null
  async function rotaMetros(a,b){
    if(KEY){try{const r=await prazo(`https://api.geoapify.com/v1/routing?mode=drive&waypoints=${a.lat},${a.lng}|${b.lat},${b.lng}&apiKey=${KEY}`);
      if(r.ok){const d=await r.json(),m=d.features&&d.features[0]&&d.features[0].properties.distance;if(m>0)return m}}catch(e){}}
    try{const r=await prazo(`https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=false`);
      const d=await r.json();if(d.routes&&d.routes[0])return d.routes[0].distance}catch(e){}
    return null;
  }
  window.cxGeo={busca,ponto,rotaMetros};
})();
