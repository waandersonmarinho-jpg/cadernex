// Cadernex — woovi-teste: teste de repasse (só o moderador).
//  acao "diagnostico": confere, sem mexer em dinheiro, se cada loja e motoqueiro está pronto pra receber
//    (chave Pix válida, subconta na Woovi, chave da subconta igual à cadastrada, saldo parado, repasses com erro).
//  acao "pix_teste": manda R$ 1,00 de verdade do saldo do Cadernex pro Pix da pessoa (credita a subconta e saca).
//  acao "tentar": tenta de novo o repasse de um pedido do delivery que deu erro.
// Segredo: WOOVI_APP_ID. Publicar com "Verify JWT" LIGADO (padrão).
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const API = "https://api.woovi.com/api/v1";
const TESTE_CENTAVOS = 100; // R$ 1,00
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

async function woovi(path: string, init: RequestInit = {}) {
  const r = await fetch(API + path, {
    ...init,
    headers: { Authorization: Deno.env.get("WOOVI_APP_ID")!, "Content-Type": "application/json" },
  });
  let b: any = null;
  try { b = await r.json(); } catch (_) { /* sem corpo */ }
  return { ok: r.ok, status: r.status, b };
}
const so = (s: unknown) => String(s ?? "").replace(/\D/g, "");
function dvCpf(c: string) {
  if (!/^\d{11}$/.test(c) || /^(\d)\1{10}$/.test(c)) return false;
  const d = (k: number) => { let s = 0; for (let i = 0; i < k; i++) s += +c[i] * (k + 1 - i); return (s * 10) % 11 % 10; };
  return d(9) === +c[9] && d(10) === +c[10];
}
function dvCnpj(c: string) {
  if (!/^\d{14}$/.test(c) || /^(\d)\1{13}$/.test(c)) return false;
  const d = (k: number) => {
    const w = k === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let s = 0; for (let i = 0; i < k; i++) s += +c[i] * w[i]; const r = s % 11; return r < 2 ? 0 : 11 - r;
  };
  return d(12) === +c[12] && d(13) === +c[13];
}
// a chave cadastrada tem formato válido pro tipo escolhido?
function chaveOk(tipo: string, v: string): boolean {
  const t = String(tipo || "").toLowerCase(), s = String(v || "").trim();
  if (!s) return false;
  if (t === "cpf") return dvCpf(so(s));
  if (t === "cnpj") return dvCnpj(so(s));
  if (t === "celular" || t === "telefone") { const n = so(s).replace(/^55(?=\d{10,11}$)/, ""); return /^\d{2}9\d{8}$/.test(n); }
  if (t === "email") return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);
  if (t === "aleatoria" || t === "evp") return /^[0-9a-f-]{32,36}$/i.test(s);
  return s.length >= 5;
}
// esconde a chave: mostra só o começo e o fim
function mascara(v: string) {
  const s = String(v || "");
  if (/^\d{11}$/.test(s)) return `***.${s.slice(3, 6)}.${s.slice(6, 9)}-**`;
  if (s.length <= 6) return s.slice(0, 1) + "***";
  return s.slice(0, 3) + "***" + s.slice(-3);
}
const saldoDe = (b: any) => {
  const sa = b?.SubAccount || b?.subAccount || b?.subaccount || b;
  const v = Number(sa?.balance);
  return Number.isFinite(v) ? v / 100 : null;
};
const motivoWoovi = (b: any) => String(b?.error || b?.message || b?.errors?.[0]?.message || "").slice(0, 160);

