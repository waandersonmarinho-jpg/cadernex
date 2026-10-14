-- Cadernex — Promotores de lojas
-- Quem cadastra uma loja ganha 2% da taxa que o Cadernex recebe dessa loja:
--   • corridas pagas pelo app que a loja pediu (taxa de serviço + comissão do entregador)
--   • vendas da loja pagas pelo app (taxa de 6%)
-- Vale por 24 meses a partir do dia em que a loja foi cadastrada com o código do promotor.
-- Conta só o que foi pago dentro desse prazo. Devolvidos e recusados não contam.
-- Rodar uma vez no Supabase: SQL Editor → colar tudo → Run. Pode rodar de novo sem problema.

-- ---------- 1. Colunas ----------
alter table public.perfis add column if not exists promotor        boolean not null default false;
alter table public.perfis add column if not exists promotor_codigo text;
alter table public.perfis add column if not exists promotor_pix    text;
alter table public.perfis add column if not exists promotor_desde  timestamptz;
alter table public.perfis add column if not exists indicado_por    uuid references auth.users(id) on delete set null;
alter table public.perfis add column if not exists indicado_em     timestamptz;
create unique index if not exists perfis_promotor_codigo_uk on public.perfis (promotor_codigo) where promotor_codigo is not null;
create index if not exists perfis_indicado_por_ix on public.perfis (indicado_por) where indicado_por is not null;

-- saques: o promotor pede (uma vez por semana) e você faz o Pix e marca como pago
create table if not exists public.promotor_saques (
  id          bigint generated always as identity primary key,
  promotor_id uuid not null references auth.users(id) on delete cascade,
  valor       numeric(10,2) not null check (valor > 0),
  pix         text not null,
  status      text not null default 'pedido' check (status in ('pedido', 'pago', 'recusado')),
  obs         text,
  pedido_em   timestamptz not null default now(),
  pago_em     timestamptz,
  feito_por   uuid references auth.users(id)
);
create index if not exists promotor_saques_pid_ix on public.promotor_saques (promotor_id, pedido_em desc);
alter table public.promotor_saques enable row level security;
drop policy if exists "promotor vê os próprios saques" on public.promotor_saques;
create policy "promotor vê os próprios saques" on public.promotor_saques
  for select using (promotor_id = auth.uid());

-- ---------- 2. Proteção ----------
-- O app salva o perfil inteiro (upsert). Essas colunas só mudam pelas funções abaixo,
-- nunca direto do celular: ninguém vira promotor de si mesmo nem troca o promotor de uma loja.
create or replace function public.perfis_guarda_promotor() returns trigger
language plpgsql as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if tg_op = 'INSERT' then
    new.promotor := false; new.promotor_codigo := null; new.promotor_pix := null; new.promotor_desde := null;
    new.indicado_por := null; new.indicado_em := null;
  else
    new.promotor := old.promotor; new.promotor_codigo := old.promotor_codigo; new.promotor_pix := old.promotor_pix;
    new.promotor_desde := old.promotor_desde; new.indicado_por := old.indicado_por; new.indicado_em := old.indicado_em;
  end if;
  return new;
end $$;
drop trigger if exists perfis_guarda_promotor on public.perfis;
create trigger perfis_guarda_promotor before insert or update on public.perfis
  for each row execute function public.perfis_guarda_promotor();

-- ---------- 3. Regra da comissão (mude só aqui) ----------
create or replace function public.promotor_taxa() returns numeric
language sql immutable as $$ select 0.02::numeric $$;  -- 2% da taxa do Cadernex
create or replace function public.promotor_prazo() returns interval
language sql immutable as $$ select interval '24 months' $$;  -- por quanto tempo cada loja rende comissão
create or replace function public.promotor_saque_minimo() returns numeric
language sql immutable as $$ select 5.00::numeric $$;  -- menor saque (R$)
create or replace function public.promotor_saque_intervalo() returns interval
language sql immutable as $$ select interval '7 days' $$;  -- um saque por semana

-- cada taxa recebida de uma loja indicada, com a parte do promotor
create or replace function public._promotor_mov(p uuid)
returns table (loja_id uuid, quando timestamptz, origem text, taxa numeric, comissao numeric)
language sql stable security definer set search_path = public as $$
  select l.user_id, pg.pago_em, 'entrega',
         coalesce(pg.taxa_app, 0) + coalesce(pg.comissao, 0),
         (coalesce(pg.taxa_app, 0) + coalesce(pg.comissao, 0)) * promotor_taxa()
    from perfis l join pagamentos pg on pg.cliente_id = l.user_id
   where l.indicado_por = p and pg.status = 'pago' and pg.pago_em >= l.indicado_em and pg.pago_em < l.indicado_em + promotor_prazo()
  union all
  select l.user_id, e.pago_em, 'venda', coalesce(e.taxa_app, 0), coalesce(e.taxa_app, 0) * promotor_taxa()
    from perfis l join encomendas e on e.loja_id = l.user_id
   where l.indicado_por = p and e.pago_em is not null and e.status <> 'devolvida' and e.pago_em >= l.indicado_em and e.pago_em < l.indicado_em + promotor_prazo()
