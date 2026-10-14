-- Cadernex — Dados do promotor (parte 3; rode depois do promotores.sql)
-- Nome completo, CPF (11 números, único entre promotores), nascimento (18+), WhatsApp, cidade e UF.
-- Sem esses dados o promotor não consegue sacar.
-- Rodar uma vez no Supabase: SQL Editor → colar tudo → Run. Pode rodar de novo sem problema.

alter table public.perfis add column if not exists promotor_nome   text;
alter table public.perfis add column if not exists promotor_cpf    text;
alter table public.perfis add column if not exists promotor_nasc   date;
alter table public.perfis add column if not exists promotor_whats  text;
alter table public.perfis add column if not exists promotor_cidade text;
alter table public.perfis add column if not exists promotor_uf     text;
alter table public.perfis add column if not exists promotor_termos_em     timestamptz;
alter table public.perfis add column if not exists promotor_termos_versao text;
create unique index if not exists perfis_promotor_cpf_uk on public.perfis (promotor_cpf) where promotor_cpf is not null;

-- essas colunas também só mudam pelas funções (nunca direto do celular)
create or replace function public.perfis_guarda_promotor() returns trigger
language plpgsql as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if tg_op = 'INSERT' then
    new.promotor := false; new.promotor_codigo := null; new.promotor_pix := null; new.promotor_desde := null;
    new.indicado_por := null; new.indicado_em := null;
    new.promotor_nome := null; new.promotor_cpf := null; new.promotor_nasc := null;
    new.promotor_whats := null; new.promotor_cidade := null; new.promotor_uf := null;
    new.promotor_termos_em := null; new.promotor_termos_versao := null;
  else
    new.promotor := old.promotor; new.promotor_codigo := old.promotor_codigo; new.promotor_pix := old.promotor_pix;
    new.promotor_desde := old.promotor_desde; new.indicado_por := old.indicado_por; new.indicado_em := old.indicado_em;
    new.promotor_nome := old.promotor_nome; new.promotor_cpf := old.promotor_cpf; new.promotor_nasc := old.promotor_nasc;
    new.promotor_whats := old.promotor_whats; new.promotor_cidade := old.promotor_cidade; new.promotor_uf := old.promotor_uf;
    new.promotor_termos_em := old.promotor_termos_em; new.promotor_termos_versao := old.promotor_termos_versao;
  end if;
  return new;
end $$;

-- confere os dígitos do CPF
create or replace function public._cpf_ok(c text) returns boolean
language plpgsql immutable as $$
declare s int; d1 int; d2 int; i int;
begin
  c := regexp_replace(coalesce(c, ''), '\D', '', 'g');
  if length(c) <> 11 or c ~ '^(\d)\1{10}$' then return false; end if;
  s := 0; for i in 1..9 loop s := s + substr(c, i, 1)::int * (11 - i); end loop;
  d1 := (s * 10) % 11; if d1 = 10 then d1 := 0; end if;
  s := 0; for i in 1..10 loop s := s + substr(c, i, 1)::int * (12 - i); end loop;
  d2 := (s * 10) % 11; if d2 = 10 then d2 := 0; end if;
  return d1 = substr(c, 10, 1)::int and d2 = substr(c, 11, 1)::int;
end $$;

-- virar promotor ou atualizar dados. O CPF, depois de salvo, só o moderador troca.
drop function if exists public.promotor_entrar(text);
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

-- os dados do próprio promotor, para o formulário (CPF mascarado)
create or replace function public.promotor_meus_dados()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('nome', promotor_nome,
           'cpf', case when promotor_cpf is null then null else '***.' || substr(promotor_cpf, 4, 3) || '.' || substr(promotor_cpf, 7, 3) || '-**' end,
           'nasc', promotor_nasc, 'whats', promotor_whats, 'cidade', promotor_cidade, 'uf', promotor_uf,
           'completo', promotor_cpf is not null, 'termos', promotor_termos_em)
    from perfis where user_id = auth.uid()
$$;