// chave que o sistema usa pra pagar essa pessoa (mesma regra do woovi-pedido / woovi-repasse)
function chavesDe(papel: string, d: any): string[] {
  const cpf = so(d?.cpf), cnpj = so(d?.cnpj), l: string[] = [];
  if (papel === "entregador") return cpf.length === 11 ? [cpf] : [];
  const pc = String(d?.pix_chave || "").trim();
  if (pc) l.push(pc);
  for (const v of [cnpj, cpf]) if ((v.length === 14 || v.length === 11) && !l.includes(v)) l.push(v);
  return l;
}
async function garanteSubconta(admin: SupabaseClient, uid: string, papel: string, d: any, nome: string) {
  const { data: s } = await admin.from("woovi_subcontas").select("pix_key").eq("user_id", uid).maybeSingle();
  if (s?.pix_key) return s.pix_key as string;
  for (const chave of chavesDe(papel, d)) {
    const c = await woovi("/subaccount", { method: "POST", body: JSON.stringify({ pixKey: chave, name: nome.slice(0, 60) }) });
    const ok = c.ok || (await woovi(`/subaccount/${encodeURIComponent(chave)}`)).ok;
    if (ok) { await admin.from("woovi_subcontas").upsert({ user_id: uid, pix_key: chave }); return chave; }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    if (!Deno.env.get("WOOVI_APP_ID")) return json({ erro: "Woovi não configurada." }, 503);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: { user } } = await admin.auth.getUser(jwt);
    if (!user) return json({ erro: "Entre na sua conta de novo." }, 401);
    const { data: eu } = await admin.from("perfis").select("admin").eq("user_id", user.id).maybeSingle();
    if (!eu?.admin) return json({ erro: "Só o moderador." }, 403);

    const b = await req.json().catch(() => ({}));

    // ---------- diagnóstico: não mexe em dinheiro ----------
    if (b.acao === "diagnostico") {
      const { data: ps } = await admin.from("perfis").select("user_id,nome,tipo,loja,loja_nome,loja_pix")
        .or("loja.eq.true,tipo.eq.entregador").limit(200);
      const ids = (ps || []).map((p) => p.user_id);
      if (!ids.length) return json({ ok: true, lista: [] });
      const [{ data: ds }, { data: ss }, { data: pe }, { data: ce }] = await Promise.all([
        admin.from("dados_pessoais").select("user_id,nome_completo,cpf,cnpj,pix_tipo,pix_chave").in("user_id", ids),
        admin.from("woovi_subcontas").select("user_id,pix_key").in("user_id", ids),
        admin.from("pedidos_loja").select("loja_id,repasse").in("loja_id", ids).in("repasse_status", ["erro", "enviando"]),
        admin.from("pagamentos").select("entregador_id,repasse").in("entregador_id", ids).in("repasse_status", ["erro", "erro_saque", "enviando"]),
      ]);
      const D = new Map((ds || []).map((x) => [x.user_id, x]));
      const Sb = new Map((ss || []).map((x) => [x.user_id, x.pix_key]));
      const lista: any[] = [];
      for (const p of ps || []) {
        const papel = p.loja ? "loja" : "entregador";
        const d: any = D.get(p.user_id) || {};
        const sub = Sb.get(p.user_id) as string | undefined;
        const nome = (p.loja ? p.loja_nome : null) || d.nome_completo || p.nome || "Sem nome";
        const avisos: { n: "erro" | "atencao" | "ok"; t: string }[] = [];
        const errosPend = papel === "loja"
          ? (pe || []).filter((x) => x.loja_id === p.user_id) : (ce || []).filter((x) => x.entregador_id === p.user_id);
        // entregador sem CPF e sem nada pra receber não entra na lista (cadastro incompleto, ainda não trabalha)
        if (papel === "entregador" && !so(d.cpf) && !sub && !errosPend.length) continue;
        if (papel === "loja" && !p.loja_pix && !sub && !d.pix_chave) {
          avisos.push({ n: "atencao", t: "Loja ainda não ativou o recebimento pelo app (sem chave Pix)." });
        }
        if (papel === "loja" && d.pix_chave && !chaveOk(d.pix_tipo, d.pix_chave)) {
          avisos.push({ n: "atencao", t: `A chave Pix cadastrada não é um ${d.pix_tipo || "Pix"} válido. O sistema usa outra chave do cadastro.` });
        }
        if (papel === "entregador") {
          if (!dvCpf(so(d.cpf))) avisos.push({ n: "erro", t: "CPF do cadastro inválido: o Pix do motoqueiro não tem pra onde ir." });
          else avisos.push({ n: "ok", t: "O Pix do motoqueiro vai pro CPF dele. Confirme que o CPF é chave Pix no banco." });
        }
        let saldo: number | null = null, naWoovi: boolean | null = null;
        if (sub) {
          const g = await woovi(`/subaccount/${encodeURIComponent(sub)}`);
          naWoovi = g.ok;
          if (g.ok) saldo = saldoDe(g.b);
          else avisos.push({ n: "erro", t: "A subconta não foi encontrada na Woovi." });
          if (papel === "loja" && d.pix_chave && chaveOk(d.pix_tipo, d.pix_chave) && String(d.pix_chave).trim() !== sub) {
            avisos.push({ n: "atencao", t: "A loja trocou a chave Pix: o próximo pedido cria a subconta com a chave nova." });
          }
          if (saldo && saldo > 0) avisos.push({ n: "atencao", t: `Saldo parado na subconta: R$ ${saldo.toFixed(2).replace(".", ",")}.` });
        } else if (papel === "loja" && (p.loja_pix || d.pix_chave)) {
          avisos.push({ n: "ok", t: "Ainda sem subconta: ela é criada na primeira venda." });
        } else if (papel === "entregador") {
          avisos.push({ n: "ok", t: "Ainda sem subconta: ela é criada na primeira entrega paga." });
        }
        if (errosPend.length) {
          const tot = errosPend.reduce((s, x) => s + Number(x.repasse || 0), 0);
          avisos.push({ n: "erro", t: `${errosPend.length} repasse(s) com erro, R$ ${tot.toFixed(2).replace(".", ",")} parado(s).` });
        }
        const pior = avisos.some((a) => a.n === "erro") ? "erro" : avisos.some((a) => a.n === "atencao") ? "atencao" : "ok";
        lista.push({ user_id: p.user_id, nome, papel, chave: sub ? mascara(sub) : null, naWoovi, saldo, situacao: pior, avisos });
      }
      const ord: Record<string, number> = { erro: 0, atencao: 1, ok: 2 };
      lista.sort((a, b2) => ord[a.situacao] - ord[b2.situacao] || a.nome.localeCompare(b2.nome));
      return json({ ok: true, lista });
    }

    // ---------- Pix de teste de R$ 1,00: dinheiro de verdade, do saldo do Cadernex ----------
    if (b.acao === "pix_teste") {
      const uid = String(b.user_id || "");
      const { data: p } = await admin.from("perfis").select("nome,tipo,loja,loja_nome").eq("user_id", uid).maybeSingle();
      if (!p) return json({ erro: "Pessoa não encontrada." }, 404);
      const papel = p.loja ? "loja" : "entregador";
      const { data: d } = await admin.from("dados_pessoais").select("nome_completo,cpf,cnpj,pix_chave").eq("user_id", uid).maybeSingle();
      const nome = (p.loja ? p.loja_nome : null) || d?.nome_completo || p.nome || "Cadernex";
      const chave = await garanteSubconta(admin, uid, papel, d, nome);
      if (!chave) return json({ ok: false, etapa: "subconta", motivo: "A Woovi não aceitou nenhuma chave dessa pessoa. Peça pra conferir a chave Pix e o CPF/CNPJ." });
      const cr = await woovi(`/subaccount/${encodeURIComponent(chave)}/credit`, {
        method: "POST", body: JSON.stringify({ value: TESTE_CENTAVOS, description: "Teste de repasse Cadernex" }),
      });
      if (!cr.ok) {
        console.error("woovi-teste credito", cr.status, JSON.stringify(cr.b));
        return json({ ok: false, etapa: "credito", motivo: motivoWoovi(cr.b) || "Não deu pra creditar. Confira se há saldo na conta do Cadernex na Woovi." });
      }
      const w = await woovi(`/subaccount/${encodeURIComponent(chave)}/withdraw`, { method: "POST", body: JSON.stringify({ value: TESTE_CENTAVOS }) });
      if (!w.ok) {
        console.error("woovi-teste saque", w.status, JSON.stringify(w.b));
        return json({ ok: false, etapa: "saque", motivo: (motivoWoovi(w.b) || "A Woovi recusou o saque.") + " O R$ 1,00 ficou na subconta dele." });
      }
      return json({ ok: true, chave: mascara(chave), valor: TESTE_CENTAVOS / 100 });
    }

    // ---------- tentar de novo o repasse de um pedido do delivery ----------
    if (b.acao === "tentar") {
      const { data: pd } = await admin.from("pedidos_loja").select("id,status,repasse_status,correlation_id").eq("id", String(b.id || "")).maybeSingle();
      if (!pd?.correlation_id) return json({ erro: "Pedido não encontrado." }, 404);
      if (!["pago", "aceito", "saiu", "entregue"].includes(pd.status)) return json({ erro: "Esse pedido não está pago." }, 409);
      if (pd.repasse_status === "enviado" || pd.repasse_status === "manual") return json({ erro: "Esse repasse já foi resolvido." }, 409);
      const r = await fetch(Deno.env.get("SUPABASE_URL") + "/functions/v1/woovi-webhook", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ charge: { correlationID: pd.correlation_id } }),
      });
      await r.text().catch(() => "");
      const { data: dep } = await admin.from("pedidos_loja").select("repasse_status").eq("id", pd.id).maybeSingle();
      return json({ ok: dep?.repasse_status === "enviado", repasse_status: dep?.repasse_status || null });
    }

    return json({ erro: "Ação inválida." }, 400);
  } catch (e) {
    console.error("woovi-teste", String((e as Error)?.message || e));
    return json({ erro: "falhou" }, 500);
  }
});
