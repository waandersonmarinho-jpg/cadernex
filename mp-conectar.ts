// Cadernex — mp-conectar: liga a conta Mercado Pago do entregador ou da loja (OAuth)
// Publicar com "Verify JWT" LIGADO (padrão).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

// endereços de retorno aceitos (têm que estar cadastrados também na aplicação do Mercado Pago)
const RETORNOS = [
  "https://cadernex.com.br/",
  "https://www.cadernex.com.br/",
  "https://frolicking-kheer-4de995.netlify.app/",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: { user } } = await admin.auth.getUser(jwt);
    if (!user) return json({ erro: "Entre na sua conta de novo." }, 401);

    const { data: perfil } = await admin.from("perfis").select("tipo,bloqueado,loja").eq("user_id", user.id).maybeSingle();
    if (perfil?.tipo !== "entregador" && !perfil?.loja) return json({ erro: "Só entregadores e lojas conectam conta pra receber." }, 403);
    if (perfil?.bloqueado) return json({ erro: "Sua conta está bloqueada para análise." }, 403);

    const { code, redirect_uri } = await req.json();
    if (!code) return json({ erro: "Faltou o código do Mercado Pago." }, 400);
    if (!RETORNOS.includes(redirect_uri)) return json({ erro: "Endereço de retorno inválido." }, 400);

    const r = await fetch("https://api.mercadopago.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: Deno.env.get("MP_CLIENT_ID"),
        client_secret: Deno.env.get("MP_CLIENT_SECRET"),
        grant_type: "authorization_code",
        code,
        redirect_uri,
      }),
    });
    const t = await r.json();
    if (!r.ok || !t.access_token) {
      return json({ erro: "O Mercado Pago não aceitou a conexão. Tente de novo.", detalhe: t.message || t.error }, 400);
    }

    const { error } = await admin.from("mp_contas").upsert({
      user_id: user.id,
      mp_user_id: String(t.user_id ?? ""),
      access_token: t.access_token,
      refresh_token: t.refresh_token ?? null,
      expira_em: new Date(Date.now() + (Number(t.expires_in) || 15552000) * 1000).toISOString(),
      atualizado_em: new Date().toISOString(),
    });
    if (error) throw error;
    return json({ ok: true });
  } catch (e) {
    return json({ erro: "Não deu pra conectar agora.", detalhe: String((e as Error)?.message || e) }, 500);
  }
});
