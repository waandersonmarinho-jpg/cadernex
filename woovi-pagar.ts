// Cadernex — woovi-pagar: cria o Pix da corrida na Woovi já com a divisão
// Quem pede paga corrida + 14% de serviço + R$ 1,99 de taxa do app. A parte do entregador (corrida − 8% de comissão; 6% até 30/11) vai
// direto pra subconta dele (chave = CPF) e o webhook manda pro Pix dele quando o pagamento cai.
// Segredo necessário (Supabase → Edge Functions → Secrets): WOOVI_APP_ID
// Publicar com "Verify JWT" LIGADO (padrão).
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const API = "https://api.woovi.com/api/v1";
const TAXA_APP = 0.14;   // serviço, pago por quem pede (cliente ou loja)
const TAXA_LOJA = 0.14;
const TAXA_FIXA = 1.99;  // taxa do app por corrida (cobre o Pix)
const COMISSAO = 0.06; // até 30/11/2026
const COMISSAO_NOVA = 0.08; // 8% a partir de 01/12/2026
const COMISSAO_NOVA_INICIO = Date.parse("2026-12-01T03:00:00Z"); // 01/12/2026 00h em Brasília
const COMISSAO_INICIO = Date.parse("2026-10-21T03:00:00Z");
const VALIDADE = 30 * 60; // o Pix vale 30 minutos
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const r2 = (n: number) => Math.round(n * 100) / 100;

