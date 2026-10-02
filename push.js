/* Cadernex — notificação com o app fechado: registra este celular pra receber avisos do servidor */
(function(){
const CFG=window.CORRE_CONFIG||{},FN=(CFG.SUPABASE_URL||"")+"/functions/v1/push";
const suporta=()=>"serviceWorker" in navigator&&"PushManager" in window&&"Notification" in window;
const u8=b=>{const p="=".repeat((4-b.length%4)%4),s=atob((b+p).replace(/-/g,"+").replace(/_/g,"/"));return Uint8Array.from(s,c=>c.charCodeAt(0))};
const ios=/iphone|ipad|ipod/i.test(navigator.userAgent),instalado=()=>matchMedia("(display-mode: standalone)").matches||navigator.standalone===true;
let ativo=false;

function render(){
  const st=$("cf-push-st"),b=$("cf-push-btn");if(!st||!b)return;
  if(!suporta()){st.textContent=ios&&!instalado()?"No iPhone, primeiro instale o app na tela inicial (Mais → Baixar o app). Depois volte aqui.":"Este navegador não aceita notificações. Use o Chrome.";b.hidden=true;return}
  if(Notification.permission==="denied"){st.textContent="As notificações estão bloqueadas. Toque no cadeado ao lado do endereço, em Permissões, e libere Notificações.";b.hidden=true;return}
  b.hidden=ativo;st.innerHTML=ativo?`<b class="pix-on">Ativadas neste celular ✓</b> Você recebe corrida nova e o andamento dos pedidos mesmo com o app fechado.`
    :"Receba corrida nova e o andamento dos seus pedidos mesmo com o app fechado e a tela bloqueada.";
  const co=$("push-co");if(co)co.hidden=ativo;
}

async function ativar(silencioso){
  if(!suporta()||!sb||!uid){render();return false}
  if(Notification.permission==="denied"){render();if(!silencioso)toast("As notificações estão bloqueadas nas configurações do navegador.");return false}
  if(Notification.permission!=="granted"){if(silencioso)return false;const p=await Notification.requestPermission();if(p!=="granted"){render();return false}}
  try{
    const reg=await navigator.serviceWorker.ready;let sub=await reg.pushManager.getSubscription();
    if(!sub){const r=await fetch(FN+"?chave=1");const d=await r.json();if(!d.pub)throw new Error("sem chave");
      sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:u8(d.pub)})}
    const{error}=await sb.rpc("push_registrar",{ep:sub.endpoint});if(error)throw error;
    ativo=true;render();if(!silencioso)toast("Notificações ativadas ✓");return true;
  }catch(e){console.warn("push",e);render();if(!silencioso)toast("Não deu pra ativar as notificações agora. Tente de novo.");return false}
}
window.cxPushAtivar=ativar;

// botões
document.addEventListener("click",e=>{if(e.target.closest("#cf-push-btn,#push-co"))ativar(false)});
// pede junto quando a pessoa quer ser avisada: ficou disponível ou fez um pedido
document.addEventListener("submit",e=>{if(["fDisp","fPedir","fLote"].includes(e.target.id))setTimeout(()=>ativar(false),300)});
// ao sair da conta, este celular para de receber os avisos dessa conta
const sair=$("sair");if(sair){sair.addEventListener("click",async()=>{try{const reg=await navigator.serviceWorker.ready;const s=await reg.pushManager.getSubscription();if(s&&sb&&uid)await sb.rpc("push_sair",{ep:s.endpoint})}catch(e){}},true)}
// ao entrar: se já tinha permitido, liga este celular à conta de agora, sem perguntar nada
const _al=window.agendaLoad;window.agendaLoad=async()=>{await _al();ativar(true)};
if(uid)setTimeout(()=>ativar(true),500);
render();
})();
