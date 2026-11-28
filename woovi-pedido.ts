// Cadernex — woovi-pedido: cria o Pix de um pedido do delivery (produtos da loja).
// Cliente paga: produtos + 10% de serviço + entrega (+ taxa do Pix).
// A loja recebe na hora, no Pix dela: produtos − 12%. Retirada na loja: sem entrega.
// Entrega automática: a parte da entrega fica na Cadernex e paga o motoboy quando ele entrega (woovi-repasse).
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

    // cliente cancela um pedido que ainda não foi pago: apaga a cobrança na Woovi (o Pix deixa de valer)
    if (b.cancelar) {
      const { data: pd } = await admin.from("pedidos_loja").select("id,cliente_id,status,correlation_id").eq("id", String(b.cancelar)).maybeSingle();
      if (!pd || pd.cliente_id !== user.id) return json({ erro: "Pedido não encontrado." }, 404);
      if (pd.status === "cancelado" || pd.status === "expirado") return json({ ok: true });
      if (pd.status !== "aguardando") return json({ erro: "Esse pedido já foi pago. Pra cancelar, fale com a loja." }, 409);
      if (pd.correlation_id) {
        const g = await woovi(`/charge/${encodeURIComponent(pd.correlation_id)}`);
        if (g.b?.charge?.status === "COMPLETED") return json({ erro: "Esse Pix já foi pago. O pedido vai aparecer como pago em instantes." }, 409);
        await woovi(`/charge/${encodeURIComponent(pd.correlation_id)}`, { method: "DELETE" });
      }
      await admin.from("pedidos_loja").update({ status: "cancelado" }).eq("id", pd.id).eq("status", "aguardando");
      return json({ ok: true });
    }

    const lojaId = String(b.loja_id || "");
    const itensPed: { id: string; n: number; op?: string }[] = Array.isArray(b.itens) ? b.itens : [];
    const retirada = b.retirada === true; // cliente busca na loja: sem entrega
    let endereco = String(b.endereco || "").trim().slice(0, 160);
    let bairro = String(b.bairro || "").trim().slice(0, 60);
    const obs = String(b.obs || "").trim().slice(0, 160);
    let entrega = Number(b.entrega || 0);
    if (retirada) entrega = 0;
    if (!retirada && (!endereco || endereco.length < 5)) return json({ erro: "Coloque o endereço de entrega." }, 400);
    if (!itensPed.length || itensPed.length > 50) return json({ erro: "Seu carrinho está vazio." }, 400);
    if (!(entrega >= 0 && entrega <= 150) || retirada) entrega = 0;
    if (lojaId === user.id) return json({ erro: "Você não pode comprar da sua própria loja." }, 400);

    const { data: loja } = await admin.from("perfis")
      .select("user_id,loja,loja_nome,loja_aberta,loja_pix,bloqueado,loja_lat,loja_lng,loja_end,loja_bairro").eq("user_id", lojaId).maybeSingle();
    if (!loja?.loja || loja.bloqueado) return json({ erro: "Essa loja não está disponível." }, 400);
    if (loja.loja_aberta === false) return json({ erro: "A loja está fechada agora." }, 400);
    if (!loja.loja_pix) return json({ erro: "Essa loja ainda não recebe pelo app. Pague na entrega pelo WhatsApp." }, 400);

    const { data: dl } = await admin.from("dados_pessoais").select("pix_chave,cnpj,cpf,nome_completo,empresa_nome").eq("user_id", lojaId).maybeSingle();
    const chaves = chavesDe(dl);
    if (!chaves.length) return json({ erro: "Essa loja ainda não recebe pelo app. Pague na entrega pelo WhatsApp." }, 400);

    // preços do banco, não do celular
    const ids = [...new Set(itensPed.map((x) => String(x.id)))];
    const { data: prods } = await admin.from("produtos").select("*").in("id", ids);
    const itens: { id: string; nome: string; n: number; preco: number; op?: string }[] = [];
    for (const x of itensPed) {
      const p = (prods || []).find((y) => y.id === x.id && y.loja_id === lojaId && y.ativo);
      const n = Math.max(1, Math.min(99, Math.floor(Number(x.n) || 0)));
      if (!p) return json({ erro: "Um produto do carrinho não está mais disponível. Atualize o cardápio." }, 409);
      // cor / opção escolhida: tem que ser uma das que a loja cadastrou
      const vals: string[] = Array.isArray(p.opcoes?.valores) ? p.opcoes.valores.map(String) : [];
      const op = x.op == null ? "" : String(x.op);
      if (vals.length && !vals.includes(op)) return json({ erro: `Escolha a ${String(p.opcoes?.nome || "cor").toLowerCase()} de "${p.nome}".` }, 409);
      if (!vals.length && op) return json({ erro: "Um produto do carrinho mudou. Atualize o cardápio." }, 409);
      itens.push(op ? { id: p.id, nome: `${p.nome} (${op})`, n, preco: Number(p.preco), op } : { id: p.id, nome: p.nome, n, preco: Number(p.preco) });
    }
    const subtotal = r2(itens.reduce((s, x) => s + x.n * x.preco, 0));
    if (subtotal < 1) return json({ erro: "Pedido mínimo de R$ 1,00." }, 400);
    const servico = r2(subtotal * SERVICO);
    const comissao = r2(subtotal * COMISSAO);
    entrega = r2(entrega);
    // Entrega automática: o cliente paga a entrega aqui, a Cadernex guarda e paga o motoboy quando ele entregar.
    // A distância é conferida aqui (não só no celular). Loja com entregador próprio recebe a entrega, como antes.
    let entregaApp = false, corridaValor: number | null = null, km: number | null = null;
    const dLat = Number(b.lat), dLng = Number(b.lng);
    const temDest = isFinite(dLat) && isFinite(dLng) && Math.abs(dLat) > 0.1;
    if (retirada) {
      endereco = ("Retirar na loja" + (loja.loja_end ? ": " + loja.loja_end : "")).slice(0, 160);
      bairro = String(loja.loja_bairro || "").slice(0, 60);
    } else if (loja.loja_lat != null && (temDest || Number(b.km) > 0)) {
      let k = Math.max(0, Math.min(60, Number(b.km) || 0));
      if (temDest) {
        const R = 6371, rd = (x: number) => x * Math.PI / 180;
        const h = Math.sin(rd(dLat - loja.loja_lat) / 2) ** 2 + Math.cos(rd(loja.loja_lat)) * Math.cos(rd(dLat)) * Math.sin(rd(dLng - loja.loja_lng) / 2) ** 2;
        k = Math.max(k, 2 * R * Math.asin(Math.sqrt(h)) * 1.2); // nunca menos que a linha reta + 20%
      }
      km = Math.round(k * 10) / 10;
      if (km > 40) return json({ erro: "Esse endereço está fora da área de entrega da loja." }, 400);
      corridaValor = Math.max(6, Math.ceil(1.25 * Math.max(0, km) * 2) / 2); // entrega de loja: R$ 1,25 por km, mínimo R$ 6
      entrega = Math.ceil((corridaValor * 1.14 + 2.99) * 2) / 2;
      entregaApp = true;
    }
    const repasse = r2(subtotal - comissao + (entregaApp ? 0 : entrega));
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
      entrega_app: entregaApp, corrida_valor: corridaValor, km, dest_lat: temDest && !retirada ? dLat : null, dest_lng: temDest && !retirada ? dLng : null,
      ...(retirada ? { retirada: true } : {}),
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
