/* Cadernex — Corridas: entregador fica disponível, cliente pede, entregador aceita */
let verLongos=false,pfTipo="entrega";const BIKE_MAX=5;
const VEIC={bike:{n:"Bike",i:"🚲"},moto:{n:"Moto",i:"🛵"},
  picape_p:{n:"Picape pequena",ex:"Saveiro, Strada, Montana",i:"🛻",frete:1,base:40,km:3},
  picape_m:{n:"Picape média",ex:"S10, Hilux, Ranger",i:"🛻",frete:1,base:60,km:3.5},
  caminhao:{n:"Caminhão pequeno",ex:"VUC, 3/4, baú",i:"🚚",frete:1,base:150,km:5}};
/* ícones de linha, no mesmo estilo da barra de baixo */
const _sv=d=>`<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${d}</svg>`;
const IC={
  bike:_sv('<circle cx="5.5" cy="16.5" r="3.5"/><circle cx="18.5" cy="16.5" r="3.5"/><path d="M5.5 16.5 9 9h6l3.5 7.5M9 9 12 16.5h-1M15 9l-1-3h-2"/>'),
  moto:_sv('<circle cx="5.5" cy="16.5" r="3"/><circle cx="18.5" cy="16.5" r="3"/><path d="M5.5 16.5 9 11h5l3 5.5M14 11l-1.5-4H10M15 7h3"/>'),
  picape:_sv('<path d="M2 15V11h9V7h5l3 4h3v4"/><circle cx="7" cy="16.5" r="2"/><circle cx="17" cy="16.5" r="2"/><path d="M9 16.5h6M2 15h3M19 15h3"/>'),
  caminhao:_sv('<path d="M2 6h11v10H2zM13 10h4l3 3v3h-7"/><circle cx="6" cy="17.5" r="2"/><circle cx="17" cy="17.5" r="2"/>'),
  loja:_sv('<path d="M3 9l1.5-5h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6"/>'),
  cal:_sv('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  cam:_sv('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
  chat:_sv('<path d="M4 5h16v11H9l-5 4z"/>')
};
const icVei=v=>IC[{bike:"bike",moto:"moto",picape_p:"picape",picape_m:"picape",caminhao:"caminhao"}[v]]||IC.picape;
const FRETE_VEIC=["picape_p","picape_m","caminhao"],AJUDANTE=70,ANDAR=15;
const CARROC="Qualquer com carroceria";
const veiNome=v=>v==="carroceria"?CARROC:(VEIC[v]||{}).n||"Qualquer";
const veiCod=nome=>Object.keys(VEIC).find(k=>VEIC[k].n===nome)||"bike";
const precoFrete=(v,k,aj,an)=>{const x=VEIC[v]||VEIC.picape_p; // "qualquer com carroceria" usa a tabela da picape pequena
 return Math.ceil((x.base+x.km*(k||0)+(aj||0)*AJUDANTE+(an||0)*ANDAR)*2)/2};
const quandoTxt=iso=>{const d=new Date(iso),h=new Date(),am=new Date(h);am.setDate(h.getDate()+1);const dia=d.toDateString()===h.toDateString()?"hoje":d.toDateString()===am.toDateString()?"amanhã":d.toLocaleDateString("pt-BR",{weekday:"short",day:"2-digit",month:"2-digit"});return dia+" às "+hm(d)};
let maisAbertos=new Set(),relatos=[],relForm=null,abertas=[],minhas=[],disp=[],dets={},cmsgs={},corrOk=true,corrCanal=null,corrAberta=null,medias={},corrT=null;
const ST={aberta:"Procurando entregador",aceita:"Entregador a caminho da coleta",coletada:"A caminho da entrega",entregue:"Entregue",cancelada:"Cancelada"};
const ANOT_KEY="cadernex_corridas_anotadas";
let anotadas=(()=>{try{return JSON.parse(localStorage.getItem(ANOT_KEY))||[]}catch(e){return[]}})();
const fresco=d=>Date.now()-new Date(d.atualizado_em)<4*3600e3;
const ha=iso=>{const m=Math.max(0,Math.round((Date.now()-new Date(iso))/60000));return m<1?"agora":m<60?`há ${m} min`:m<1440?`há ${Math.floor(m/60)}h`:new Date(iso).toLocaleDateString("pt-BR")};
const hmOf=iso=>hm(new Date(iso));
const ponto=(lat,lng,end)=>lat!=null&&lng!=null?`${lat},${lng}`:end;
const wazeQ=(lat,lng,end)=>lat!=null&&lng!=null?`https://waze.com/ul?ll=${lat},${lng}&navigate=yes`:`https://waze.com/ul?q=${encodeURIComponent(end)}&navigate=yes`;
const mapsQ=q=>"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(q);
const mapsRota=(a,b,v)=>`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(a)}&destination=${encodeURIComponent(b)}&travelmode=${v==="bike"?"bicycling":"driving"}`;
function km(a,b,c,d){if([a,b,c,d].some(x=>x==null||x===""))return null;const R=6371,r=x=>x*Math.PI/180;const dl=r(c-a),dn=r(d-b);const h=Math.sin(dl/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin(dn/2)**2;return Math.round(R*2*Math.asin(Math.sqrt(h))*1.3*10)/10} // ×1.3: ruas não são linha reta
const MOT={nao_entregou:"Não entregou",atraso:"Atraso grande",avaria:"Encomenda danificada",cobranca:"Cobrou a mais",conduta:"Falta de respeito",nao_pagou:"Não pagou",endereco:"Endereço errado",item_proibido:"Item proibido"};
const meuDisp=()=>disp.find(d=>d.user_id===uid&&fresco(d));

/* ---------- dados ---------- */
async function corrLoad(){
  if(!sb||!uid)return;
  const [a,m,d]=await Promise.all([
    sb.from("corridas").select("*").eq("status","aberta").order("created_at",{ascending:false}).limit(50),
    sb.from("corridas").select("*").or(`cliente_id.eq.${uid},entregador_id.eq.${uid}`).order("created_at",{ascending:false}).limit(40),
    sb.from("disponiveis").select("*")]);
  if(a.error||m.error||d.error){corrOk=false;corrRender();return}
  corrOk=true;abertas=a.data;minhas=m.data;disp=d.data;
  const ri=await sb.from("infracoes").select("id,corrida_id,motivo,alvo_id,autor_id,arquivada");relatos=ri.error?[]:ri.data;
  const ids=minhas.filter(c=>["aceita","coletada","entregue"].includes(c.status)||c.cliente_id===uid).map(c=>c.id);
  if(ids.length){const r=await sb.from("corridas_det").select("*").in("corrida_id",ids);if(!r.error)r.data.forEach(x=>dets[x.corrida_id]=x)}
  for(const c of minhas)if(c.entregador_id&&c.cliente_id===uid&&!medias[c.entregador_id]){const r=await sb.rpc("media_entregador",{uid:c.entregador_id});if(!r.error)medias[c.entregador_id]=r.data}
  corrRender();corrSub();
}
function corrRecarregar(){clearTimeout(corrT);corrT=setTimeout(corrLoad,600)}
function corrSub(){
  if(corrCanal||!sb.channel)return;
  corrCanal=sb.channel("corridas")
    .on("postgres_changes",{event:"*",schema:"public",table:"corridas"},p=>{
      const c=p.new;const md0=meuDisp();if(p.eventType==="INSERT"&&c&&c.status==="aberta"&&c.cliente_id!==uid&&md0&&perfil.tipo==="entregador"&&(c.veiculo==="qualquer"||c.veiculo===md0.veiculo||(c.veiculo==="carroceria"&&FRETE_VEIC.includes(md0.veiculo)))&&!(md0.veiculo==="bike"&&Number(c.distancia_km)>BIKE_MAX)){
        if(window.alertaCorrida)alertaCorrida(c);else{toast(`Corrida nova: ${c.coleta_bairro} → ${c.entrega_bairro} · ${brl(Number(c.valor))}`);try{navigator.vibrate&&navigator.vibrate([200,100,200])}catch(e){}}}
      if(c&&p.eventType==="UPDATE"&&c.status!=="aberta"&&c.entregador_id!==uid&&window.alertaSumir)alertaSumir(c.id);
      if(c&&c.cliente_id===uid&&p.eventType==="UPDATE"&&p.old&&c.status!==p.old.status&&c.status!=="aberta"){toast("Seu pedido: "+ST[c.status]);if(window.alertaPedido)alertaPedido(c,ST[c.status])}
      corrRecarregar()})
    .on("postgres_changes",{event:"INSERT",schema:"public",table:"corrida_msgs"},p=>{const m=p.new;if(!cmsgs[m.corrida_id])return;if(cmsgs[m.corrida_id].some(x=>x.id===m.id))return;cmsgs[m.corrida_id].push(m);corrRender();if(m.user_id!==uid)toast("Mensagem nova na corrida")})
    .on("postgres_changes",{event:"*",schema:"public",table:"disponiveis"},corrRecarregar)
    .subscribe();
}
async function abrirChat(id){if(cmsgs[id])return;const r=await sb.from("corrida_msgs").select("*").eq("corrida_id",id).order("created_at");cmsgs[id]=r.error?[]:r.data;corrRender()}

/* ---------- cartão de corrida ---------- */
function cartao(c,papel){ // papel: "ent" | "cli"
  const d=dets[c.id],ativo=["aceita","coletada"].includes(c.status),aberto=corrAberta===c.id||(ativo&&corrAberta==null);
  const pill=`<span class="pill st-${c.status}">${c.tipo==="frete"?ST[c.status].replace("Entregador","Freteiro").replace("entregador","freteiro"):ST[c.status]}</span>`;
  let h=`<div class="corr${aberto?" open":""}" data-corr="${c.id}"><div class="corr-h" data-toggle="${c.id}"><div class="l"><div class="t">${esc(c.coleta_bairro)} → ${esc(c.entrega_bairro)}</div><div class="s">${esc(c.item)}${c.distancia_km?` · ~${String(c.distancia_km).replace(".",",")} km`:""} · ${ha(c.created_at)}</div></div><div class="corr-v num">${brl(Number(c.valor))}</div></div>`;
  const fr=c.tipo==="frete",jj=c.distancia_km?(fr?precoFrete(c.veiculo,Number(c.distancia_km),c.ajudantes,c.andares):justo(Number(c.distancia_km))):null,selo=jj==null?"":Number(c.valor)>=jj?`<span class="pill justo">Valor justo</span>`:`<span class="pill abaixo">Abaixo do justo (${brl(jj)})</span>`;
  h+=`<div class="corr-meta">${fr?`<span class="pill frete">Frete</span>`:""}${pill}${selo}${c.veiculo!=="qualquer"?`<span class="pill">${icVei(c.veiculo)}${veiNome(c.veiculo)}</span>`:""}${c.agendado_para?`<span class="pill agenda">${IC.cal}${quandoTxt(c.agendado_para)}</span>`:""}${fr&&c.ajudantes?`<span class="pill">${c.ajudantes} ajudante${c.ajudantes>1?"s":""}</span>`:""}${fr&&c.andares?`<span class="pill">${c.andares} andar${c.andares>1?"es":""} de escada</span>`:""}</div>`;
  if(!aberto)return h+(papel==="ent"&&c.status==="aberta"?`<button class="btn full" data-aceitar="${c.id}">Aceitar por ${brl(Number(c.valor))}</button>`:"")+`</div>`;
  if(papel==="cli"&&c.entregador_nome){const md=medias[c.entregador_id];h+=`<p class="corr-pessoa"><span class="av" data-av="${c.entregador_id}" hidden></span>${fr?"Freteiro":"Entregador"}: <b>${esc(c.entregador_nome)}</b>${c.ent_veiculo?` · ${veiNome(c.ent_veiculo)}`:""}${c.ent_placa?` · placa <b class="placa">${esc(c.ent_placa.replace(/^(...)/,"$1-"))}</b>`:""}${md&&md.avaliacoes?` · ★ ${String(md.media).replace(".",",")} (${md.avaliacoes})`:""}${md&&md.entregas?` · ${md.entregas} entregas`:""}</p>`}
  if(papel==="cli"&&c.entregador_id&&["aceita","coletada","entregue"].includes(c.status))h+=`<div class="vfoto-cli" data-vfoto="${c.id}"></div>`;
  if(papel==="ent"&&c.status!=="aberta")h+=`<p class="corr-pessoa"><span class="av" data-av="${c.cliente_id}" hidden></span>Cliente: <b>${esc(c.cliente_nome||"Cliente")}</b></p>`;
  if(d){const a=ponto(d.coleta_lat,d.coleta_lng,d.coleta_end),b=ponto(d.entrega_lat,d.entrega_lng,d.entrega_end);
    h+=`<div class="corr-end"><div><span class="eyebrow">Coleta</span><p>${esc(d.coleta_end)}</p><div class="mlinks"><a class="mbtn" href="${mapsQ(a)}" target="_blank" rel="noopener">Maps</a><a class="mbtn" href="${wazeQ(d.coleta_lat,d.coleta_lng,d.coleta_end)}" target="_blank" rel="noopener">Waze</a></div></div><div><span class="eyebrow">Entrega</span><p>${esc(d.entrega_end)}</p><div class="mlinks"><a class="mbtn" href="${mapsQ(b)}" target="_blank" rel="noopener">Maps</a><a class="mbtn" href="${wazeQ(d.entrega_lat,d.entrega_lng,d.entrega_end)}" target="_blank" rel="noopener">Waze</a></div></div></div>
    <a class="btn ghost full" href="${mapsRota(a,b,c.veiculo)}" target="_blank" rel="noopener">Ver rota completa no Maps</a>`;
    if(d.contato)h+=`<p class="corr-pessoa">Contato: <a href="tel:${esc(d.contato.replace(/[^\d+]/g,""))}">${esc(d.contato)}</a></p>`;
    if(d.obs)h+=`<p class="hint" style="margin:0">Obs.: ${esc(d.obs)}</p>`;}
  else if(papel==="ent"&&c.status==="aberta")h+=`<p class="hint" style="margin:0">O endereço completo aparece depois que você aceitar.</p>`;
  if(ativo&&c.entregador_id)h+=`<div class="gps" data-gps="${c.id}" data-papel="${papel}"></div>`;
  // antes de alguém aceitar: o cliente já sabe como vai pagar
  if(papel==="cli"&&c.status==="aberta")h+=`<div class="mp-box pg-info"><b>💳 Como pagar</b><p class="hint" style="margin:0">Você só paga depois que um entregador aceitar: <b>pelo app no Pix</b> (${brl(Number(c.valor))} + taxa de serviço) ou <b>em dinheiro</b> na entrega (${brl(Number(c.valor))}). Aparece aqui qual dá pra usar.</p></div>`;
  if(c.entregador_id&&(ativo||(c.status==="entregue"&&Date.now()-new Date(c.entregue_em||c.created_at)<3*864e5)))h+=`<div class="mpbox" data-mp="${c.id}" data-papel="${papel}"></div><div class="pixbox" data-pix="${c.id}" data-papel="${papel}"></div>`;
  // ações
  let ac="",mais="";
  if(papel==="ent"){
    if(c.status==="aberta")ac=`<button class="btn full" data-aceitar="${c.id}">Aceitar por ${brl(Number(c.valor))}</button>`;
    if(c.status==="aceita"){ac=`<button class="btn full" data-acao="coletada" data-id="${c.id}">Peguei a encomenda</button>`;mais+=`<button class="link" data-acao="devolver" data-id="${c.id}">Não vou conseguir (devolver)</button>`}
    if(c.status==="coletada")ac=`<button class="btn full" data-acao="entregue" data-id="${c.id}">Entreguei</button>`;
    if(c.status==="entregue"&&!anotadas.includes(c.id))ac=`<button class="btn ghost full" data-anotar="${c.id}">Anotar ${brl(Number(c.valor))} no meu Cadernex</button>`;
  }else{
    if(c.status==="aberta")ac=`<button class="link" data-acao="cancelar" data-id="${c.id}" style="color:var(--bad)">Cancelar pedido</button>`;
    if(c.status==="aceita")mais+=`<button class="link" data-acao="cancelar" data-id="${c.id}" style="color:var(--bad)">Cancelar pedido</button>`;
    if(c.status==="entregue"&&!c.nota)ac=`<div class="estrelas"><span>Avalie o entregador:</span>${[1,2,3,4,5].map(n=>`<button type="button" data-nota="${n}" data-id="${c.id}" aria-label="${n} estrelas">★</button>`).join("")}</div>`;
    if(c.status==="entregue"&&c.nota)ac=`<p class="hint" style="margin:0">Você avaliou com ${"★".repeat(c.nota)}</p>`;
  }
  if(ac)h+=`<div class="corr-ac">${ac}</div>`;
  if(c.entregador_id&&c.status!=="aberta"&&!relatos.some(r=>r.corrida_id===c.id&&r.autor_id===uid)){
    if(relForm!==c.id)mais+=`<button class="link rel-link" data-relform="${c.id}">Relatar problema</button>`;
    else{const ms=papel==="cli"?["nao_entregou","atraso","avaria","cobranca","conduta"]:["nao_pagou","endereco","item_proibido","conduta"];
      mais+=`<form class="rel-form" data-relsend="${c.id}"><div class="eyebrow">Qual foi o problema?</div><div class="chips">${ms.map((m,i)=>`<button type="button" class="chip" data-mot="${m}" aria-pressed="${i===0}">${MOT[m]}</button>`).join("")}</div><input type="text" maxlength="300" placeholder="Conte rapidinho o que aconteceu (opcional)" aria-label="Detalhe"><p class="hint" style="margin:0">Relatos falsos prejudicam um trabalhador. Use só se aconteceu mesmo. Com 3 relatos a conta é bloqueada para análise.</p><div class="row"><button type="button" class="link" data-relcancel="1">Cancelar</button><button class="btn" type="submit">Enviar relato</button></div></form>`}
  }else if(relatos.some(r=>r.corrida_id===c.id&&r.autor_id===uid))mais+=`<p class="hint" style="margin:0">Você relatou um problema nessa corrida.</p>`;
  if(mais){const ab=maisAbertos.has(c.id)||relForm===c.id;h+=`<details class="corr-mais"${ab?" open":""}><summary data-mais="${c.id}">Mais opções</summary><div class="corr-mais-c">${mais}</div></details>`}
  // chat
  if(c.status!=="aberta"&&c.status!=="cancelada"){const ms=cmsgs[c.id];
    h+=`<div class="corr-chat"><div class="eyebrow">Conversa da corrida</div>`;
    if(!ms){h+=`<button class="link" data-chat="${c.id}">Abrir conversa</button>`}
    else{h+=`<div class="cc-lista">${ms.length?ms.map(m=>`<div class="cc-m${m.user_id===uid?" meu":""}"><span data-txt="${m.id}"></span><small>${hmOf(m.created_at)}</small></div>`).join(""):`<p class="hint" style="margin:0">Nenhuma mensagem ainda.</p>`}</div>`;
      if(["aceita","coletada"].includes(c.status))h+=`<form class="cc-form" data-ccform="${c.id}"><input type="text" maxlength="500" placeholder="Mensagem…" aria-label="Mensagem"><button class="btn" type="submit">Enviar</button></form>`;}
    h+=`</div>`}
  return h+`</div>`;
}
function preencheTextos(){Object.values(cmsgs).flat().forEach(m=>{document.querySelectorAll(`[data-txt="${m.id}"]`).forEach(el=>el.textContent=m.texto)})}

/* ---------- telas ---------- */
function corrRender(){
  if(!$("v-corridas"))return;
  document.querySelectorAll(".co-erro").forEach(e=>e.hidden=corrOk);
  // BLOQUEIO
  const contra=relatos.filter(r=>r.alvo_id===uid&&!r.arquivada);
  document.querySelectorAll(".bloq").forEach(b=>{b.hidden=!perfil.bloqueado;if(perfil.bloqueado){b.querySelector(".bloq-mot").textContent=contra.map(r=>MOT[r.motivo]).join(" · ")||"3 relatos de problema";const ta=b.querySelector("textarea");if(document.activeElement!==ta)ta.value=perfil.defesa||""}});
  document.querySelectorAll(".rel-cont").forEach(el=>el.textContent=contra.length&&!perfil.bloqueado?`Relatos contra você: ${contra.length} de 3 (${contra.map(r=>MOT[r.motivo]).join(", ")})`:"");
  $("co-dispbox").hidden=!!perfil.bloqueado;$("fPedir").hidden=!!perfil.bloqueado||!$("lt-painel").hidden;$("lt-painel").hidden=$("lt-painel").hidden||!!perfil.bloqueado;$("lt-abrir").hidden=!!perfil.bloqueado||!$("lt-painel").hidden;
  // ENTREGADOR
  const md=meuDisp();
  $("co-on").hidden=!md;$("fDisp").hidden=!!md;
  if(md)$("co-ontxt").textContent=`${veiNome(md.veiculo)}${md.regiao?" · "+md.regiao:""} · desde ${hmOf(md.atualizado_em)}`;
  const andam=minhas.filter(c=>c.entregador_id===uid&&["aceita","coletada"].includes(c.status));
  $("co-andam-w").hidden=!andam.length;$("co-andam").innerHTML=andam.map(c=>cartao(c,"ent")).join("");
  const vei=md?md.veiculo:null;
  const todas=abertas.filter(c=>c.status==="aberta"&&c.cliente_id!==uid&&(!vei||c.veiculo==="qualquer"||c.veiculo===vei||(c.veiculo==="carroceria"&&FRETE_VEIC.includes(vei))));
  const longa=c=>vei==="bike"&&Number(c.distancia_km)>BIKE_MAX;
  const ab=verLongos?todas:todas.filter(c=>!longa(c)),escondidas=todas.length-ab.length;
  $("co-abertas").innerHTML=(ab.length?ab.map(c=>cartao(c,"ent")).join(""):`<p class="empty">Nenhum pedido aberto${vei==="bike"&&escondidas?` de até ${BIKE_MAX} km`:""} agora. ${md?"Você vai receber um aviso quando chegar um.":"Fique disponível pra receber avisos."}</p>`)
    +(vei==="bike"&&(escondidas||verLongos)?`<button type="button" class="link longos" data-longos="1">${verLongos?`Mostrar só até ${BIKE_MAX} km`:`Ver também ${escondidas} pedido${escondidas>1?"s":""} acima de ${BIKE_MAX} km`}</button><p class="hint" style="margin:0;font-size:12px">De bike, mostramos primeiro corridas de até ${BIKE_MAX} km. As longas pagam igual, mas levam o dobro do tempo pedalando.</p>`:"");
  const feitas=minhas.filter(c=>c.entregador_id===uid&&c.status==="entregue").slice(0,5);
  $("co-feitas-w").hidden=!feitas.length;$("co-feitas").innerHTML=feitas.map(c=>cartao(c,"ent")).join("");
  // CLIENTE
  const on=disp.filter(d=>fresco(d)&&(pfTipo==="frete"?FRETE_VEIC.includes(d.veiculo):!FRETE_VEIC.includes(d.veiculo))),porV=Object.keys(VEIC).map(k=>[k,on.filter(d=>d.veiculo===k).length]).filter(x=>x[1]);
  const qm=pfTipo==="frete"?"freteiro":"entregador";$("pd-disp").innerHTML=on.length?`<b>${on.length} ${qm}${on.length>1?(qm==="freteiro"?"s":"es"):""} disponível${on.length>1?"is":""} agora</b><span>${porV.map(([k,n])=>n+" "+veiNome(k).toLowerCase()).join(" · ")}</span>${[...new Set(on.map(d=>d.regiao).filter(Boolean))].slice(0,6).map(r=>`<span class="pill">${esc(r)}</span>`).join("")}`:`<b>Nenhum ${pfTipo==="frete"?"freteiro":"entregador"} disponível agora</b><span>Você pode pedir mesmo assim. O pedido fica aberto até alguém aceitar.</span>`;
  const meus=minhas.filter(c=>c.cliente_id===uid);
  $("pd-lista").innerHTML=meus.length?meus.map(c=>cartao(c,"cli")).join(""):`<p class="empty">Você ainda não fez pedidos. Toque em <b>Pedir</b> pra fazer o primeiro.</p>`;
  const ativos=meus.filter(c=>["aberta","aceita","coletada"].includes(c.status)).length;
  document.querySelectorAll('.tab[data-v="pedidos"]').forEach(t=>{let b=t.querySelector(".nb");if(!ativos){b&&b.remove();return}if(!b){b=document.createElement("span");b.className="nb";t.appendChild(b)}b.textContent=ativos});
  preencheTextos();
}

/* ---------- ações ---------- */
function onCorrClick(e){
  const sm=e.target.closest("summary[data-mais]");if(sm){const id=sm.dataset.mais;setTimeout(()=>{const d=sm.parentElement;if(d.open)maisAbertos.add(id);else maisAbertos.delete(id)},0);return}
  if(e.target.closest("[data-longos]")){verLongos=!verLongos;corrRender();return}
  const t=e.target.closest("[data-toggle]");if(t){corrAberta=corrAberta===t.dataset.toggle?"__nenhuma":t.dataset.toggle;corrRender();return}
  const a=e.target.closest("[data-aceitar]");if(a){a.disabled=true;safe(async()=>{const{error}=await sb.rpc("aceitar_corrida",{cid:a.dataset.aceitar});if(error)throw error;corrAberta=a.dataset.aceitar;await corrLoad()},"Corrida aceita! Veja o endereço de coleta.").finally(()=>a.disabled=false);return}
  const x=e.target.closest("[data-acao]");if(x){const acao=x.dataset.acao;
    if(["cancelar","devolver"].includes(acao)&&x.dataset.ok!=="1"){x.dataset.ok="1";x.textContent=acao==="cancelar"?"Toque de novo pra cancelar":"Toque de novo pra devolver";return}
    safe(async()=>{const{error}=await sb.rpc("mudar_corrida",{cid:x.dataset.id,acao});if(error)throw error;await corrLoad()},{coletada:"Encomenda coletada",entregue:"Entrega concluída!",devolver:"Corrida devolvida",cancelar:"Pedido cancelado"}[acao]);return}
  const n=e.target.closest("[data-nota]");if(n){safe(async()=>{const{error}=await sb.rpc("avaliar_corrida",{cid:n.dataset.id,n:+n.dataset.nota});if(error)throw error;await corrLoad()},"Obrigado pela avaliação!");return}
  const rf=e.target.closest("[data-relform]");if(rf){relForm=rf.dataset.relform;corrRender();return}
  if(e.target.closest("[data-relcancel]")){relForm=null;corrRender();return}
  const mt=e.target.closest("[data-mot]");if(mt){mt.parentElement.querySelectorAll(".chip").forEach(x=>x.setAttribute("aria-pressed",x===mt));return}
  const ch=e.target.closest("[data-chat]");if(ch){abrirChat(ch.dataset.chat);return}
  const an=e.target.closest("[data-anotar]");if(an){const c=minhas.find(z=>z.id===an.dataset.anotar);if(!c)return;
    const ini=new Date(c.aceita_em||c.created_at),fim=new Date(c.entregue_em||Date.now());
    const o={data:ymd(fim),inicio:hm(ini),fim:hm(fim),minutos:Math.max(1,Math.round((fim-ini)/60000)),app:"Cadernex",ganho:Number(c.valor),gorjeta:0,km:Number(c.distancia_km)||0,entregas:1};
    safe(async()=>{const{data,error}=await sb.from("turnos").insert(o).select().single();if(error)throw error;turnos.unshift({...data,ganho:N(data.ganho),gorjeta:0,km:N(data.km)});anotadas.push(c.id);try{localStorage.setItem(ANOT_KEY,JSON.stringify(anotadas))}catch(e){}render();corrRender()},"Ganho anotado no Resumo");return}
}
function onCorrSubmit(e){
  const rs=e.target.closest("[data-relsend]");if(rs){e.preventDefault();const mot=rs.querySelector('[aria-pressed="true"]')?.dataset.mot;const det=rs.querySelector("input").value.trim()||null;
    safe(async()=>{const{error}=await sb.from("infracoes").insert({corrida_id:rs.dataset.relsend,alvo_id:uid,motivo:mot,detalhe:det});if(error)throw error;relForm=null;await corrLoad()},"Relato enviado");return}
  const f=e.target.closest("[data-ccform]");if(!f)return;e.preventDefault();const inp=f.querySelector("input"),txt=inp.value.trim();if(!txt)return;const id=f.dataset.ccform;
  safe(async()=>{const{data,error}=await sb.from("corrida_msgs").insert({corrida_id:id,texto:txt}).select().single();if(error)throw error;inp.value="";(cmsgs[id]=cmsgs[id]||[]).push(data);corrRender()})}
["co-andam","co-abertas","co-feitas","pd-lista"].forEach(id=>{$(id).addEventListener("click",onCorrClick);$(id).addEventListener("submit",onCorrSubmit)});

// ficar disponível
chips($("dp-vei"),Object.values(VEIC).map(v=>v.n),"Bike");
$("fDisp").onsubmit=e=>{e.preventDefault();const o={veiculo:veiCod(picked($("dp-vei"))),regiao:$("dp-reg").value.trim()||null};
  safe(async()=>{if(FRETE_VEIC.includes(o.veiculo)&&typeof salvarPlaca==="function")await salvarPlaca(o.veiculo,"dp");const{error}=await sb.from("disponiveis").upsert(o);if(error)throw error;try{localStorage.setItem("cadernex_disp",JSON.stringify(o))}catch(e){}await corrLoad()},"Você está disponível")};
$("co-off").onclick=()=>safe(async()=>{const{error}=await sb.from("disponiveis").delete().eq("user_id",uid);if(error)throw error;await corrLoad()},"Você saiu do modo disponível");
try{const s=JSON.parse(localStorage.getItem("cadernex_disp"));if(s){$("dp-reg").value=s.regiao||"";$("dp-vei").querySelectorAll(".chip").forEach(c=>c.setAttribute("aria-pressed",veiCod(c.textContent)===s.veiculo))}}catch(e){}

// pedir entrega
function pfVeiChips(){if(pfTipo==="frete")chips($("pf-vei"),[CARROC,...FRETE_VEIC.map(k=>VEIC[k].n)],CARROC);else chips($("pf-vei"),["Qualquer","Bike","Moto"],"Qualquer")}
const pfVei=()=>{const n=picked($("pf-vei"));return n==="Qualquer"?"qualquer":n===CARROC?"carroceria":veiCod(n)};
chips($("pf-aj"),["0","1","2"],"0");
function pfTipoSet(t){pfTipo=t;document.querySelectorAll("#pf-tipo [data-pt]").forEach(b=>b.setAttribute("aria-pressed",b.dataset.pt===t));
  document.querySelectorAll(".so-frete").forEach(el=>el.hidden=t!=="frete");document.querySelectorAll(".so-entrega").forEach(el=>el.hidden=t==="frete");
  $("pf-item").placeholder=t==="frete"?"ex.: geladeira, sofá de 3 lugares, 10 caixas":"ex.: 2 marmitas, documento, remédio";
  $("pf-btn").textContent=t==="frete"?"Pedir frete":"Pedir entrega";pfVeiChips();sugerir();corrRender()}
$("pf-tipo").addEventListener("click",e=>{const b=e.target.closest("[data-pt]");if(b)pfTipoSet(b.dataset.pt)});
["pf-vei","pf-aj"].forEach(id=>$(id).addEventListener("click",()=>setTimeout(sugerir,0)));$("pf-and").addEventListener("input",()=>sugerir());
pfVeiChips();
let locs={c:null,e:null};
function usarLoc(qual){if(!navigator.geolocation){toast("Seu celular não liberou a localização");return}
  const b=$(qual==="c"?"pf-cloc":"pf-eloc");b.textContent="Localizando…";
  navigator.geolocation.getCurrentPosition(p=>{locs[qual]={lat:+p.coords.latitude.toFixed(6),lng:+p.coords.longitude.toFixed(6)};window.kmRota=null;b.textContent="Marcado ✓";
    const inp=$(qual==="c"?"pf-cend":"pf-eend");if(!inp.value.trim())inp.value="Minha localização atual";sugerir()},
    ()=>{b.textContent="Minha localização";toast("Não deu pra pegar a localização. Escreva o endereço.")},{enableHighAccuracy:true,timeout:15000});}
$("pf-cloc").onclick=()=>usarLoc("c");$("pf-eloc").onclick=()=>usarLoc("e");
const BASE=8,PERTO_KM=3,POR_KM_LONGE=1.8;
// até 3 km: R$ 8 fixo; cada km rodado acima de 3 km: + R$ 1,80. Arredonda pra cima de 50 em 50 centavos
const justo=k=>{k=Math.max(0,k||0);const v=BASE+POR_KM_LONGE*Math.max(0,k-PERTO_KM);return Math.max(BASE,Math.ceil(v*2)/2)};
function pfJusto(k){if(pfTipo!=="frete")return justo(k);return precoFrete(pfVei(),k,+picked($("pf-aj")),Math.max(0,Math.round(num($("pf-and").value)||0)))}
function sugerir(){
  const auto=window.kmRota!=null?window.kmRota:(locs.c&&locs.e?km(locs.c.lat,locs.c.lng,locs.e.lat,locs.e.lng):null);
  if(auto!=null&&document.activeElement!==$("pf-km"))$("pf-km").value=String(auto).replace(".",",");
  const k=num($("pf-km").value)||null,el=$("pf-sug"),v=num($("pf-valor").value);
  if(k==null){el.className="preco";el.textContent="Coloque a distância, ou use a localização nos dois endereços, que o app calcula o valor justo.";return null}
  const fr=pfTipo==="frete",aj=fr?+picked($("pf-aj")):0,an=fr?Math.max(0,Math.round(num($("pf-and").value)||0)):0,j=pfJusto(k);
  if(!v){$("pf-valor").placeholder=String(j.toFixed(2)).replace(".",",");el.className="preco ok";el.innerHTML=`Valor justo pra ${String(k).replace(".",",")} km${fr?` de ${veiNome(pfVei()).toLowerCase()}${aj?` + ${aj} ajudante${aj>1?"s":""}`:""}${an?` + ${an} andar${an>1?"es":""}`:""}`:""}: <b>${brl(j)}</b>`}
  else if(v<j){el.className="preco baixo";el.innerHTML=`Abaixo do valor justo (<b>${brl(j)}</b>). Pedido abaixo do justo demora mais pra ser aceito.`}
  else{el.className="preco ok";el.innerHTML=`Valor justo pra ${String(k).replace(".",",")} km: ${brl(j)}. Você está pagando ${v>j?"acima do justo. Obrigado!":"o valor justo."}`}
  return k}
$("pf-km").addEventListener("input",sugerir);$("pf-valor").addEventListener("input",sugerir);
$("fPedir").onsubmit=e=>{e.preventDefault();
  const k0=sugerir();let valor=num($("pf-valor").value);if(!valor&&k0!=null)valor=pfJusto(k0);
  const cend=$("pf-cend").value.trim(),eend=$("pf-eend").value.trim(),cb=$("pf-cb").value.trim(),eb=$("pf-eb").value.trim(),item=window.pfItem?pfItem():$("pf-item").value.trim();
  if(!cend||!eend){toast("Coloque os endereços de coleta e entrega");return}if(!cb||!eb){toast("Coloque os bairros");return}if(item.length<2){toast("Diga o que vai ser levado");return}if(!(valor>0)){toast("Coloque quanto você paga");return}if(valor<BASE){toast("O mínimo é R$ 8,00");return}
  const fr=pfTipo==="frete",quando=fr&&$("pf-quando").value?new Date($("pf-quando").value):null;if(quando&&quando<Date.now()-6e5){toast("Essa data já passou");return}
  const k=sugerir();
  safe(async()=>{const{data,error}=await sb.from("corridas").insert({coleta_bairro:cb,entrega_bairro:eb,item,valor,veiculo:pfVei(),distancia_km:k,...(fr?{tipo:"frete",ajudantes:+picked($("pf-aj")),andares:Math.max(0,Math.round(num($("pf-and").value)||0)),agendado_para:quando?quando.toISOString():null}:{})}).select().single();if(error)throw error;
    const det={corrida_id:data.id,coleta_end:cend,entrega_end:eend,coleta_lat:locs.c?.lat??null,coleta_lng:locs.c?.lng??null,entrega_lat:locs.e?.lat??null,entrega_lng:locs.e?.lng??null,contato:$("pf-tel").value.trim()||null,obs:$("pf-obs").value.trim()||null};
    const r=await sb.from("corridas_det").insert(det);if(r.error){await sb.rpc("mudar_corrida",{cid:data.id,acao:"cancelar"});throw r.error}
    ["pf-item","pf-valor","pf-obs","pf-eend","pf-eb","pf-km","pf-and","pf-quando"].forEach(i=>$(i).value="");locs={c:null,e:null};window.kmRota=null;["pf-ccep","pf-ecep"].forEach(i=>$(i).value="");$("pf-cloc").textContent=$("pf-eloc").textContent="Minha localização";if(window.pfCatReset)pfCatReset();
    corrAberta=data.id;if(window.pfEtapa)pfEtapa(1);await corrLoad();go("pedidos")},pfTipo==="frete"?"Frete pedido! Avisamos quando um freteiro aceitar.":"Pedido enviado! Avisamos quando alguém aceitar.")};
function preencherPedido(){if(!$("pf-cend").value&&perfil.end_padrao)$("pf-cend").value=perfil.end_padrao;if(!$("pf-tel").value&&perfil.telefone)$("pf-tel").value=foneFmt(perfil.telefone);sugerir()}

// perfil do cliente
// telefone sempre no formato (62) 99999-9999
const foneFmt=v=>{let d=String(v||"").replace(/\D/g,"");if(d.length>11&&d.startsWith("55"))d=d.slice(2);d=d.slice(0,11);if(d.length<3)return d;
  return d.length>10?`(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`:d.length>6?`(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`:`(${d.slice(0,2)}) ${d.slice(2)}`};
["pc-tel","pf-tel"].forEach(id=>$(id)?.addEventListener("input",e=>{e.target.value=foneFmt(e.target.value)}));
function perfilRender(){if(document.activeElement?.closest?.("#fPerfilC"))return;$("pc-nome").value=perfil.nome||"";$("pc-tel").value=foneFmt(perfil.telefone);$("pc-end").value=perfil.end_padrao||""}
$("fPerfilC").onsubmit=e=>{e.preventDefault();const nome=$("pc-nome").value.trim().replace(/\s+/g," "),tel=$("pc-tel").value.replace(/\D/g,"");
  if(nome.length<2){toast("Coloque o nome da loja ou o seu nome");$("pc-nome").focus();return}
  if(tel&&tel.length<10){toast("Telefone incompleto: coloque o DDD e o número");$("pc-tel").focus();return}
  safe(()=>savePerfil({nome,telefone:tel?foneFmt(tel):null,end_padrao:$("pc-end").value.trim()||null}),"Perfil salvo")};
if($("pc-virar"))$("pc-virar").onclick=()=>{const b=$("pc-virar");if(b.dataset.ok!=="1"){b.dataset.ok="1";b.textContent="Toque de novo pra confirmar";return}
  safe(async()=>{await savePerfil({tipo:"entregador"});aplicaPapel(true)},"Pronto! Agora você também é entregador.")};


// papel: entregador ou cliente
let papelAplicado=null;
function aplicaPapel(forcar){const cli=perfil.tipo==="cliente";document.body.classList.toggle("cli",cli);
  $("ola").textContent=perfil.nome?"Oi, "+perfil.nome.split(" ")[0]:(cli?"Envios e entregas":"Envios e entregas");
  if(forcar||papelAplicado!==perfil.tipo){papelAplicado=perfil.tipo;go(cli?"pedir":"resumo")}
  preencherPedido();perfilRender()}

const _agL4=window.agendaLoad;window.agendaLoad=async()=>{await _agL4();aplicaPapel();corrLoad();minhaNota()};
setInterval(()=>{if(uid&&document.querySelector("#v-corridas:not([hidden]),#v-pedidos:not([hidden])"))corrRender()},60000);
corrRender();if(uid){aplicaPapel();corrLoad();minhaNota()}

// sua reputação como entregador
async function minhaNota(){if(!sb||!uid||perfil.tipo!=="entregador")return;const r=await sb.rpc("media_entregador",{uid});if(r.error||!r.data)return;const d=r.data;
  $("co-nota").innerHTML=d.entregas?`<b>${d.avaliacoes?"★ "+String(d.media).replace(".",","):"Sem avaliações"}</b><span>${d.avaliacoes?d.avaliacoes+" avaliações · ":""}${d.entregas} entrega${d.entregas>1?"s":""} pelo Cadernex</span>`:`<b>Ainda sem entregas pelo Cadernex</b><span>Sua nota aparece pros clientes a cada corrida avaliada.</span>`}

document.querySelectorAll(".bloq form").forEach(f=>f.onsubmit=e=>{e.preventDefault();const t=f.querySelector("textarea").value.trim();if(t.length<10){toast("Escreva um pouco mais na sua defesa");return}
  safe(()=>savePerfil({defesa:t}),"Defesa enviada para análise")});

// moderador: contas bloqueadas para análise
async function admLoad(){if(!perfil.admin){$("adm-card").hidden=true;return}$("adm-card").hidden=false;
  const r=await sb.rpc("contas_bloqueadas");if(r.error){$("adm-lista").innerHTML=`<p class="hint">Rode o corridas.sql no Supabase.</p>`;return}
  $("adm-lista").innerHTML=r.data.length?r.data.map(p=>`<div class="adm-it"><div class="t"></div><div class="s"></div><div class="s mot"></div><div class="def"></div><button class="btn ghost" data-desb="${p.user_id}">Desbloquear e zerar relatos</button></div>`).join(""):`<p class="empty">Nenhuma conta bloqueada.</p>`;
  const its=$("adm-lista").querySelectorAll(".adm-it");r.data.forEach((p,i)=>{its[i].querySelector(".t").textContent=(p.nome||"(sem nome)")+" · "+(p.tipo==="cliente"?"Cliente":"Entregador");its[i].querySelector(".s").textContent=p.email;
    its[i].querySelector(".mot").textContent="Relatos: "+(p.motivos||[]).map(m=>{const[k,...d]=m.split(": ");return(MOT[k]||k)+(d.length?" ("+d.join(": ")+")":"")}).join(" · ");its[i].querySelector(".def").textContent=p.defesa?"Defesa: "+p.defesa:"Ainda sem defesa."})}
$("adm-lista").addEventListener("click",e=>{const b=e.target.closest("[data-desb]");if(!b)return;if(b.dataset.ok!=="1"){b.dataset.ok="1";b.textContent="Toque de novo pra confirmar";return}
  safe(async()=>{const{error}=await sb.rpc("desbloquear_conta",{uid:b.dataset.desb});if(error)throw error;await admLoad()},"Conta desbloqueada")});
const _agL5=window.agendaLoad;window.agendaLoad=async()=>{await _agL5();admLoad()};
if(uid)admLoad();