$$;
revoke all on function public._promotor_mov(uuid) from public, anon, authenticated;

create or replace function public._eh_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select admin from perfis where user_id = auth.uid()), false)
$$;
revoke all on function public._eh_admin() from public, anon;

-- saldo do promotor: ganho, já sacado (pedido ou pago), disponível e quando pode sacar de novo
create or replace function public._promotor_saldo(p uuid)
returns table (ganho numeric, pendente numeric, pago numeric, disponivel numeric, proximo timestamptz)
language sql stable security definer set search_path = public as $$
  with g as (select coalesce(sum(comissao), 0) v from _promotor_mov(p)),
  s as (select coalesce(sum(valor) filter (where status = 'pedido'), 0) pend,
               coalesce(sum(valor) filter (where status = 'pago'), 0) pago,
               max(pedido_em) filter (where status <> 'recusado') ult,
               bool_or(status = 'pedido') aberto
          from promotor_saques where promotor_id = p)
  select round(g.v, 2), s.pend, s.pago, greatest(0, floor((g.v - s.pend - s.pago) * 100) / 100)::numeric(10,2),
         case when s.aberto then null when s.ult is null then now() else greatest(now(), s.ult + promotor_saque_intervalo()) end
    from g, s
$$;
revoke all on function public._promotor_saldo(uuid) from public, anon, authenticated;

-- ---------- 4. Funções do app ----------
-- virar promotor (ou trocar a chave Pix)
create or replace function public.promotor_entrar(pix text)
returns text language plpgsql security definer set search_path = public as $$
declare cod text; alfa text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i int; me perfis;
begin
  if auth.uid() is null then raise exception 'login'; end if;
  pix := nullif(trim(pix), '');
  if pix is null or length(pix) < 5 or length(pix) > 120 then raise exception 'pix'; end if;
  select * into me from perfis where user_id = auth.uid();
  if not found then raise exception 'perfil'; end if;
  if coalesce(me.bloqueado, false) then raise exception 'bloqueado'; end if;
  cod := me.promotor_codigo;
  while cod is null loop
    cod := '';
    for i in 1..6 loop cod := cod || substr(alfa, 1 + floor(random() * length(alfa))::int, 1); end loop;
    if exists (select 1 from perfis where promotor_codigo = cod) then cod := null; end if;
  end loop;
  update perfis set promotor = true, promotor_codigo = cod, promotor_pix = pix,
                    promotor_desde = coalesce(promotor_desde, now())
   where user_id = auth.uid();
  return cod;
end $$;

-- a loja coloca o código do promotor (uma vez só)
create or replace function public.promotor_vincular(cod text)
returns text language plpgsql security definer set search_path = public as $$
declare me perfis; p perfis;
begin
  if auth.uid() is null then raise exception 'login'; end if;
  select * into me from perfis where user_id = auth.uid();
  if not found or not coalesce(me.loja, false) or coalesce(trim(me.loja_nome), '') = '' then raise exception 'nao_loja'; end if;
  if me.indicado_por is not null then raise exception 'ja_vinculada'; end if;
  select * into p from perfis where promotor and promotor_codigo = upper(trim(cod));
  if not found then raise exception 'codigo'; end if;
  if p.user_id = auth.uid() then raise exception 'proprio'; end if;
  update perfis set indicado_por = p.user_id, indicado_em = now() where user_id = auth.uid();
  return coalesce(nullif(p.nome, ''), 'promotor');
end $$;

-- nome do promotor que cadastrou a minha loja
create or replace function public.promotor_meu()
returns text language sql stable security definer set search_path = public as $$
  select coalesce(nullif(p.nome, ''), 'promotor') from perfis me join perfis p on p.user_id = me.indicado_por
   where me.user_id = auth.uid()
$$;

