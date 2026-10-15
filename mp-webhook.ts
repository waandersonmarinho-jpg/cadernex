// Cadernex — mp-webhook: o Mercado Pago avisa aqui quando um pagamento muda.
// Publicar com "Verify JWT" DESLIGADO (o Mercado Pago não manda login).
// Segurança: nunca confia no aviso. Sempre confere o pagamento direto no Mercado Pago,
// confere o valor e a taxa do Cadernex, e nunca deixa um Pix antigo/expirado desfazer um pagamento já feito.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const ok = () => new Response("ok", { status: 200 });
const CENTAVO = 0.01;

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
    const { data: pg } = await admin.from("pagamentos")
      .select("status,payment_id,total,taxa_app,comissao").eq("corrida_id", cid).maybeSingle();
    if (!pg) return ok();

    // confere direto no Mercado Pago
    const r = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(pid)}`, {
      headers: { Authorization: `Bearer ${conta.access_token}` },
    });
    if (!r.ok) return ok();
    const pay = await r.json();
    if (String(pay.external_reference) !== cid) return ok();

    const payId = String(pay.id);
    const novo = pay.status === "approved" ? "pago"
      : ["rejected", "cancelled", "refunded", "charged_back"].includes(pay.status) ? "recusado" : "pendente";

    // Já está pago por OUTRO Pix (o cliente gerou dois QR codes): ignora o aviso deste.
    // Só o próprio pagamento que foi pago pode mudar o status (ex.: devolução ou contestação).
    if (pg.status === "pago" && pg.payment_id && pg.payment_id !== payId) return ok();
    // Pago não volta para pendente.
    if (pg.status === "pago" && novo === "pendente") return ok();
    if (pg.status === novo && pg.payment_id === payId) return ok();

    if (novo === "pago") {
      // o valor pago tem que cobrir o total cobrado, e a taxa do Cadernex tem que ter sido separada
      const pagoValor = Number(pay.transaction_amount || 0);
      const feeEsperada = Number(pg.taxa_app || 0) + Number(pg.comissao || 0);
      const feeRecebida = (pay.fee_details || [])
        .filter((f: { type?: string }) => f.type === "application_fee")
        .reduce((s: number, f: { amount?: number }) => s + Number(f.amount || 0), 0);
      if (pagoValor + CENTAVO < Number(pg.total || 0) || feeRecebida + CENTAVO < feeEsperada) {
        console.error("mp-webhook: valor divergente", { cid, payId, pagoValor, total: pg.total, feeRecebida, feeEsperada });
        return ok();
      }
    }

    // atualiza só se o status não mudou desde a leitura (evita corrida entre dois avisos)
    await admin.from("pagamentos").update({
      status: novo,
      payment_id: payId,
      ...(novo === "pago" ? { pago_em: pay.date_approved || new Date().toISOString() } : {}),
    }).eq("corrida_id", cid).eq("status", pg.status);
    return ok();
  } catch (e) {
    console.error("mp-webhook", e);
    return ok(); // responde 200 pra o Mercado Pago não ficar repetindo
  }
});