let recursoOff = false; // a Woovi respondeu "feature not enabled" (subconta/split não liberado na conta)
async function woovi(path: string, init: RequestInit = {}) {
  const r = await fetch(API + path, {
    ...init,
    headers: { Authorization: Deno.env.get("WOOVI_APP_ID")!, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  let b: any = null;
  try { b = await r.json(); } catch (_) { /* sem corpo */ }
  return { ok: r.ok, status: r.status, b };
}

// garante a subconta do entregador (chave Pix = CPF)
async function subconta(admin: SupabaseClient, uid: string, cpf: string, nome: string) {
  const { data: s } = await admin.from("woovi_subcontas").select("pix_key").eq("user_id", uid).maybeSingle();
  if (s?.pix_key === cpf) return true;
  const c = await woovi("/subaccount", { method: "POST", body: JSON.stringify({ pixKey: cpf, name: nome.slice(0, 60) }) });
  if (!c.ok) {
    const g = await woovi(`/subaccount/${encodeURIComponent(cpf)}`);
    if (!g.ok) { console.error("woovi-subconta", c.status, JSON.stringify(c.b)); if (c.status === 403) recursoOff = true; return false; }
  }
  await admin.from("woovi_subcontas").upsert({ user_id: uid, pix_key: cpf });
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  recursoOff = false;
  try {
    if (!Deno.env.get("WOOVI_APP_ID")) return json({ erro: "O pagamento pelo app ainda não foi ligado no servidor." }, 503);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: { user } } = await admin.auth.getUser(jwt);
    if (!user) return json({ erro: "Entre na sua conta de novo." }, 401);

    const { corrida_id } = await req.json();
    const { data: c } = await admin.from("corridas").select("*").eq("id", corrida_id).maybeSingle();
    if (!c || c.cliente_id !== user.id) return json({ erro: "Só quem pediu pode pagar essa corrida." }, 403);
    if (!["aceita", "coletada", "entregue"].includes(c.status)) {
      return json({ erro: "O pagamento libera depois que alguém aceitar." }, 400);
    }
    const { data: pg } = await admin.from("pagamentos").select("*").eq("corrida_id", c.id).maybeSingle();
    if (pg?.status === "pago") return json({ erro: "Essa corrida já está paga." }, 400);
    // já existe um Pix válido desta corrida: devolve o mesmo (não cria cobrança repetida)
    if (pg && pg.provedor === "woovi" && pg.status === "pendente" && pg.entregador_id === c.entregador_id &&
        pg.brcode && pg.expira_em && new Date(pg.expira_em).getTime() - Date.now() > 120000) {
      return json({ url: pg.link, brcode: pg.brcode, qrcode: pg.qrcode, total: Number(pg.total), expira_em: pg.expira_em });
    }

    const { data: d } = await admin.from("dados_pessoais").select("cpf,pix_ativo,saque_pix,nome_completo")
      .eq("user_id", c.entregador_id).maybeSingle();
    const cpf = String(d?.cpf || "").replace(/\D/g, "");
    if (!(d?.pix_ativo || d?.saque_pix) || cpf.length !== 11) {
      return json({ erro: "O Pix desse entregador ainda não está pronto. Fale com ele pela conversa da corrida." }, 400);
    }
    if (!(await subconta(admin, c.entregador_id, cpf, d.nome_completo || "Entregador Cadernex"))) {
      return json({ erro: recursoOff ? "O pagamento pelo app está em liberação. Tente de novo mais tarde." : "Não deu pra preparar o Pix do entregador agora. Tente de novo em instantes." }, 502);
    }

    const taxaPix = Number(Deno.env.get("WOOVI_TAXA") || "0.008");
    const valor = Number(c.valor);
    const { data: enc } = await admin.from("encomendas").select("id").eq("corrida_id", c.id).maybeSingle();
    // serviço de 14% pra quem pede (cliente ou loja)
    const { data: pc } = await admin.from("perfis").select("loja,loja_nome").eq("user_id", c.cliente_id).maybeSingle();
    const taxaCli = pc?.loja && String(pc?.loja_nome || "").trim() ? TAXA_LOJA : TAXA_APP;
    const taxaApp = enc ? 0 : r2(valor * taxaCli + TAXA_FIXA);
    const total = enc ? Math.ceil((valor / (1 - taxaPix)) * 100) / 100 : r2(valor + taxaApp);
    const comissao = Date.now() >= COMISSAO_INICIO ? r2(valor * (Date.now() >= COMISSAO_NOVA_INICIO ? COMISSAO_NOVA : COMISSAO)) : 0;
    const repasse = r2(valor - comissao);
    const corr = `cx-${c.id}-${Date.now().toString(36)}`;

    const w = await woovi("/charge", {
      method: "POST",
      body: JSON.stringify({
        correlationID: corr,
        value: Math.round(total * 100),
        comment: `${c.tipo === "frete" ? "Frete" : "Entrega"} Cadernex ${c.coleta_bairro || ""} > ${c.entrega_bairro || ""}`.slice(0, 140),
        expiresIn: VALIDADE,
        splits: [{ pixKey: cpf, value: Math.round(repasse * 100), splitType: "SPLIT_SUB_ACCOUNT" }],
      }),
    });
    const ch = w.b?.charge || w.b;
    if (!w.ok || !ch?.brCode) {
      console.error("woovi-pagar", w.status, JSON.stringify(w.b));
      return json({ erro: "A Woovi não criou o Pix agora. Tente de novo." }, 400);
    }
    const expira = new Date(Date.now() + VALIDADE * 1000).toISOString();
    const { error } = await admin.from("pagamentos").upsert({
      corrida_id: c.id, cliente_id: c.cliente_id, entregador_id: c.entregador_id,
      valor, taxa_app: taxaApp, comissao, total, status: "pendente", provedor: "woovi",
      correlation_id: corr, preference_id: ch.globalID || ch.identifier || null, payment_id: null,
      link: ch.paymentLinkUrl || null, brcode: ch.brCode, qrcode: ch.qrCodeImage || null, expira_em: expira,
      repasse, repasse_status: null, repasse_em: null,
    });
    if (error) throw error;
    return json({ url: ch.paymentLinkUrl, brcode: ch.brCode, qrcode: ch.qrCodeImage, total, expira_em: expira });
  } catch (e) {
    console.error("woovi-pagar", String((e as Error)?.message || e));
    return json({ erro: "Não deu pra criar o pagamento agora." }, 500);
  }
});
