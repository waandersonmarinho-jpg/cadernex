/* Cadernex — dados no celular (IndexedDB)
   1) Guarda os últimos dados carregados (ganhos, turnos, despesas, corridas em andamento)
      para o app abrir na hora e funcionar com sinal ruim.
   2) Fila de anotações: turno e despesa feitos sem internet ficam no celular e sobem sozinhos.
   Não guarda CPF, documentos nem dados de pagamento. Ao sair da conta, apaga tudo. */
(function(){
const NOME="cadernex",VER=1;let dbP=null;
function abrir(){
  if(dbP)return dbP;
  dbP=new Promise((ok,erro)=>{
    if(!("indexedDB" in window)){erro(new Error("sem IndexedDB"));return}
    const r=indexedDB.open(NOME,VER);
    r.onupgradeneeded=()=>{const d=r.result;
      if(!d.objectStoreNames.contains("kv"))d.createObjectStore("kv");
      if(!d.objectStoreNames.contains("fila"))d.createObjectStore("fila",{keyPath:"n",autoIncrement:true})};
    r.onsuccess=()=>ok(r.result);r.onerror=()=>erro(r.error);r.onblocked=()=>erro(new Error("bloqueado"));
  }).catch(e=>{dbP=null;throw e});
  return dbP;
}
function tx(loja,modo,fn){return abrir().then(d=>new Promise((ok,erro)=>{const t=d.transaction(loja,modo),s=t.objectStore(loja);let res;
  const q=fn(s);if(q)q.onsuccess=()=>{res=q.result};t.oncomplete=()=>ok(res);t.onerror=()=>erro(t.error);t.onabort=()=>erro(t.error)}))}
const seguro=p=>p.catch(()=>undefined); // se o celular não deixar (aba anônima, sem espaço), o app segue normal

const get=k=>seguro(tx("kv","readonly",s=>s.get(k)));
const set=(k,v)=>seguro(tx("kv","readwrite",s=>s.put(v,k)));
const limpar=()=>seguro(Promise.all([tx("kv","readwrite",s=>s.clear()),tx("fila","readwrite",s=>s.clear())]));
const filaTodos=()=>seguro(tx("fila","readonly",s=>s.getAll())).then(x=>x||[]);
const filaAdd=item=>seguro(tx("fila","readwrite",s=>s.add({...item,u:uid,em:Date.now()})));
const filaDel=n=>seguro(tx("fila","readwrite",s=>s.delete(n)));

// erro de rede (sem sinal) x erro de verdade (dado recusado pelo banco)
const semRede=e=>!navigator.onLine||!e||/fetch|network|Failed|Load failed|timeout|NetworkError/i.test(String(e.message||e))&&!e.code;
const novoId=()=>crypto.randomUUID?crypto.randomUUID():"10000000-1000-4000-8000-100000000000".replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16));

let enviando=null;
async function enviarFila(){
  if(enviando)return enviando;
  enviando=(async()=>{
    if(!sb||!uid||!navigator.onLine)return 0;
    let ok=0;
    for(const it of await filaTodos()){
      if(it.u!==uid)continue;
      let r;
      if(it.tab==="turnos"||it.tab==="despesas")r=await sb.from(it.tab).upsert(it.row,{onConflict:"id",ignoreDuplicates:true});
      else if(it.tab==="perfil")r=await sb.from("perfis").update(it.row).eq("user_id",uid);
      else{await filaDel(it.n);continue}
      if(r.error){if(semRede(r.error))break;console.error("Anotação offline recusada pelo banco: "+(r.error.message||r.error));await filaDel(it.n);continue}
      await filaDel(it.n);ok++;
    }
    if(ok)toast(ok===1?"Anotação feita sem internet foi salva na nuvem ✓":`${ok} anotações feitas sem internet foram salvas na nuvem ✓`);
    return ok;
  })().finally(()=>{enviando=null});
  return enviando;
}
// põe nas listas da tela o que ainda está só no celular
async function juntarFila(){
  for(const it of await filaTodos()){
    if(it.u!==uid)continue;
    if(it.tab==="turnos"&&!turnos.some(t=>t.id===it.row.id))turnos.unshift({...it.row,ganho:N(it.row.ganho),gorjeta:N(it.row.gorjeta),km:N(it.row.km),_off:1});
    if(it.tab==="despesas"&&!gastos.some(g=>g.id===it.row.id))gastos.unshift({...it.row,valor:N(it.row.valor),_off:1});
    if(it.tab==="perfil")perfil={...perfil,...it.row};
  }
}
async function pendentes(){return (await filaTodos()).filter(i=>i.u===uid).length}

window.cxOff={get,set,limpar,semRede,novoId,fila:{add:filaAdd,todos:filaTodos},enviarFila,juntarFila,pendentes};

// internet voltou: sobe a fila e atualiza
addEventListener("online",()=>{if(uid)enviarFila().then(n=>{if(n&&typeof loadAll==="function")loadAll()})});
// ao sair da conta, apaga tudo do celular
document.addEventListener("click",e=>{if(e.target.closest("#sair"))limpar()},true);
})();
