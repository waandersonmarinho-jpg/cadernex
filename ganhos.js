/* Cadernex — Meus ganhos (entregador): quanto recebeu pelo Cadernex e o Pix de saque (CPF do próprio entregador).
   O saque do saldo para qualquer banco liga quando a conta de pagamentos da empresa estiver pronta. */
(function(){
const DIA=864e5;
let pix=null; // {cpf, saque_pix}
const mascara=c=>c&&c.length===11?`***.${c.slice(3,6)}.${c.slice(6,9)}-**`:"";
const n=x=>Number(x)||0;

async function carregar(){
  const w=$("gn-card");if(!w)return;
  if(!sb||!uid||perfil.tipo!=="entregador"){w.hidden=true;return}
  const desde=new Date(Date.now()-30*DIA).toISOString();
  const [c,p,d]=await Promise.all([
    sb.from("corridas").select("id,valor,entregue_em").eq("entregador_id",uid).eq("status","entregue").gte("entregue_em",desde),
    sb.from("pagamentos").select("corrida_id,status").eq("entregador_id",uid).eq("status","pago"),
    sb.from("dados_pessoais").select("cpf,saque_pix").eq("user_id",uid).maybeSingle()
  ]);
  if(c.error){w.hidden=true;return}
  w.hidden=false;
  const pagas=new Set((p.error?[]:p.data||[]).map(x=>x.corrida_id));
  const lista=c.data||[],agora=Date.now(),hoje=new Date();hoje.setHours(0,0,0,0);
  const soma=f=>{const l=lista.filter(f);return{v:l.reduce((s,x)=>s+n(x.valor),0),q:l.length}};
  const t=[["Hoje",soma(x=>new Date(x.entregue_em)>=hoje)],["7 dias",soma(x=>agora-new Date(x.entregue_em)<7*DIA)],["30 dias",soma(()=>true)]];
  $("gn-tot").innerHTML=t.map(([r,s])=>`<div><small>${r}</small><b class="num">${brl(s.v)}</b><span>${s.q} corrida${s.q===1?"":"s"}</span></div>`).join("");
  const app=soma(x=>pagas.has(x.id)),din=soma(x=>!pagas.has(x.id));
  $("gn-mix").innerHTML=lista.length?`Nos últimos 30 dias: <b>${brl(app.v)}</b> pelo app (Pix) · <b>${brl(din.v)}</b> em dinheiro`:`Quando você entregar corridas, seus ganhos aparecem aqui.`;
  pix=d.error?null:d.data;pixRender(!!d.error);
}
function pixRender(semColuna){
  const el=$("gn-pix");if(!el)return;
  if(semColuna){el.innerHTML="";return} // falta rodar o SQL do Pix de saque
  if(!pix||!pix.cpf){el.innerHTML=`<b>Pix para saque</b><p class="hint" style="margin:0">Complete seu cadastro com CPF para cadastrar o Pix de saque.</p>`;return}
  el.innerHTML=pix.saque_pix
    ?`<b>Pix para saque</b><p style="margin:0"><span class="ok">✓ Chave Pix: seu CPF ${mascara(pix.cpf)}</span></p>
      <p class="hint" style="margin:0">Em breve você junta seu saldo e saca quando quiser, para qualquer banco. Confira se o seu CPF está cadastrado como chave Pix no seu banco.</p>
      <button class="link" type="button" id="gn-pix-off" style="align-self:flex-start">Não usar mais</button>`
    :`<b>Pix para saque <span class="pill">em breve</span></b>
      <p class="hint" style="margin:0">Logo você vai poder juntar o saldo das corridas e sacar no Pix, para qualquer banco (Nubank, Caixa, Inter…). Por segurança, o saque vai só para a chave Pix do <b>seu próprio CPF</b>.</p>
      <button class="btn ghost full" type="button" id="gn-pix-on">Usar meu CPF ${mascara(pix.cpf)} como chave Pix</button>`;
}
document.addEventListener("click",e=>{
  const on=e.target.closest("#gn-pix-on"),off=e.target.closest("#gn-pix-off");if(!on&&!off)return;
  const v=!!on;
  safe(async()=>{const{error}=await sb.from("dados_pessoais").update({saque_pix:v}).eq("user_id",uid);if(error)throw error;pix.saque_pix=v;pixRender()},v?"Pix de saque cadastrado ✓":"Pix de saque removido");
});
window.ganhosLoad=carregar;
if(typeof go==="function"){const g=go;go=function(v){g(v);if(v==="corridas")carregar()}}
const _al=window.agendaLoad;window.agendaLoad=async()=>{await _al();carregar()};
if(uid)setTimeout(carregar,0);
})();
