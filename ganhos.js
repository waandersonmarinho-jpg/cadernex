/* Cadernex — Meus ganhos (entregador): quanto recebeu pelo Cadernex e o Pix de saque (CPF do próprio entregador).
   O saque do saldo para qualquer banco liga quando a conta de pagamentos da empresa estiver pronta. */
(function(){
const DIA=864e5,SAQUE_MIN=50; // saque mínimo combinado: R$ 50
let pix=null; // {cpf, saque_pix}
let vals=null,oculto=false;try{oculto=localStorage.getItem("cx-gn-oculto")==="1"}catch(e){}
const esconde=v=>oculto?"R$ ••••":brl(v);
function pinta(){
  if(!vals)return;const{h,sem,mes}=vals;
  $("gn-v").textContent=esconde(h.v);$("gn-q").textContent=`${h.q} corrida${h.q===1?"":"s"}`;
  $("gn-mix").innerHTML=`<span${sem.v?"":' class="neutro"'}>${sem.v?"▲ ":""}7 dias ${esconde(sem.v)}</span><span${mes.v?"":' class="neutro"'}>${mes.v?"▲ ":""}30 dias ${esconde(mes.v)}</span>`;
  $("gn-olho").setAttribute("aria-pressed",oculto);
}
document.addEventListener("click",e=>{if(!e.target.closest("#gn-olho"))return;oculto=!oculto;try{localStorage.setItem("cx-gn-oculto",oculto?"1":"0")}catch(x){}pinta()});
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
  const h=soma(x=>new Date(x.entregue_em)>=hoje),sem=soma(x=>agora-new Date(x.entregue_em)<7*DIA),mes=soma(()=>true);
  vals={h,sem,mes};pinta();
  pix=d.error?null:d.data;pixRender(!!d.error);
}
function pixRender(semColuna){
  const el=$("gn-pix");if(!el)return;
  if(semColuna||!pix||!pix.cpf){el.hidden=true;return} // sem o SQL ou sem CPF: não mostra
  el.hidden=false;
  el.innerHTML=pix.saque_pix
    ?`<span><span class="ok">✓ Pix de saque: CPF ${mascara(pix.cpf)}</span><br><small style="color:var(--muted)">Saque a partir de ${brl(SAQUE_MIN)} · em breve</small></span><button class="link" type="button" id="gn-pix-off">Trocar</button>`
    :`<span>Pix de saque · <small style="color:var(--muted)">a partir de ${brl(SAQUE_MIN)}, em breve</small></span><button class="btn ghost" type="button" id="gn-pix-on" style="padding:8px 12px;font-size:14px">Usar meu CPF</button>`;
}
document.addEventListener("click",e=>{
  const on=e.target.closest("#gn-pix-on"),off=e.target.closest("#gn-pix-off");if(!on&&!off)return;
  const v=!!on;
  safe(async()=>{const{error}=await sb.from("dados_pessoais").update({saque_pix:v}).eq("user_id",uid);if(error)throw error;pix.saque_pix=v;pixRender()},v?"Pronto! O saque vai para o Pix do seu CPF ✓":"Pix de saque removido");
});
window.ganhosLoad=carregar;
if(typeof go==="function"){const g=go;go=function(v){g(v);if(v==="resumo"||v==="corridas")carregar()}}
const _al=window.agendaLoad;window.agendaLoad=async()=>{await _al();carregar()};
if(uid)setTimeout(carregar,0);
})();
