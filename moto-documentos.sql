-- Cadernex — Documentos da moto: número e categoria da CNH (categoria A). Moto não pede placa.
-- O motoboy só fica disponível de moto depois de cadastrar a CNH. Frete continua pedindo placa.
-- O moderador vê a CNH (e a placa dos fretes) no painel de Cadastros.
-- Quem já está disponível continua; o pedido aparece na próxima vez que ficar disponível ou trocar de veículo.
-- Rodar uma vez no Supabase: SQL Editor → colar tudo → Run. Pode rodar de novo sem problema.

-- ---------- 1. Tabela de veículos aceita moto e número da CNH ----------
alter table public.veiculos add column if not exists cnh_numero text;
alter table public.veiculos alter column placa drop not null;
alter table public.veiculos drop constraint if exists veiculos_tipo_check;
alter table public.veiculos add constraint veiculos_tipo_check check (tipo in ('moto', 'picape_p', 'picape_m', 'caminhao'));
alter table public.veiculos drop constraint if exists veiculos_cnh_check;
alter table public.veiculos add constraint veiculos_cnh_check check (cnh is null or cnh in ('A', 'B', 'C', 'D', 'E', 'AB', 'AC', 'AD', 'AE'));
alter table public.veiculos drop constraint if exists veiculos_cnh_numero_check;
alter table public.veiculos add constraint veiculos_cnh_numero_check check (cnh_numero is null or cnh_numero ~ '^[0-9]{11}$');

-- ---------- 2. Confere os dados ao salvar ----------
create or replace function public.preparar_veiculo() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.user_id := auth.uid();
  new.placa := nullif(upper(regexp_replace(coalesce(new.placa, ''), '[^A-Za-z0-9]', '', 'g')), '');
  new.rntrc := nullif(regexp_replace(coalesce(new.rntrc, ''), '[^0-9]', '', 'g'), '');
  new.cnh := nullif(upper(trim(coalesce(new.cnh, ''))), '');
  new.cnh_numero := nullif(regexp_replace(coalesce(new.cnh_numero, ''), '[^0-9]', '', 'g'), '');
  if new.tipo <> 'moto' and (new.placa is null or new.placa !~ '^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$') then
    raise exception 'Placa inválida. Use o formato ABC1234 ou ABC1D23.'; end if;
  if new.cnh_numero is not null and (length(new.cnh_numero) <> 11 or new.cnh_numero ~ '^(\d)\1{10}$') then
    raise exception 'Número da CNH inválido: são 11 números.'; end if;
  if new.tipo = 'moto' then
    if new.cnh is null or position('A' in new.cnh) = 0 then raise exception 'Pra moto, a CNH precisa ter categoria A.'; end if;
    if new.cnh_numero is null then raise exception 'Coloque o número da sua CNH (11 números).'; end if;
    new.rntrc := null; new.placa := null; -- moto: só CNH
  end if;
  if new.cnh_numero is not null and exists (select 1 from public.veiculos v where v.cnh_numero = new.cnh_numero and v.user_id <> new.user_id) then
    raise exception 'Essa CNH já está cadastrada em outra conta.'; end if;
  new.atualizado_em := now();
  return new;
end $$;

-- ---------- 3. Moto só fica disponível com CNH ----------
create or replace function public.checar_veiculo(v text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from storage.objects where bucket_id = 'veiculos' and name = auth.uid()::text || '/' || v || '.jpg') then
    raise exception 'Mande uma foto do seu veículo antes de ficar disponível.'; end if;
  if v in ('picape_p', 'picape_m', 'caminhao') and not exists (select 1 from public.veiculos where user_id = auth.uid() and tipo = v) then
    raise exception 'Cadastre a placa do veículo antes.'; end if;
  if v = 'moto' and (select nascimento from public.dados_pessoais where user_id = auth.uid()) > (current_date - interval '21 years') then
    raise exception 'Moto só com 21 anos ou mais (Lei 12.009/2009). De bike você já pode.'; end if;
  if v = 'moto' and not exists (select 1 from public.veiculos where user_id = auth.uid() and tipo = 'moto' and cnh_numero is not null) then
    raise exception 'Cadastre a sua CNH antes de ficar disponível de moto.'; end if;
end $$;

-- ---------- 4. Painel de Cadastros mostra CNH e placa (frete) ----------
drop function if exists public.cadastros_admin();
create function public.cadastros_admin()
returns table (user_id uuid, nome text, email text, tipo text, loja boolean, loja_nome text, bairro text, whats text,
               criado_em timestamptz, ultimo_acesso timestamptz, veiculos text[], documentos boolean, mp boolean,
               bloqueado boolean, entregas bigint, pedidos bigint, docs_veiculo text)
language plpgsql security definer set search_path = public as $$
begin
  if not public.eh_admin() then raise exception 'Só o moderador.'; end if;
  return query
    select p.user_id, coalesce(nullif(d.nome_completo, ''), p.nome), u.email::text, p.tipo,
           coalesce(p.loja, false), p.loja_nome, p.loja_bairro,
           coalesce(nullif(d.celular, ''), nullif(regexp_replace(coalesce(p.loja_whats, p.telefone, ''), '\D', '', 'g'), '')),
           u.created_at, u.last_sign_in_at,
           array(select replace(storage.filename(o.name), '.jpg', '') from storage.objects o
                   where o.bucket_id = 'veiculos' and (storage.foldername(o.name))[1] = p.user_id::text
                 union select v.tipo from public.veiculos v where v.user_id = p.user_id),
           d.user_id is not null,
           exists (select 1 from public.mp_contas m where m.user_id = p.user_id),
           p.bloqueado,
           (select count(*) from public.corridas c where c.entregador_id = p.user_id and c.status = 'entregue'),
           (select count(*) from public.corridas c where c.cliente_id = p.user_id),
           (select string_agg(initcap(replace(v.tipo, '_', ' ')) || coalesce(' ' || v.placa, '')
                              || coalesce(' · CNH ' || v.cnh, '') || coalesce(' nº ' || v.cnh_numero, ''), ' | ' order by v.tipo)
              from public.veiculos v where v.user_id = p.user_id)
    from public.perfis p
    join auth.users u on u.id = p.user_id
    left join public.dados_pessoais d on d.user_id = p.user_id
    order by u.created_at desc;
end $$;
revoke all on function public.cadastros_admin() from public, anon;
grant execute on function public.cadastros_admin() to authenticated;
