// Cadernex — push: notificação com o app fechado (Web Push, sem dados no aviso).
// Publicar com "Verify JWT" DESLIGADO. Quem chama:
//  - o banco (gatilho push_aviso), com o cabeçalho secreto x-cx, quando entra corrida nova ou o pedido muda;
//  - o app, pra pegar a chave pública (?chave=1);
//  - o celular, quando chega o aviso, pra saber o texto da notificação (?e=<endpoint>).
// As chaves VAPID são criadas aqui mesmo na primeira vez e ficam só no banco (tabela push_cfg).
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const txt = (s: string) => new TextEncoder().encode(s);
const b64u = (buf: ArrayBuffer | Uint8Array) => {
  const a = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let s = "";
  for (const x of a) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const FRESCO_MS = 4 * 3600e3; // igual ao app: disponível nas últimas 4 horas
const FRETE = ["picape_p", "picape_m", "caminhao"];
const ST: Record<string, string> = {
  aceita: "Entregador a caminho da coleta",
  coletada: "Encomenda coletada, a caminho da entrega",
  entregue: "Pedido entregue ✓",
};
const ST2: Record<string, string> = {
  aceita: "Entregador indo buscar na loja",
  coletada: "Saiu pra entrega, já está a caminho",
  entregue: "Compra entregue ✓",
};
const brl = (v: number) => "R$ " + v.toFixed(2).replace(".", ",");

async function chaves(admin: SupabaseClient) {
  let { data } = await admin.from("push_cfg").select("*").eq("id", 1).maybeSingle();
  if (data?.pub && data?.priv) return data;
  const kp = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]) as CryptoKeyPair;
  const pub = b64u(await crypto.subtle.exportKey("raw", kp.publicKey));
  const priv = await crypto.subtle.exportKey("jwk", kp.privateKey);
  await admin.from("push_cfg").update({ pub, priv }).eq("id", 1).is("pub", null);
  ({ data } = await admin.from("push_cfg").select("*").eq("id", 1).maybeSingle());
  return data;
}

async function vapid(cfg: { pub: string; priv: JsonWebKey }, endpoint: string) {
  const aud = new URL(endpoint).origin;
  const head = b64u(txt(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const body = b64u(txt(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: "mailto:suporte@cadernex.com.br" })));
  const jwk = { ...cfg.priv };
  delete (jwk as Record<string, unknown>).key_ops;
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, txt(head + "." + body));
  return `vapid t=${head}.${body}.${b64u(sig)}, k=${cfg.pub}`;
}

