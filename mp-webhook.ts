// Cadernex — mp-webhook: o Mercado Pago avisa aqui quando um pagamento muda.
// Publicar com "Verify JWT" DESLIGADO (o Mercado Pago não manda login).
// Segurança: nunca confia no aviso. Sempre confere o pagamento direto no Mercado Pago.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const ok = () => new Response("ok", { status: 200 });

Deno.serve(async (req) => {
  try {
    const u = new URL(req.url);
    const cid = u.searchParams.get("c");
    let body: Record<string, any> = {};
    try { body = await req.json(); } catch { /* aviso sem corpo */ }
    const tipo = body.type || body.topic || u.searchParams.get("type") || u.searchParams.get("topic");
    const pid = String(body?.data?.id || u.searchParams.get("data.id") || u.searchParams.get("id") || "");
    if (!cid || !pid || (tipo && tipo !== "payment")) return ok();

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: c } = await admin.from("corridas").select("id,entregador_id").eq("id", cid).maybeSingle();
    if (!c?.entregador_id) return ok();
    const { data: conta } = await admin.from("mp_contas").select("access_token").eq("user_id", c.entregador_id).maybeSingle();
    if (!conta) return ok();

    // confere direto no Mercado Pago
    const r = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(pid)}`, {
      headers: { Authorization: `Bearer ${conta.access_token}` },
    });
    if (!r.ok) return ok();
    const pay = await r.json();
    if (String(pay.external_reference) !== cid) return ok();

    const status = pay.status === "approved" ? "pago"
      : ["rejected", "cancelled", "refunded", "charged_back"].includes(pay.status) ? "recusado" : "pendente";
    await admin.from("pagamentos").update({
      status, payment_id: String(pay.id), ...(status === "pago" ? { pago_em: new Date().toISOString() } : {}),
    }).eq("corrida_id", cid).neq("status", status === "pago" ? "pago" : "__nunca__");
    return ok();
  } catch {
    return ok(); // responde 200 pra o Mercado Pago não ficar repetindo
  }
});
