/* Cadernex — Informações da loja (Perfil de quem envia): nome, ramo, bairro, WhatsApp, horário e o CNPJ do cadastro */
(function(){
const el=id=>document.getElementById(id);
const dig=v=>String(v||"").replace(/\D/g,"");
const fone=v=>typeof foneFmt==="function"?foneFmt(v):dig(v);
const cnpjFmt=c=>c&&c.length===14?`${c.slice(0,2)}.${c.slice(2,5)}.${c.slice(5,8)}/${c.slice(8,12)}-${c.slice(12)}`:c||"";
let aberto=false;try{aberto=localStorage.getItem("cx-lj-aberto")==="1"}catch(e){}
function abre(){el("lj-abre").setAttribute("aria-expanded",aberto);el("lj-corpo").hidden=!aberto}
function resumo(){
  const n=(perfil.loja_nome||"").trim();
  el("lj-res").textContent=n?[n,perfil.loja_ramo,perfil.loja_bairro].filter(Boolean).join(" · "):"Para lojas, farmácias e restaurantes";
}
function preencher(){
  if(document.activeElement?.closest?.("#lj-corpo"))return;
  el("lj-nome").value=perfil.loja_nome||"";el("lj-ramo").value=perfil.loja_ramo||"";el("lj-bairro").value=perfil.loja_bairro||"";
  el("lj-whats").value=fone(perfil.loja_whats);el("lj-hora").value=perfil.loja_horario||"";resumo();abre();
}
async function documento(){
  const d=el("lj-doc");if(!sb||!uid){d.hidden=true;return}
  const r=await sb.from("dados_pessoais").select("cnpj,empresa_nome,nome_completo").eq("user_id",uid).maybeSingle();
  if(r.error||!r.data){d.hidden=false;d.innerHTML=`<span>CNPJ: ainda não cadastrado.</span><small class="hint" style="margin:0">Ele é pedido no primeiro envio, em “Empresa (CNPJ)”.</small>`;if(r.error)d.hidden=true;return}
  const x=r.data;d.hidden=false;
  d.innerHTML=x.cnpj?`<span class="ok">✓ CNPJ ${esc(cnpjFmt(x.cnpj))}</span><span>${esc(x.empresa_nome||"")}</span><small class="hint" style="margin:0">Responsável: ${esc(x.nome_completo||"")}. O CNPJ não muda pelo app.</small>`
    :`<span>Cadastro feito com CPF (pessoa).</span><small class="hint" style="margin:0">Para trocar para CNPJ, escreva para suporte@cadernex.com.br.</small>`;
}
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
el("lj-whats").addEventListener("input",e=>{e.target.value=fone(e.target.value)});
el("lj-abre").addEventListener("click",()=>{aberto=!aberto;try{localStorage.setItem("cx-lj-aberto",aberto?"1":"0")}catch(x){}abre();if(aberto)documento()});
el("lj-corpo").addEventListener("submit",e=>{e.preventDefault();
  const nome=el("lj-nome").value.trim().replace(/\s+/g," "),w=dig(el("lj-whats").value);
  if(nome&&nome.length<2){toast("Nome da loja muito curto");return}
  if(w&&w.length<10){toast("WhatsApp incompleto: coloque o DDD e o número");el("lj-whats").focus();return}
  const patch={loja:!!nome,loja_nome:nome||null,loja_ramo:el("lj-ramo").value||null,loja_bairro:el("lj-bairro").value.trim()||null,
    loja_whats:w||null,loja_horario:el("lj-hora").value.trim()||null};
  safe(async()=>{await savePerfil(patch);resumo()},nome?"Informações da loja salvas":"Pronto: você envia como pessoa");
});
if(typeof go==="function"){const g=go;go=function(v){g(v);if(v==="perfilc"){preencher();if(aberto)documento()}}}
const _al=window.agendaLoad;window.agendaLoad=async()=>{await _al();if(el("lj-card"))preencher()};
if(uid)setTimeout(preencher,0);
})();
