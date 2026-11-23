// Cadernex — woovi-repasse: paga o motoboy da entrega automática do delivery, DEPOIS que ele entrega com o código.
// Quem chama é o banco (gatilho "corrida_auto_paga"), com o segredo do push_cfg no cabeçalho x-cx.
// O dinheiro da entrega já está na conta da Cadernex (o cliente pagou junto com o pedido):
// 1) credita a parte do motoboy na subconta dele (chave = CPF)  2) saca da subconta pro Pix dele.
// Segredos: WOOVI_APP_ID. Publicar com "Verify JWT" DESLIGADO.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const API = "https://api.woovi.com/api/v1";
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });

async function woovi(path: string, init: RequestInit = {}) {
  const r = await fetch(API + path, { ...init, headers: { Authorization: Deno.env.get("WOOVI_APP_ID")!, "Content-Type": "application/json" } });
  let b: any = null;
  try { b = await r.json(); } catch (_) { /* sem corpo */ }
  return { ok: r.ok, status: r.status, b };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ ok: true });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const { data: cfg } = await admin.from("push_cfg").select("segredo").eq("id", 1).maybeSingle();
    if (!cfg?.segredo || req.headers.get("x-cx") !== cfg.segredo) return json({ erro: "não autorizado" }, 401);
    const { corrida_id } = await req.json().catch(() => ({}));
    if (!corrida_id) return json({ erro: "sem corrida" }, 400);

    const { data: c } = await admin.from("corridas").select("id,status,entregador_id").eq("id", corrida_id).maybeSingle();
    if (!c || c.status !== "entregue" || !c.entregador_id) return json({ ok: false, motivo: "corrida não entregue" });

    // trava: só um envio por corrida
    const { data: antes } = await admin.from("pagamentos").select("repasse_status").eq("corrida_id", corrida_id).like("correlation_id", "cxa-%").maybeSingle();
    const soSaque = antes?.repasse_status === "erro_saque"; // já creditou antes: só falta sacar
    const { data: trava } = await admin.from("pagamentos").update({ repasse_status: "enviando" })
      .eq("corrida_id", corrida_id).in("repasse_status", ["aguarda_entrega", "erro_saque"]).like("correlation_id", "cxa-%")
      .select("repasse,entregador_id");
    if (!trava?.length) return json({ ok: false, motivo: "já enviado ou sem repasse" });
    const valor = Math.round(Number(trava[0].repasse) * 100);

    let st = "erro";
    const { data: d } = await admin.from("dados_pessoais").select("cpf,nome_completo").eq("user_id", c.entregador_id).maybeSingle();
    const cpf = String(d?.cpf || "").replace(/\D/g, "");
    if (cpf.length === 11 && valor > 0) {
      // garante a subconta do motoboy
      const { data: s } = await admin.from("woovi_subcontas").select("pix_key").eq("user_id", c.entregador_id).maybeSingle();
      let chave = s?.pix_key === cpf ? cpf : null;
      if (!chave) {
        const n = await woovi("/subaccount", { method: "POST", body: JSON.stringify({ pixKey: cpf, name: String(d?.nome_completo || "Entregador Cadernex").slice(0, 60) }) });
        const g = n.ok ? n : await woovi(`/subaccount/${encodeURIComponent(cpf)}`);
        if (g.ok) { chave = cpf; await admin.from("woovi_subcontas").upsert({ user_id: c.entregador_id, pix_key: cpf }); }
        else console.error("woovi-repasse subconta", n.status, JSON.stringify(n.b));
      }
      if (chave) {
        const cr = soSaque ? { ok: true, status: 200, b: null } : await woovi(`/subaccount/${encodeURIComponent(chave)}/credit`, {
          method: "POST", body: JSON.stringify({ value: valor, description: `Entrega Cadernex ${String(corrida_id).slice(0, 8)}` }),
        });
        if (!cr.ok) console.error("woovi-repasse credito", cr.status, JSON.stringify(cr.b));
        else {
          const w = await woovi(`/subaccount/${encodeURIComponent(chave)}/withdraw`, { method: "POST", body: JSON.stringify({ value: valor }) });
          if (w.ok) st = "enviado";
          else { console.error("woovi-repasse saque", w.status, JSON.stringify(w.b)); st = "erro_saque"; }
        }
      }
    }
    await admin.from("pagamentos").update({ repasse_status: st, repasse_em: st === "enviado" ? new Date().toISOString() : null })
      .eq("corrida_id", corrida_id).like("correlation_id", "cxa-%");
    return json({ ok: st === "enviado" });
  } catch (e) {
    console.error("woovi-repasse", String((e as Error)?.message || e));
    return json({ erro: "falhou" }, 500);
  }
});
