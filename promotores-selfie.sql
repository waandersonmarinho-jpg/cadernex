-- Cadernex — Selfie obrigatória do promotor (rode depois do promotores-dados.sql)
-- Para entrar no programa e para sacar, o promotor precisa da selfie (foto do rosto) no perfil.
-- A selfie fica na pasta privada "perfis", arquivo <id>/foto.jpg.
-- Rodar uma vez no Supabase: SQL Editor → colar tudo → Run. Pode rodar de novo sem problema.

create or replace function public.tem_selfie(u uuid) returns boolean
language sql stable security definer set search_path = public, storage as $$
  select exists (select 1 from storage.objects where bucket_id = 'perfis' and name = u::text || '/foto.jpg')
$$;
revoke all on function public.tem_selfie(uuid) from public, anon;
grant execute on function public.tem_selfie(uuid) to authenticated;

create or replace function public.promotor_entrar(pix text, dados jsonb default null)
returns text language plpgsql security definer set search_path = public as $$
declare cod text; alfa text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i int; me perfis;
  v_cpf text; v_w text; v_nasc date; v_nome text; v_cid text; v_uf text;
begin
  if auth.uid() is null then raise exception 'login'; end if;
  pix := nullif(trim(pix), '');
  if pix is null or length(pix) < 5 or length(pix) > 120 then raise exception 'pix'; end if;
  select * into me from perfis where user_id = auth.uid();
  if not found then raise exception 'perfil'; end if;
  if coalesce(me.bloqueado, false) then raise exception 'bloqueado'; end if;

  if dados is not null then
    v_nome := trim(regexp_replace(coalesce(dados->>'nome', ''), '\s+', ' ', 'g'));
    v_cpf := regexp_replace(coalesce(dados->>'cpf', ''), '\D', '', 'g');
    v_w := regexp_replace(coalesce(dados->>'whats', ''), '\D', '', 'g');
    v_cid := trim(coalesce(dados->>'cidade', ''));
    v_uf := upper(trim(coalesce(dados->>'uf', '')));
    begin v_nasc := (dados->>'nasc')::date; exception when others then v_nasc := null; end;
    if length(v_nome) < 5 or position(' ' in v_nome) = 0 then raise exception 'dados_nome'; end if;
    if me.promotor_cpf is not null then v_cpf := me.promotor_cpf;
    elsif length(v_cpf) <> 11 then raise exception 'dados_cpf';
    elsif exists (select 1 from perfis where promotor_cpf = v_cpf and user_id <> auth.uid()) then raise exception 'dados_cpf_usado';
    end if;
    if v_nasc is null or v_nasc > (current_date - interval '18 years') or v_nasc < date '1920-01-01' then raise exception 'dados_idade'; end if;
    if length(v_w) not in (10, 11) then raise exception 'dados_whats'; end if;
    if length(v_cid) < 2 then raise exception 'dados_cidade'; end if;
    if length(v_uf) <> 2 then raise exception 'dados_uf'; end if;
    if me.promotor_termos_em is null and coalesce(dados->>'termos', '') <> '1' then raise exception 'dados_termos'; end if;
  elsif me.promotor_cpf is null then
    raise exception 'dados_faltam';
  end if;
  -- quem está entrando no programa precisa da selfie
  if not coalesce(me.promotor, false) and not tem_selfie(auth.uid()) then raise exception 'selfie_falta'; end if;

  cod := me.promotor_codigo;
  while cod is null loop
    cod := '';
    for i in 1..6 loop cod := cod || substr(alfa, 1 + floor(random() * length(alfa))::int, 1); end loop;
    if exists (select 1 from perfis where promotor_codigo = cod) then cod := null; end if;
  end loop;
  update perfis set promotor = true, promotor_codigo = cod, promotor_pix = pix,
                    promotor_desde = coalesce(promotor_desde, now()),
                    promotor_nome = coalesce(v_nome, promotor_nome), promotor_cpf = coalesce(v_cpf, promotor_cpf),
                    promotor_nasc = coalesce(v_nasc, promotor_nasc), promotor_whats = coalesce(v_w, promotor_whats),
                    promotor_cidade = coalesce(left(v_cid, 60), promotor_cidade), promotor_uf = coalesce(v_uf, promotor_uf),
                    promotor_termos_em = case when dados->>'termos' = '1' then now() else promotor_termos_em end,
                    promotor_termos_versao = case when dados->>'termos' = '1' then '2026-10-14' else promotor_termos_versao end
   where user_id = auth.uid();
  return cod;
end $$;

create or replace function public.promotor_sacar()
returns numeric language plpgsql security definer set search_path = public as $$
declare me perfis; sd record;
begin
  if auth.uid() is null then raise exception 'login'; end if;
  perform pg_advisory_xact_lock(hashtext('promotor_saque:' || auth.uid()::text));
  select * into me from perfis where user_id = auth.uid();
  if not found or not me.promotor then raise exception 'nao_promotor'; end if;
  if coalesce(me.bloqueado, false) then raise exception 'bloqueado'; end if;
  if me.promotor_cpf is null then raise exception 'dados_faltam'; end if;
  if not tem_selfie(auth.uid()) then raise exception 'selfie_falta'; end if;
  if coalesce(me.promotor_pix, '') = '' then raise exception 'pix'; end if;
  select * into sd from _promotor_saldo(auth.uid());
  if sd.proximo is null then raise exception 'saque_aberto'; end if;
  if sd.proximo > now() then raise exception 'semana'; end if;
  if sd.disponivel < promotor_saque_minimo() then raise exception 'minimo'; end if;
  insert into promotor_saques (promotor_id, valor, pix) values (auth.uid(), sd.disponivel, me.promotor_pix);
  return sd.disponivel;
end $$;
