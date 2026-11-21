// Cadernex — excluir-conta: a própria pessoa apaga a conta dela.
// Confere se pode (sem corrida em andamento, sem repasse pendente), apaga as fotos,
// guarda só os valores das corridas pagas (sem dados pessoais) e apaga o usuário.
// A pessoa confirma com a senha da conta.
// Publicar com "Verify JWT" LIGADO (padrão).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });
const MOTIVO: Record<string, string> = {
  admin: "Conta de moderador não pode ser excluída pelo app.",
  bloqueado: "Essa conta está bloqueada. Para excluir, escreva para suporte@cadernex.com.br.",
  promotor: "Você é promotor e pode ter ganhos a receber. Para excluir, escreva para suporte@cadernex.com.br.",
  corrida_ativa: "Você tem uma corrida em andamento. Termine ou cancele antes de excluir a conta.",
  repasse: "Você tem um Pix de corrida ainda sendo enviado. Espere cair e tente de novo.",
};

async function limparPasta(admin: ReturnType<typeof createClient>, bucket: string, uid: string) {
  const st = admin.storage.from(bucket);
  for (let i = 0; i < 20; i++) {
    const { data, error } = await st.list(uid, { limit: 100 });
    if (error || !data || !data.length) return;
    const nomes = data.filter((f) => f.name).map((f) => `${uid}/${f.name}`);
    if (!nomes.length) return;
    await st.remove(nomes);
    if (data.length < 100) return;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const jwt = (req.headers.get("Authorization") || "").replace("Bearer ", "");
    const { data: { user } } = await admin.auth.getUser(jwt);
    if (!user) return json({ erro: "Entre na sua conta de novo." }, 401);

    // confirma com a senha da conta
    const { senha } = await req.json().catch(() => ({}));
    if (!senha || String(senha).length < 6) return json({ erro: "Digite a sua senha." }, 400);
    if (!user.email) return json({ erro: "Essa conta não tem e-mail. Escreva para suporte@cadernex.com.br." }, 400);
    const pub = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false } });
    const { data: ent, error: eS } = await pub.auth.signInWithPassword({ email: user.email, password: String(senha) });
    if (eS || !ent?.user || ent.user.id !== user.id) return json({ erro: "Senha errada. Confira e tente de novo." }, 403);

    const { data: motivo, error: e1 } = await admin.rpc("conta_pode_excluir", { u: user.id });
    if (e1) throw e1;
    if (motivo) return json({ erro: MOTIVO[motivo as string] || "Não deu pra excluir agora." }, 409);

    for (const b of ["perfis", "veiculos", "produtos"]) {
      try { await limparPasta(admin, b, user.id); } catch (_) { /* segue */ }
    }
    const { error: e2 } = await admin.rpc("conta_arquivar", { u: user.id });
    if (e2) throw e2;
    const { error: e3 } = await admin.auth.admin.deleteUser(user.id);
    if (e3) throw e3;
    return json({ ok: true });
  } catch (e) {
    console.error("excluir-conta", String((e as Error)?.message || e));
    return json({ erro: "Não deu pra excluir agora. Tente de novo ou escreva para suporte@cadernex.com.br." }, 500);
  }
});
