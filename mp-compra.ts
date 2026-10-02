// Cadernex — mp-compra: pagamento (Pix) das compras nas lojas, com a divisão automática.
// O valor dos produtos + entrega vai pra conta Mercado Pago da loja; 6% vão pro Cadernex (marketplace_fee).
// O cliente paga também a taxa do Pix, pra loja receber o valor inteiro.
// Publicar com "Verify JWT" DESLIGADO: o Mercado Pago avisa aqui sem login.
// Quem chama:
//  - o cliente, logado: { acao: "pagar", id }  → cria o Pix
//  - a loja, logada:    { acao: "devolver", id } → devolve o Pix ao cliente
//  - o Mercado Pago:    ?e=<id da compra>        → confere o pagamento direto no Mercado Pago
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const TAXA_APP = 0.06;
const SITE = "https://cadernex.com.br";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const r2 = (v: number) => Math.round(v * 100) / 100;

async function tokenDo(admin: SupabaseClient, uid: string): Promise<string | null> {
  const { data: c } = await admin.from("mp_contas").select("*").eq("user_id", uid).maybeSingle();
  if (!c) return null;
  if (c.expira_em && new Date(c.expira_em).getTime() - Date.now() > 86400000) return c.access_token;
  if (!c.refresh_token) return c.access_token;
  const r = await fetch("https://api.mercadopago.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: Deno.env.get("MP_CLIENT_ID"),
      client_secret: Deno.env.get("MP_CLIENT_SECRET"),
      grant_type: "refresh_token",
      refresh_token: c.refresh_token,
    }),
  });
  const t = await r.json();
  if (!r.ok || !t.access_token) return c.access_token;
  await admin.from("mp_contas").update({
    access_token: t.access_token,
    refresh_token: t.refresh_token ?? c.refresh_token,
    expira_em: new Date(Date.now() + (Number(t.expires_in) || 15552000) * 1000).toISOString(),
    atualizado_em: new Date().toISOString(),
  }).eq("user_id", uid);
  return t.access_token;
}

async function devolver(tk: string, pid: string, chave: string) {
  const r = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(pid)}/refunds`, {
    method: "POST",
    headers: { Authorization: `Bearer ${tk}`, "Content-Type": "application/json", "X-Idempotency-Key": chave },
    body: "{}",
  });
  return r.ok;
}

// o Mercado Pago avisou: confere direto lá e atualiza a compra
async function aviso(admin: SupabaseClient, url: URL, req: Request) {
  const eid = url.searchParams.get("e");
  let body: Record<string, any> = {};
  try { body = await req.json(); } catch { /* sem corpo */ }
  const tipo = body.type || body.topic || url.searchParams.get("type") || url.searchParams.get("topic");
  const pid = String(body?.data?.id || url.searchParams.get("data.id") || url.searchParams.get("id") || "");
  if (!eid || !pid || (tipo && tipo !== "payment")) return;
  const { data: e } = await admin.from("encomendas").select("*").eq("id", eid).maybeSingle();
  if (!e) return;
  const tk = await tokenDo(admin, e.loja_id);
  if (!tk) return;
  const r = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(pid)}`, { headers: { Authorization: `Bearer ${tk}` } });
  if (!r.ok) return;
  const pay = await r.json();
  if (String(pay.external_reference) !== "enc-" + eid || pay.status !== "approved") return;
  if (e.status === "aceita") {
    await admin.from("encomendas").update({ status: "paga", payment_id: String(pay.id), pago_em: new Date().toISOString() })
      .eq("id", eid).eq("status", "aceita");
  } else if (["cancelada", "recusada"].includes(e.status) && !e.payment_id) {
    // pagou depois de cancelar: devolve sozinho
    if (await devolver(tk, String(pay.id), "auto-" + eid)) {
      await admin.from("encomendas").update({ status: "devolvida", payment_id: String(pay.id) }).eq("id", eid);
    }
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);
  const base = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(base, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  if (url.searchParams.get("e")) {
    try { await aviso(admin, url, req); } catch { /* responde 200 pra não repetir */ }
    return new Response("ok", { status: 200 });
  }
  try {
    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: { user } } = await admin.auth.getUser(jwt);
    if (!user) return json({ erro: "Entre na sua conta de novo." }, 401);
    const { acao, id } = await req.json();
    const { data: e } = await admin.from("encomendas").select("*").eq("id", id).maybeSingle();
    if (!e) return json({ erro: "Pedido não encontrado." }, 404);
    const tk = await tokenDo(admin, e.loja_id);
    if (!tk) return json({ erro: "Essa loja desconectou o Mercado Pago. Fale com a loja." }, 400);

    if (acao === "devolver") {
      if (e.loja_id !== user.id) return json({ erro: "Só a loja pode devolver." }, 403);
      if (e.status !== "paga" || !e.payment_id) return json({ erro: "Esse pedido não pode ser devolvido agora." }, 400);
      if (!(await devolver(tk, e.payment_id, "dev-" + e.id))) return json({ erro: "O Mercado Pago não fez a devolução. Tente de novo." }, 400);
      await admin.from("encomendas").update({ status: "devolvida" }).eq("id", e.id);
      return json({ ok: true });
    }

    if (acao !== "pagar") return json({ erro: "Ação inválida." }, 400);
    if (e.cliente_id !== user.id) return json({ erro: "Só quem comprou pode pagar." }, 403);
    if (e.status !== "aceita") return json({ erro: e.status === "nova" ? "Espere a loja aceitar." : "Esse pedido não está esperando pagamento." }, 400);

    const mpTaxa = Number(Deno.env.get("MP_TAXA") || "0.0099");
    const valor = r2(Number(e.subtotal) + Number(e.taxa || 0));
    const taxaApp = r2(valor * TAXA_APP);
    const total = Math.ceil(((valor + taxaApp) / (1 - mpTaxa)) * 100) / 100;
    const { data: loja } = await admin.from("perfis").select("loja_nome").eq("user_id", e.loja_id).maybeSingle();

    const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { Authorization: `Bearer ${tk}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ id: e.id, title: `Compra na ${loja?.loja_nome || "loja"} pelo Cadernex`, quantity: 1, unit_price: total, currency_id: "BRL" }],
        marketplace_fee: taxaApp,
        external_reference: "enc-" + e.id,
        notification_url: `${base}/functions/v1/mp-compra?e=${e.id}`,
        back_urls: { success: `${SITE}/#compra`, pending: `${SITE}/#compra`, failure: `${SITE}/#compra` },
        auto_return: "approved",
        statement_descriptor: "CADERNEX",
        date_of_expiration: new Date(Date.now() + 30 * 60000).toISOString(),
        payment_methods: {
          excluded_payment_types: [{ id: "credit_card" }, { id: "debit_card" }, { id: "ticket" }, { id: "prepaid_card" }],
          installments: 1,
        },
      }),
    });
    const p = await r.json();
    if (!r.ok || !p.init_point) return json({ erro: "O Mercado Pago não criou o pagamento. Tente de novo.", detalhe: p.message || p.error }, 400);
    await admin.from("encomendas").update({ total, taxa_app: taxaApp, preference_id: p.id }).eq("id", e.id);
    return json({ url: p.init_point, total });
  } catch (err) {
    return json({ erro: "Não deu certo agora. Tente de novo.", detalhe: String((err as Error)?.message || err) }, 500);
  }
});
