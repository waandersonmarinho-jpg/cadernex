// Cadernex — woovi-webhook: a Woovi avisa aqui quando um Pix muda.
// Não confia no aviso: busca a cobrança de novo na Woovi e confere status e valor.
// Pagou → marca "pago" e manda a parte do entregador da subconta pro Pix (CPF) dele.
// Segredos: WOOVI_APP_ID e WOOVI_WEBHOOK_SECRET (o mesmo texto do campo "Authorization" do webhook na Woovi).
// Publicar com "Verify JWT" DESLIGADO.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const API = "https://api.woovi.com/api/v1";
const ok = () => new Response("ok", { status: 200 });

async function woovi(path: string, init: RequestInit = {}) {
  const r = await fetch(API + path, {
    ...init,
    headers: { Authorization: Deno.env.get("WOOVI_APP_ID")!, "Content-Type": "application/json" },
  });
  let b: any = null;
  try { b = await r.json(); } catch (_) { /* sem corpo */ }
  return { ok: r.ok, status: r.status, b };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return ok();
  const seg = Deno.env.get("WOOVI_WEBHOOK_SECRET") || "";
  const veio = req.headers.get("authorization") || req.headers.get("x-cadernex") || new URL(req.url).searchParams.get("s") || "";
  // Senha errada ou ausente: responde 200 (a Woovi exige 200 pra registrar), mas não faz nada.
  // Mesmo com a senha certa, nada é confiado no aviso: a cobrança é conferida de novo na Woovi.
  if (!seg || veio.replace(/^Bearer\s+/i, "") !== seg) { console.warn("woovi-webhook: aviso sem a senha certa"); return ok(); }

  let body: any = {};
  try { body = await req.json(); } catch (_) { return ok(); }
  if (body?.evento === "teste_webhook" || body?.event === "teste_webhook") return ok();
  const corr: string | undefined = body?.charge?.correlationID || body?.pix?.charge?.correlationID;
  if (corr && corr.startsWith("cxp-")) return pedidoLoja(corr);
  if (!corr || !corr.startsWith("cx-")) return ok();

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: pg } = await admin.from("pagamentos").select("*").eq("correlation_id", corr).maybeSingle();
    if (!pg) return ok();

    const g = await woovi(`/charge/${encodeURIComponent(corr)}`);
    const ch = g.b?.charge;
    if (!g.ok || !ch || ch.correlationID !== corr) { console.error("woovi-webhook get", g.status); return new Response("retry", { status: 500 }); }

    if (ch.status === "EXPIRED") {
      if (pg.status === "pendente") await admin.from("pagamentos").update({ status: "recusado" })
        .eq("corrida_id", pg.corrida_id).eq("correlation_id", corr).eq("status", "pendente");
      return ok();
    }
    if (ch.status !== "COMPLETED") return ok();
    if (Number(ch.value) !== Math.round(Number(pg.total) * 100)) {
      console.error("woovi-webhook valor diferente", corr, ch.value, pg.total);
      return ok();
    }

    if (pg.status !== "pago") {
      await admin.from("pagamentos").update({
        status: "pago", pago_em: new Date().toISOString(),
        payment_id: ch.transactionID || ch.globalID || corr,
      }).eq("corrida_id", pg.corrida_id).eq("correlation_id", corr);
    }

    // repasse pro entregador — trava pra não mandar duas vezes
    const { data: trava } = await admin.from("pagamentos").update({ repasse_status: "enviando" })
      .eq("corrida_id", pg.corrida_id).eq("correlation_id", corr)
      .or("repasse_status.is.null,repasse_status.eq.erro").select("corrida_id");
    if (!trava?.length) return ok();

    const { data: s } = await admin.from("woovi_subcontas").select("pix_key").eq("user_id", pg.entregador_id).maybeSingle();
    let st = "erro";
    if (s?.pix_key) {
      const w = await woovi(`/subaccount/${encodeURIComponent(s.pix_key)}/withdraw`, {
        method: "POST", body: JSON.stringify({ value: Math.round(Number(pg.repasse) * 100) }),
      });
      if (w.ok) st = "enviado";
      else console.error("woovi-webhook saque", w.status, JSON.stringify(w.b));
    }
    await admin.from("pagamentos").update({ repasse_status: st, repasse_em: st === "enviado" ? new Date().toISOString() : null })
      .eq("corrida_id", pg.corrida_id).eq("correlation_id", corr);
    return ok();
  } catch (e) {
    console.error("woovi-webhook", String((e as Error)?.message || e));
    return new Response("retry", { status: 500 });
  }
});

// pedidos do delivery (produtos da loja): confere na Woovi, marca pago e manda a parte da loja pro Pix dela
async function pedidoLoja(corr: string) {
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: pd } = await admin.from("pedidos_loja").select("*").eq("correlation_id", corr).maybeSingle();
    if (!pd) return ok();
    const g = await woovi(`/charge/${encodeURIComponent(corr)}`);
    const ch = g.b?.charge;
    if (!g.ok || !ch || ch.correlationID !== corr) return new Response("retry", { status: 500 });
    if (ch.status === "EXPIRED") {
      if (pd.status === "aguardando") await admin.from("pedidos_loja").update({ status: "expirado" }).eq("id", pd.id).eq("status", "aguardando");
      return ok();
    }
    if (ch.status !== "COMPLETED") return ok();
    if (Number(ch.value) !== Math.round(Number(pd.total) * 100)) { console.error("pedido valor diferente", corr); return ok(); }
    if (pd.status === "aguardando" || pd.status === "expirado") {
      await admin.from("pedidos_loja").update({ status: "pago", pago_em: new Date().toISOString() }).eq("id", pd.id);
    }
    const { data: trava } = await admin.from("pedidos_loja").update({ repasse_status: "enviando" })
      .eq("id", pd.id).or("repasse_status.is.null,repasse_status.eq.erro").select("id");
    if (!trava?.length) return ok();
    const { data: s } = await admin.from("woovi_subcontas").select("pix_key").eq("user_id", pd.loja_id).maybeSingle();
    let st = "erro";
    if (s?.pix_key) {
      const w = await woovi(`/subaccount/${encodeURIComponent(s.pix_key)}/withdraw`, {
        method: "POST", body: JSON.stringify({ value: Math.round(Number(pd.repasse) * 100) }),
      });
      if (w.ok) st = "enviado"; else console.error("pedido saque", w.status, JSON.stringify(w.b));
    }
    await admin.from("pedidos_loja").update({ repasse_status: st, repasse_em: st === "enviado" ? new Date().toISOString() : null }).eq("id", pd.id);
    return ok();
  } catch (e) {
    console.error("woovi-webhook pedido", String((e as Error)?.message || e));
    return new Response("retry", { status: 500 });
  }
}
