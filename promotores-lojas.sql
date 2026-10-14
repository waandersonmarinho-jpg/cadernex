-- Cadernex — Promotor cadastra a loja (parte 2; rode depois do promotores.sql)
-- O promotor preenche todos os dados da loja (nome, responsável, WhatsApp, CNPJ, CEP, endereço, localização…).
-- O app gera um convite. A loja cria a conta (ou entra na que já tem) pelo convite e já entra pronta,
-- com os dados preenchidos e ligada ao promotor. Os 24 meses contam a partir desse momento.
-- Rodar uma vez no Supabase: SQL Editor → colar tudo → Run. Pode rodar de novo sem problema.

-- ---------- 1. Colunas da loja no perfil (só cria as que faltam) ----------
alter table public.perfis add column if not exists loja             boolean default false;
alter table public.perfis add column if not exists loja_nome        text;
alter table public.perfis add column if not exists loja_ramo        text;
alter table public.perfis add column if not exists loja_end         text;
alter table public.perfis add column if not exists loja_bairro      text;
alter table public.perfis add column if not exists loja_cep         text;
alter table public.perfis add column if not exists loja_cidade      text;
alter table public.perfis add column if not exists loja_uf          text;
alter table public.perfis add column if not exists loja_lat         double precision;
alter table public.perfis add column if not exists loja_lng         double precision;
alter table public.perfis add column if not exists loja_whats       text;
alter table public.perfis add column if not exists loja_horario     text;
alter table public.perfis add column if not exists loja_cnpj        text;
alter table public.perfis add column if not exists loja_responsavel text;
alter table public.perfis add column if not exists loja_email       text;
alter table public.perfis add column if not exists end_padrao       text;
alter table public.perfis add column if not exists telefone         text;

-- ---------- 2. Lojas cadastradas pelos promotores ----------
create table if not exists public.promotor_lojas (
  id           bigint generated always as identity primary key,
  promotor_id  uuid not null references auth.users(id) on delete cascade,
  convite      text not null unique,
  status       text not null default 'pendente' check (status in ('pendente', 'ativa')),
  nome         text not null,
  ramo         text,
  responsavel  text not null,
  whats        text not null,
  telefone     text,
  email        text,
  cnpj         text,
  cep          text not null,
  rua          text not null,
  numero       text not null,
  complemento  text,
  bairro       text not null,
  cidade       text not null,
  uf           text not null,
  lat          double precision,
  lng          double precision,
  geo_origem   text check (geo_origem in ('gps', 'endereco')),
  horario      text,
  obs          text,
  loja_id      uuid references auth.users(id) on delete set null,
  criado_em    timestamptz not null default now(),
  ativada_em   timestamptz
);
create index if not exists promotor_lojas_pid_ix on public.promotor_lojas (promotor_id, criado_em desc);
create index if not exists promotor_lojas_whats_ix on public.promotor_lojas (whats);
create index if not exists promotor_lojas_cnpj_ix on public.promotor_lojas (cnpj) where cnpj is not null;
alter table public.promotor_lojas enable row level security;
drop policy if exists "promotor vê as lojas que cadastrou" on public.promotor_lojas;
create policy "promotor vê as lojas que cadastrou" on public.promotor_lojas
  for select using (promotor_id = auth.uid());
grant select on public.promotor_lojas to authenticated;

-- ---------- 3. Promotor salva a loja ----------
-- Recusa loja repetida: mesmo WhatsApp ou CNPJ de uma loja que já usa o Cadernex,
-- ou de um cadastro de outro promotor feito nos últimos 30 dias e ainda não ativado.
create or replace function public.promotor_loja_salvar(d jsonb)
returns json language plpgsql security definer set search_path = public as $$
declare me perfis; w text; c text; cep text; tk text; alfa text := 'abcdefghjkmnpqrstuvwxyz23456789'; i int; novo promotor_lojas;
  t text;