-- painel do promotor
create or replace function public.promotor_painel()
returns json language plpgsql stable security definer set search_path = public as $$
declare me perfis; r json;
begin
  select * into me from perfis where user_id = auth.uid();
  if not found or not me.promotor then return json_build_object('promotor', false); end if;
  with mov as (select * from _promotor_mov(auth.uid())),
  lojas as (
    select l.user_id, l.loja_nome, l.loja_bairro, l.indicado_em,
           coalesce(sum(m.taxa), 0) taxa, coalesce(sum(m.comissao), 0) comissao, count(m.*) mov, max(m.quando) ultimo
      from perfis l left join mov m on m.loja_id = l.user_id
     where l.indicado_por = auth.uid()
     group by l.user_id, l.loja_nome, l.loja_bairro, l.indicado_em),
  sq as (select * from promotor_saques where promotor_id = auth.uid()),
  sd as (select * from _promotor_saldo(auth.uid()))
  select json_build_object(
    'promotor', true,
    'taxa', promotor_taxa(),
    'meses', extract(year from promotor_prazo()) * 12 + extract(month from promotor_prazo()),
    'codigo', me.promotor_codigo,
    'pix', me.promotor_pix,
    'desde', me.promotor_desde,
    'ganho', (select ganho from sd),
    'disponivel', (select disponivel from sd),
    'pendente', (select pendente from sd),
    'pago', (select pago from sd),
    'proximo', (select proximo from sd),
    'minimo', promotor_saque_minimo(),
    'mes', round((select coalesce(sum(comissao), 0) from mov
                   where quando >= date_trunc('month', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo'), 2),
    'lojas', coalesce((select json_agg(json_build_object('nome', loja_nome, 'bairro', loja_bairro, 'desde', indicado_em, 'ate', indicado_em + promotor_prazo(),
                        'taxa', round(taxa, 2), 'comissao', round(comissao, 2), 'mov', mov, 'ultimo', ultimo)
                        order by comissao desc, indicado_em desc) from lojas), '[]'::json),
    'saques', coalesce((select json_agg(json_build_object('valor', valor, 'status', status, 'pedido', pedido_em, 'pago', pago_em, 'obs', obs, 'pix', pix)
                        order by pedido_em desc) from sq), '[]'::json)
  ) into r;
  return r;
end $$;

-- o promotor pede o saque de tudo que está disponível (uma vez por semana)
create or replace function public.promotor_sacar()
returns numeric language plpgsql security definer set search_path = public as $$
declare me perfis; sd record;
begin
  if auth.uid() is null then raise exception 'login'; end if;
  perform pg_advisory_xact_lock(hashtext('promotor_saque:' || auth.uid()::text));
  select * into me from perfis where user_id = auth.uid();
  if not found or not me.promotor then raise exception 'nao_promotor'; end if;
  if coalesce(me.bloqueado, false) then raise exception 'bloqueado'; end if;
  if coalesce(me.promotor_pix, '') = '' then raise exception 'pix'; end if;
  select * into sd from _promotor_saldo(auth.uid());
  if sd.proximo is null then raise exception 'saque_aberto'; end if;
  if sd.proximo > now() then raise exception 'semana'; end if;
  if sd.disponivel < promotor_saque_minimo() then raise exception 'minimo'; end if;
  insert into promotor_saques (promotor_id, valor, pix) values (auth.uid(), sd.disponivel, me.promotor_pix);
  return sd.disponivel;
end $$;

-- ---------- 5. Moderador ----------
create or replace function public.promotores_admin()
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not _eh_admin() then raise exception 'admin'; end if;
  return json_build_object(
    'saques', coalesce((select json_agg(json_build_object('id', q.id, 'valor', q.valor, 'pix', q.pix, 'pedido', q.pedido_em,
                 'nome', p.nome, 'codigo', p.promotor_codigo, 'whats', coalesce(p.loja_whats, p.telefone)) order by q.pedido_em)
               from promotor_saques q join perfis p on p.user_id = q.promotor_id where q.status = 'pedido'), '[]'::json),
    'promotores', coalesce((select json_agg(x order by x.ganho desc, x.lojas desc) from (
      select p.user_id id, p.nome, coalesce(p.loja_whats, p.telefone) whats, p.promotor_pix pix, p.promotor_codigo codigo,
             (select count(*) from perfis l where l.indicado_por = p.user_id) lojas,
             sd.ganho, sd.pago, sd.pendente, sd.disponivel
        from perfis p cross join lateral _promotor_saldo(p.user_id) sd
       where p.promotor) x), '[]'::json));
end $$;

-- você fez o Pix: marca o saque como pago (ou recusa, e o valor volta pro saldo do promotor)
create or replace function public.promotor_saque_mudar(sid bigint, acao text, nota text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not _eh_admin() then raise exception 'admin'; end if;
  if acao not in ('pagar', 'recusar') then raise exception 'acao'; end if;
  update promotor_saques
     set status = case acao when 'pagar' then 'pago' else 'recusado' end,
         pago_em = case acao when 'pagar' then now() end,
         obs = nullif(trim(nota), ''), feito_por = auth.uid()
   where id = sid and status = 'pedido';
  if not found then raise exception 'saque'; end if;
end $$;

revoke all on function public.promotor_entrar(text), public.promotor_vincular(text), public.promotor_meu(),
  public.promotor_painel(), public.promotores_admin(), public.promotor_sacar(), public.promotor_saque_mudar(bigint, text, text) from public, anon;
grant execute on function public.promotor_entrar(text), public.promotor_vincular(text), public.promotor_meu(),
  public.promotor_painel(), public.promotores_admin(), public.promotor_sacar(), public.promotor_saque_mudar(bigint, text, text) to authenticated;
