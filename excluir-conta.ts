// Cadernex — excluir-conta: a própria pessoa apaga a conta dela.
// Confere se pode (sem corrida em andamento, sem repasse pendente), apaga as fotos,
// guarda só os valores das corridas pagas (sem dados pessoais) e apaga o usuário.
// A pessoa confirma com a senha da conta.
// O moderador também pode excluir a conta de outra pessoa (campo "alvo"), confirmando com a senha DELE.
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
    const { senha, alvo } = await req.json().catch(() => ({}));
    if (!senha || String(senha).length < 6) return json({ erro: "Digite a sua senha." }, 400);
    if (!user.email) return json({ erro: "Essa conta não tem e-mail. Escreva para suporte@cadernex.com.br." }, 400);
    const pub = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false } });
    const { data: ent, error: eS } = await pub.auth.signInWithPassword({ email: user.email, password: String(senha) });
    if (eS || !ent?.user || ent.user.id !== user.id) return json({ erro: "Senha errada. Confira e tente de novo." }, 403);

    // quem vai ser excluído: a própria pessoa, ou outra (só o moderador)
    let alvoId = user.id, peloMod = false;
    if (alvo && alvo !== user.id) {
      const { data: eu } = await admin.from("perfis").select("admin").eq("user_id", user.id).maybeSingle();
      if (!eu?.admin) return json({ erro: "Só o moderador pode excluir a conta de outra pessoa." }, 403);
      if (!/^[0-9a-f-]{36}$/i.test(String(alvo))) return json({ erro: "Conta não encontrada." }, 400);
      const { data: ele } = await admin.from("perfis").select("admin").eq("user_id", alvo).maybeSingle();
      if (ele?.admin) return json({ erro: "Não dá pra excluir a conta de outro moderador." }, 403);
      alvoId = String(alvo); peloMod = true;
    }

    const { data: motivo, error: e1 } = await admin.rpc("conta_pode_excluir", { u: alvoId });
    if (e1) throw e1;
    const MOD: Record<string, string> = {
      corrida_ativa: "Essa conta tem uma corrida em andamento. Espere terminar ou cancele antes.",
      repasse: "Essa conta tem um Pix de corrida ainda sendo enviado. Espere cair e tente de novo.",
    };
    if (motivo && !(peloMod && (motivo === "bloqueado" || motivo === "promotor"))) {
      return json({ erro: (peloMod ? MOD[motivo as string] : MOTIVO[motivo as string]) || "Não deu pra excluir agora." }, 409);
    }

    for (const b of ["perfis", "veiculos", "produtos"]) {
      try { await limparPasta(admin, b, alvoId); } catch (_) { /* segue */ }
    }
    const { error: e2 } = await admin.rpc("conta_arquivar", { u: alvoId, mod: peloMod });
    if (e2) throw e2;
    const { error: e3 } = await admin.auth.admin.deleteUser(alvoId);
    if (e3) throw e3;
    return json({ ok: true });
  } catch (e) {
    console.error("excluir-conta", String((e as Error)?.message || e));
    return json({ erro: "Não deu pra excluir agora. Tente de novo ou escreva para suporte@cadernex.com.br." }, 500);
  }
});