-- saque só com os dados completos
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
  if coalesce(me.promotor_pix, '') = '' then raise exception 'pix'; end if;
  select * into sd from _promotor_saldo(auth.uid());
  if sd.proximo is null then raise exception 'saque_aberto'; end if;
  if sd.proximo > now() then raise exception 'semana'; end if;
  if sd.disponivel < promotor_saque_minimo() then raise exception 'minimo'; end if;
  insert into promotor_saques (promotor_id, valor, pix) values (auth.uid(), sd.disponivel, me.promotor_pix);
  return sd.disponivel;
end $$;

-- moderador: saques e promotores com os dados completos (para o registro dos pagamentos)
create or replace function public.promotores_admin()
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not _eh_admin() then raise exception 'admin'; end if;
  return json_build_object(
    'saques', coalesce((select json_agg(json_build_object('id', q.id, 'valor', q.valor, 'pix', q.pix, 'pedido', q.pedido_em,
                 'nome', coalesce(p.promotor_nome, p.nome), 'cpf', p.promotor_cpf, 'codigo', p.promotor_codigo,
                 'whats', coalesce(p.promotor_whats, p.loja_whats, p.telefone)) order by q.pedido_em)
               from promotor_saques q join perfis p on p.user_id = q.promotor_id where q.status = 'pedido'), '[]'::json),
    'promotores', coalesce((select json_agg(x order by x.ganho desc, x.lojas desc) from (
      select p.user_id id, coalesce(p.promotor_nome, p.nome) nome, p.promotor_cpf cpf, p.promotor_nasc nasc,
             p.promotor_cidade cidade, p.promotor_uf uf, coalesce(p.promotor_whats, p.loja_whats, p.telefone) whats,
             p.promotor_pix pix, p.promotor_codigo codigo, p.promotor_desde desde, p.promotor_termos_em termos,
             (select count(*) from perfis l where l.indicado_por = p.user_id) lojas,
             sd.ganho, sd.pago, sd.pendente, sd.disponivel
        from perfis p cross join lateral _promotor_saldo(p.user_id) sd
       where p.promotor) x), '[]'::json));
end $$;

revoke all on function public.promotor_entrar(text, jsonb), public.promotor_meus_dados() from public, anon;
grant execute on function public.promotor_entrar(text, jsonb), public.promotor_meus_dados() to authenticated;

-- ---------- Privacidade ----------
-- Cadastro de loja feito por promotor e não ativado em 60 dias é apagado sozinho (minimização, LGPD art. 6º, III).
create or replace function public._promotor_lojas_limpa() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from promotor_lojas where status = 'pendente' and criado_em < now() - interval '60 days';
  return null;
end $$;
do $$ begin
  if to_regclass('public.promotor_lojas') is not null then
    drop trigger if exists promotor_lojas_limpa on public.promotor_lojas;
    create trigger promotor_lojas_limpa after insert on public.promotor_lojas
      for each statement execute function public._promotor_lojas_limpa();
    delete from public.promotor_lojas where status = 'pendente' and criado_em < now() - interval '60 days';
  end if;
end $$;

-- O promotor sai do programa: apaga Pix, WhatsApp, nascimento, cidade e o código.
-- Ficam só nome, CPF e o histórico de saques, que a lei fiscal obriga a guardar.
-- Precisa sacar antes o saldo que der para sacar.
create or replace function public.promotor_sair()
returns void language plpgsql security definer set search_path = public as $$
declare me perfis; sd record;
begin
  if auth.uid() is null then raise exception 'login'; end if;
  select * into me from perfis where user_id = auth.uid();
  if not found or not me.promotor then raise exception 'nao_promotor'; end if;
  select * into sd from _promotor_saldo(auth.uid());
  if sd.pendente > 0 then raise exception 'saque_aberto'; end if;
  if sd.disponivel >= promotor_saque_minimo() then raise exception 'saldo_sacar'; end if;
  if to_regclass('public.promotor_lojas') is not null then
    execute 'delete from public.promotor_lojas where promotor_id = $1 and status = ''pendente''' using auth.uid();
  end if;
  update perfis set promotor = false, promotor_codigo = null, promotor_pix = null, promotor_whats = null,
                    promotor_nasc = null, promotor_cidade = null, promotor_uf = null
   where user_id = auth.uid();
end $$;
revoke all on function public.promotor_sair() from public, anon;
grant execute on function public.promotor_sair() to authenticated;
