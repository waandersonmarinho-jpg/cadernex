// Cadernex — mp-pagar: cria o pagamento (Pix) da corrida já com a divisão
// 6% vão pro Cadernex (marketplace_fee); o resto vai pra conta Mercado Pago do entregador.
// O cliente paga também a taxa do Mercado Pago, pra o entregador receber o valor inteiro.
// Publicar com "Verify JWT" LIGADO (padrão).
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

const TAXA_APP = 0.06; // 6% do Cadernex
const SITE = "https://cadernex.com.br";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

// token do entregador, renovando se estiver perto de vencer
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: { user } } = await admin.auth.getUser(jwt);
    if (!user) return json({ erro: "Entre na sua conta de novo." }, 401);

    const { corrida_id } = await req.json();
    const { data: c } = await admin.from("corridas").select("*").eq("id", corrida_id).maybeSingle();
    if (!c || c.cliente_id !== user.id) return json({ erro: "Só quem pediu pode pagar essa corrida." }, 403);
    if (!["aceita", "coletada", "entregue"].includes(c.status)) {
      return json({ erro: "O pagamento libera depois que alguém aceitar." }, 400);
    }
    const { data: pg } = await admin.from("pagamentos").select("status").eq("corrida_id", c.id).maybeSingle();
    if (pg?.status === "pago") return json({ erro: "Essa corrida já está paga." }, 400);

    const tk = await tokenDo(admin, c.entregador_id);
    if (!tk) return json({ erro: "Esse entregador ainda não recebe pelo app. Combinem o Pix pela conversa." }, 400);

    const mpTaxa = Number(Deno.env.get("MP_TAXA") || "0.0099");
    const valor = Number(c.valor);
    const taxaApp = Math.round(valor * TAXA_APP * 100) / 100;
    const total = Math.ceil(((valor + taxaApp) / (1 - mpTaxa)) * 100) / 100;

    const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { Authorization: `Bearer ${tk}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{
          id: c.id,
          title: `${c.tipo === "frete" ? "Frete" : "Entrega"} Cadernex: ${c.coleta_bairro} → ${c.entrega_bairro}`,
          quantity: 1,
          unit_price: total,
          currency_id: "BRL",
        }],
        marketplace_fee: taxaApp,
        external_reference: c.id,
        notification_url: `${url}/functions/v1/mp-webhook?c=${c.id}`,
        back_urls: { success: `${SITE}/#pago`, pending: `${SITE}/#pago`, failure: `${SITE}/#pedidos` },
        auto_return: "approved",
        statement_descriptor: "CADERNEX",
        payment_methods: {
          excluded_payment_types: [{ id: "credit_card" }, { id: "debit_card" }, { id: "ticket" }, { id: "prepaid_card" }],
          installments: 1,
        },
      }),
    });
    const p = await r.json();
    if (!r.ok || !p.init_point) {
      return json({ erro: "O Mercado Pago não criou o pagamento. Tente de novo.", detalhe: p.message || p.error }, 400);
    }

    const { error } = await admin.from("pagamentos").upsert({
      corrida_id: c.id, cliente_id: c.cliente_id, entregador_id: c.entregador_id,
      valor, taxa_app: taxaApp, total, preference_id: p.id, status: "pendente",
    });
    if (error) throw error;
    return json({ url: p.init_point, total, valor, taxa: Math.round((total - valor) * 100) / 100 });
  } catch (e) {
    return json({ erro: "Não deu pra criar o pagamento agora.", detalhe: String((e as Error)?.message || e) }, 500);
  }
});