async function enviar(admin: SupabaseClient, cfg: { pub: string; priv: JsonWebKey }, endpoint: string, msg: Record<string, string>) {
  await admin.from("push_msgs").upsert({ endpoint, ...msg, criado: new Date().toISOString() });
  const r = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: await vapid(cfg, endpoint), TTL: "120", Urgency: "high", "Content-Length": "0" },
  });
  if (r.status === 404 || r.status === 410) await admin.from("push_subs").delete().eq("endpoint", endpoint);
  return r.status;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = new URL(req.url);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // o app pede a chave pública
    if (req.method === "GET" && url.searchParams.get("chave")) {
      const cfg = await chaves(admin);
      return json({ pub: cfg?.pub || null });
    }
    // o celular pergunta o texto do último aviso dele
    if (req.method === "GET" && url.searchParams.get("e")) {
      const { data } = await admin.from("push_msgs").select("titulo,corpo,url,tag").eq("endpoint", url.searchParams.get("e")!).maybeSingle();
      return json(data || {});
    }
    if (req.method !== "POST") return json({ ok: true });

    // o banco avisa: só aceita com o segredo certo
    const { data: cfg } = await admin.from("push_cfg").select("*").eq("id", 1).maybeSingle();
    if (!cfg || req.headers.get("x-cx") !== cfg.segredo) return json({ erro: "não autorizado" }, 401);
    if (!cfg.pub || !cfg.priv) return json({ ok: true, motivo: "sem chaves ainda" });

    const { op, c, t } = await req.json();
    let alvo: string[] = [];
    let msg: Record<string, string> | null = null;
    // quem comprou numa loja também acompanha a entrega
    let alvo2: string[] = [];
    let msg2: Record<string, string> | null = null;

    if (t === "encomendas") {
      const n = Array.isArray(c?.itens) ? c.itens.reduce((s: number, i: { qtd: number }) => s + Number(i.qtd || 1), 0) : 0;
      const tot = brl(Number(c.total || c.subtotal));
      const M: Record<string, [string, string, string]> = {
        aceita: [c.cliente_id, "A loja aceitou seu pedido", "Toque pra pagar no Pix e a loja já prepara"],
        recusada: [c.cliente_id, "Sua compra no Cadernex", "A loja não pôde aceitar seu pedido"],
        devolvida: [c.cliente_id, "Sua compra no Cadernex", "A loja devolveu seu Pix de " + tot],
        paga: [c.loja_id, `Pagamento recebido ✓ ${tot}`, `${c.cliente_nome} pagou. Prepare e chame o entregador`],
      };
      if (op === "INSERT") {
        alvo = [c.loja_id];
        msg = { titulo: `Pedido novo · ${brl(Number(c.subtotal))}`, corpo: `${c.cliente_nome}: ${n} ${n === 1 ? "item" : "itens"} · ${c.entrega_bairro}`, url: "./", tag: "enc-" + c.id };
      } else if (M[c?.status]) {
        const [quem, tit, corpo] = M[c.status];
        alvo = [quem];
        msg = { titulo: tit, corpo, url: "./", tag: (quem === c.loja_id ? "enc-" : "compra-") + c.id };
      }
    } else if (op === "INSERT" && c?.status === "aberta") {
      const desde = new Date(Date.now() - FRESCO_MS).toISOString();
      const { data: ds } = await admin.from("disponiveis").select("user_id,veiculo,atualizado_em").gte("atualizado_em", desde);
      alvo = (ds || []).filter((d) =>
        d.user_id !== c.cliente_id &&
        (c.veiculo === "qualquer" || c.veiculo === d.veiculo || (c.veiculo === "carroceria" && FRETE.includes(d.veiculo))) &&
        !(d.veiculo === "bike" && Number(c.distancia_km) > 5)
      ).map((d) => d.user_id);
      const km = c.distancia_km ? ` · ${String(c.distancia_km).replace(".", ",")} km` : "";
      msg = {
        titulo: `${c.tipo === "frete" ? "Frete" : "Corrida"} nova · ${brl(Number(c.valor))}`,
        corpo: `${c.coleta_bairro} → ${c.entrega_bairro}${km}`,
        url: "./", tag: "corrida-" + c.id,
      };
    } else if (op === "UPDATE" && ST[c?.status]) {
      alvo = [c.cliente_id];
      msg = { titulo: "Seu pedido no Cadernex", corpo: ST[c.status], url: "./", tag: "pedido-" + c.id };
      const { data: enc } = await admin.from("encomendas").select("id,cliente_id").eq("corrida_id", c.id).maybeSingle();
      if (enc) {
        alvo2 = [enc.cliente_id];
        msg2 = { titulo: "Sua compra no Cadernex", corpo: ST2[c.status], url: "./", tag: "compra-" + enc.id };
      }
    }
    if ((!alvo.length || !msg) && !alvo2.length) return json({ ok: true, enviados: 0 });

    let total = 0;
    for (const [quem, m] of [[alvo, msg], [alvo2, msg2]] as [string[], Record<string, string> | null][]) {
      if (!quem.length || !m) continue;
      const { data: subs } = await admin.from("push_subs").select("endpoint").in("user_id", quem);
      const res = await Promise.all((subs || []).map((s) => enviar(admin, cfg, s.endpoint, m).catch(() => 0)));
      total += res.length;
    }
    return json({ ok: true, enviados: total });
  } catch (e) {
    return json({ erro: String((e as Error)?.message || e) }, 500);
  }
});
