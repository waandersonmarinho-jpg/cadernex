// Cadernex — woovi-pedido: cria o Pix de um pedido do delivery (produtos da loja).
// Cliente paga: produtos + 10% de serviço + entrega (+ taxa do Pix).
// A loja recebe na hora, no Pix dela (CNPJ ou CPF do cadastro): produtos − 12% + entrega.
// O Cadernex fica com 10% + 12%. Os preços são conferidos aqui no servidor.
// Segredo: WOOVI_APP_ID. Publicar com "Verify JWT" LIGADO (padrão).
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const API = "https://api.woovi.com/api/v1";
const SERVICO = 0.10;   // pago pelo cliente
const COMISSAO = 0.12;  // descontado da loja
const VALIDADE = 30 * 60;
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
    headers: { Authorization: Deno.env.get("WOOVI_APP_ID")!, "Content-Type": "application/json" },
  });
  let b: any = null;
  try { b = await r.json(); } catch (_) { /* sem corpo */ }
  return { ok: r.ok, status: r.status, b };
}
// chaves da loja, em ordem: a chave Pix que ela escolheu, depois CNPJ e CPF do cadastro
function chavesDe(d: any): string[] {
  const l: string[] = [];
  const pc = String(d?.pix_chave || "").trim();
  if (pc) l.push(pc);
  for (const x of [d?.cnpj, d?.cpf]) {
    const v = String(x || "").replace(/\D/g, "");
    if ((v.length === 14 || v.length === 11) && !l.includes(v)) l.push(v);
  }
  return l;
}
// tenta as chaves da loja em ordem (CNPJ, depois CPF) e devolve a que a Woovi aceitou
async function subconta(admin: SupabaseClient, uid: string, chaves: string[], nome: string): Promise<string | null> {
  const { data: s } = await admin.from("woovi_subcontas").select("pix_key").eq("user_id", uid).maybeSingle();
  if (s?.pix_key && s.pix_key === chaves[0]) return s.pix_key;
  for (const chave of chaves) {
    const c = await woovi("/subaccount", { method: "POST", body: JSON.stringify({ pixKey: chave, name: nome.slice(0, 60) }) });
    let ok = c.ok;
    if (!ok) {
      const g = await woovi(`/subaccount/${encodeURIComponent(chave)}`);
      ok = g.ok;
      if (!ok) { console.error("woovi-pedido subconta", chave.length === 14 ? "CNPJ" : "CPF", c.status, JSON.stringify(c.b)); if (c.status === 403) { recursoOff = true; return null; } }
    }
    if (ok) { await admin.from("woovi_subcontas").upsert({ user_id: uid, pix_key: chave }); return chave; }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  recursoOff = false;
  try {
    if (!Deno.env.get("WOOVI_APP_ID")) return json({ erro: "O pagamento pelo app ainda não foi ligado." }, 503);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: { user } } = await admin.auth.getUser(jwt);
    if (!user) return json({ erro: "Entre na sua conta de novo." }, 401);

    const b = await req.json().catch(() => ({}));

    // teste da chave Pix da própria loja (na hora de ativar ou trocar a chave)
    if (b.teste) {
      const { data: me } = await admin.from("perfis").select("loja,loja_nome").eq("user_id", user.id).maybeSingle();
      const { data: d } = await admin.from("dados_pessoais").select("pix_chave,cnpj,cpf,nome_completo,empresa_nome").eq("user_id", user.id).maybeSingle();
      const ch = chavesDe(d);
      if (!ch.length) return json({ erro: "Cadastre uma chave Pix ou complete o CPF/CNPJ do seu cadastro." }, 400);
      const ok = await subconta(admin, user.id, ch, d?.empresa_nome || me?.loja_nome || d?.nome_completo || "Loja Cadernex");
      if (!ok) return json({ erro: recursoOff ? "O recebimento pelo app ainda está sendo liberado pelo Cadernex. Tente de novo mais tarde." : "O banco não encontrou essa chave Pix. Confira se ela está cadastrada no app do seu banco." }, 400);
      return json({ ok: true, chave: ok });
    }

    const lojaId = String(b.loja_id || "");
    const itensPed: { id: string; n: number }[] = Array.isArray(b.itens) ? b.itens : [];
    const endereco = String(b.endereco || "").trim().slice(0, 160);
    const bairro = String(b.bairro || "").trim().slice(0, 60);
    const obs = String(b.obs || "").trim().slice(0, 160);
    let entrega = Number(b.entrega || 0);
    if (!endereco || endereco.length < 5) return json({ erro: "Coloque o endereço de entrega." }, 400);
    if (!itensPed.length || itensPed.length > 50) return json({ erro: "Seu carrinho está vazio." }, 400);
    if (!(entrega >= 0 && entrega <= 150)) entrega = 0;
    if (lojaId === user.id) return json({ erro: "Você não pode comprar da sua própria loja." }, 400);

    const { data: loja } = await admin.from("perfis")
      .select("user_id,loja,loja_nome,loja_aberta,loja_pix,bloqueado").eq("user_id", lojaId).maybeSingle();
    if (!loja?.loja || loja.bloqueado) return json({ erro: "Essa loja não está disponível." }, 400);
    if (loja.loja_aberta === false) return json({ erro: "A loja está fechada agora." }, 400);
    if (!loja.loja_pix) return json({ erro: "Essa loja ainda não recebe pelo app. Pague na entrega pelo WhatsApp." }, 400);

    const { data: dl } = await admin.from("dados_pessoais").select("pix_chave,cnpj,cpf,nome_completo,empresa_nome").eq("user_id", lojaId).maybeSingle();
    const chaves = chavesDe(dl);
    if (!chaves.length) return json({ erro: "Essa loja ainda não recebe pelo app. Pague na entrega pelo WhatsApp." }, 400);

    // preços do banco, não do celular
    const ids = [...new Set(itensPed.map((x) => String(x.id)))];
    const { data: prods } = await admin.from("produtos").select("id,nome,preco,ativo,loja_id").in("id", ids);
    const itens: { id: string; nome: string; n: number; preco: number }[] = [];
    for (const x of itensPed) {
      const p = (prods || []).find((y) => y.id === x.id && y.loja_id === lojaId && y.ativo);
      const n = Math.max(1, Math.min(99, Math.floor(Number(x.n) || 0)));
      if (!p) return json({ erro: "Um produto do carrinho não está mais disponível. Atualize o cardápio." }, 409);
      itens.push({ id: p.id, nome: p.nome, n, preco: Number(p.preco) });
    }
    const subtotal = r2(itens.reduce((s, x) => s + x.n * x.preco, 0));
    if (subtotal < 1) return json({ erro: "Pedido mínimo de R$ 1,00." }, 400);
    const servico = r2(subtotal * SERVICO);
    const comissao = r2(subtotal * COMISSAO);
    entrega = r2(entrega);
    const repasse = r2(subtotal - comissao + entrega);
    const taxaPix = Number(Deno.env.get("WOOVI_TAXA") || "0.008");
    const total = Math.ceil(((subtotal + servico + entrega) / (1 - taxaPix)) * 100) / 100;

    const chave = await subconta(admin, lojaId, chaves, dl?.empresa_nome || loja.loja_nome || dl?.nome_completo || "Loja Cadernex");
    if (!chave) {
      return json({ erro: recursoOff ? "O pagamento pelo app está em liberação. Tente de novo mais tarde." : "O Pix dessa loja ainda não está pronto: o CPF/CNPJ dela precisa estar cadastrado como chave Pix no banco. Avise a loja." }, 502);
    }
    const { data: cli } = await admin.from("perfis").select("nome,telefone").eq("user_id", user.id).maybeSingle();
    const { data: ped, error: e1 } = await admin.from("pedidos_loja").insert({
      loja_id: lojaId, cliente_id: user.id, itens, subtotal, servico, entrega, comissao, total, repasse,
      cliente_nome: cli?.nome || null, cliente_whats: cli?.telefone || null, endereco, bairro, obs,
    }).select("id").single();
    if (e1) throw e1;

    const corr = `cxp-${ped.id}-${Date.now().toString(36)}`;
    const w = await woovi("/charge", {
      method: "POST",
      body: JSON.stringify({
        correlationID: corr, value: Math.round(total * 100), expiresIn: VALIDADE,
        comment: `Pedido ${loja.loja_nome} · Cadernex Delivery`.slice(0, 140),
        splits: [{ pixKey: chave, value: Math.round(repasse * 100), splitType: "SPLIT_SUB_ACCOUNT" }],
      }),
    });
    const ch = w.b?.charge || w.b;
    if (!w.ok || !ch?.brCode) {
      console.error("woovi-pedido charge", w.status, JSON.stringify(w.b));
      await admin.from("pedidos_loja").update({ status: "cancelado" }).eq("id", ped.id);
      return json({ erro: "Não deu pra criar o Pix agora. Tente de novo." }, 400);
    }
    const expira = new Date(Date.now() + VALIDADE * 1000).toISOString();
    await admin.from("pedidos_loja").update({
      correlation_id: corr, brcode: ch.brCode, qrcode: ch.qrCodeImage || null, link: ch.paymentLinkUrl || null, expira_em: expira,
    }).eq("id", ped.id);
    return json({ id: ped.id, brcode: ch.brCode, qrcode: ch.qrCodeImage, url: ch.paymentLinkUrl, total, subtotal, servico, entrega, expira_em: expira });
  } catch (e) {
    console.error("woovi-pedido", String((e as Error)?.message || e));
    return json({ erro: "Não deu pra criar o pedido agora." }, 500);
  }
});