begin
  if auth.uid() is null then raise exception 'login'; end if;
  select * into me from perfis where user_id = auth.uid();
  if not found or not me.promotor then raise exception 'nao_promotor'; end if;
  if coalesce(me.bloqueado, false) then raise exception 'bloqueado'; end if;

  w := regexp_replace(coalesce(d->>'whats', ''), '\D', '', 'g');
  c := nullif(regexp_replace(coalesce(d->>'cnpj', ''), '\D', '', 'g'), '');
  cep := regexp_replace(coalesce(d->>'cep', ''), '\D', '', 'g');
  foreach t in array array['nome', 'responsavel', 'rua', 'numero', 'bairro', 'cidade'] loop
    if length(trim(coalesce(d->>t, ''))) < 1 then raise exception 'falta_%', t; end if;
  end loop;
  if length(w) not in (10, 11) then raise exception 'whats'; end if;
  if length(cep) <> 8 then raise exception 'cep'; end if;
  if c is not null and length(c) <> 14 then raise exception 'cnpj'; end if;
  if length(coalesce(d->>'uf', '')) <> 2 then raise exception 'falta_uf'; end if;

  -- loja que já usa o Cadernex
  if exists (select 1 from perfis p where p.loja and (
        regexp_replace(coalesce(p.loja_whats, ''), '\D', '', 'g') = w
     or (c is not null and regexp_replace(coalesce(p.loja_cnpj, ''), '\D', '', 'g') = c))) then
    raise exception 'loja_existe';
  end if;
  -- cadastro de outro promotor ainda valendo
  if exists (select 1 from promotor_lojas l where l.promotor_id <> auth.uid()
               and (l.status = 'ativa' or l.criado_em > now() - interval '30 days')
               and (l.whats = w or (c is not null and l.cnpj = c))) then
    raise exception 'outro_promotor';
  end if;
  -- o mesmo promotor não cadastra a mesma loja duas vezes
  if exists (select 1 from promotor_lojas l where l.promotor_id = auth.uid() and (l.whats = w or (c is not null and l.cnpj = c))) then
    raise exception 'repetida';
  end if;

  loop
    tk := '';
    for i in 1..10 loop tk := tk || substr(alfa, 1 + floor(random() * length(alfa))::int, 1); end loop;
    exit when not exists (select 1 from promotor_lojas where convite = tk);
  end loop;

  insert into promotor_lojas (promotor_id, convite, nome, ramo, responsavel, whats, telefone, email, cnpj, cep, rua, numero,
                              complemento, bairro, cidade, uf, lat, lng, geo_origem, horario, obs)
  values (auth.uid(), tk, left(trim(d->>'nome'), 60), nullif(trim(d->>'ramo'), ''), left(trim(d->>'responsavel'), 80), w,
          nullif(regexp_replace(coalesce(d->>'telefone', ''), '\D', '', 'g'), ''), nullif(lower(trim(d->>'email')), ''), c, cep,
          left(trim(d->>'rua'), 120), left(trim(d->>'numero'), 20), nullif(left(trim(d->>'complemento'), 60), ''),
          left(trim(d->>'bairro'), 60), left(trim(d->>'cidade'), 60), upper(d->>'uf'),
          nullif(d->>'lat', '')::double precision, nullif(d->>'lng', '')::double precision,
          case when d->>'lat' is null or d->>'lat' = '' then null else nullif(d->>'geo', '') end,
          nullif(left(trim(d->>'horario'), 60), ''), nullif(left(trim(d->>'obs'), 300), ''))
  returning * into novo;
  return json_build_object('id', novo.id, 'convite', novo.convite);
end $$;

-- promotor apaga um cadastro que a loja ainda não ativou
create or replace function public.promotor_loja_apagar(lid bigint)
returns void language plpgsql security definer set search_path = public as $$
begin
  delete from promotor_lojas where id = lid and promotor_id = auth.uid() and status = 'pendente';
  if not found then raise exception 'nao_apaga'; end if;
end $$;

-- ---------- 4. A loja ativa o convite ----------
-- Copia os dados para o perfil da loja e liga ao promotor (se a conta ainda não tem promotor).
create or replace function public.promotor_loja_aceitar(tk text)
returns text language plpgsql security definer set search_path = public as $$
declare me perfis; l promotor_lojas; p perfis; ende text;
begin
  if auth.uid() is null then raise exception 'login'; end if;
  select * into l from promotor_lojas where convite = lower(trim(tk)) for update;
  if not found then raise exception 'convite'; end if;
  if l.status = 'ativa' then
    if l.loja_id = auth.uid() then return 'ja_ativa'; end if;
    raise exception 'convite_usado';
  end if;
  if l.promotor_id = auth.uid() then raise exception 'proprio'; end if;
  select * into me from perfis where user_id = auth.uid();
  if not found then raise exception 'perfil'; end if;
  if me.indicado_por is not null and me.indicado_por <> l.promotor_id then raise exception 'ja_vinculada'; end if;
  select * into p from perfis where user_id = l.promotor_id;

  ende := l.rua || ', ' || l.numero || coalesce(' - ' || l.complemento, '');
  update perfis set
    tipo = coalesce(tipo, 'cliente'),
    nome = coalesce(nullif(nome, ''), l.responsavel),
    telefone = coalesce(nullif(telefone, ''), l.whats),
    loja = true, loja_nome = l.nome, loja_ramo = coalesce(l.ramo, loja_ramo),
    loja_end = ende, loja_bairro = l.bairro, loja_cep = l.cep, loja_cidade = l.cidade, loja_uf = l.uf,
    loja_lat = coalesce(l.lat, loja_lat), loja_lng = coalesce(l.lng, loja_lng),
    loja_whats = l.whats, loja_horario = coalesce(l.horario, loja_horario), loja_cnpj = coalesce(l.cnpj, loja_cnpj),
    loja_responsavel = l.responsavel, loja_email = coalesce(l.email, loja_email),
    end_padrao = coalesce(nullif(end_padrao, ''), ende),
    indicado_por = l.promotor_id, indicado_em = coalesce(indicado_em, now())
  where user_id = auth.uid();
  update promotor_lojas set status = 'ativa', loja_id = auth.uid(), ativada_em = now() where id = l.id;
  return coalesce(nullif(p.nome, ''), 'promotor');
end $$;

-- a loja vê de quem é o convite antes de criar a conta (só o nome da loja e do promotor)
create or replace function public.promotor_convite_info(tk text)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('loja', l.nome, 'promotor', coalesce(nullif(p.nome, ''), 'promotor'), 'status', l.status)
    from promotor_lojas l left join perfis p on p.user_id = l.promotor_id
   where l.convite = lower(trim(tk))
$$;

-- ---------- 5. Permissões ----------
revoke all on function public.promotor_loja_salvar(jsonb), public.promotor_loja_apagar(bigint),
  public.promotor_loja_aceitar(text) from public, anon;
grant execute on function public.promotor_loja_salvar(jsonb), public.promotor_loja_apagar(bigint),
  public.promotor_loja_aceitar(text) to authenticated;
revoke all on function public.promotor_convite_info(text) from public;
grant execute on function public.promotor_convite_info(text) to anon, authenticated;
