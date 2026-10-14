-- Cadernex — Lojista tem uma loja só (parte 5; rode depois das partes 1 a 4)
-- 1. Conta de loja não pode ser promotor (só o promotor cadastra várias lojas).
-- 2. Uma loja por WhatsApp e por CNPJ: não dá para abrir outra conta de loja com os mesmos dados.
-- Rodar uma vez no Supabase: SQL Editor → colar tudo → Run. Pode rodar de novo sem problema.

create or replace function public.perfis_uma_loja() returns trigger
language plpgsql security definer set search_path = public as $$
declare eh_loja boolean := coalesce(new.loja, false) and coalesce(trim(new.loja_nome), '') <> '';
  era_loja boolean := tg_op = 'UPDATE' and coalesce(old.loja, false) and coalesce(trim(old.loja_nome), '') <> '';
  w text := nullif(regexp_replace(coalesce(new.loja_whats, ''), '\D', '', 'g'), '');
  c text := nullif(regexp_replace(coalesce(new.loja_cnpj, ''), '\D', '', 'g'), '');
begin
  -- loja e promotor na mesma conta: não
  if eh_loja and coalesce(new.promotor, false)
     and (not era_loja or (tg_op = 'UPDATE' and not coalesce(old.promotor, false))) then
    raise exception 'loja_promotor';
  end if;
  -- outra conta de loja com o mesmo WhatsApp ou CNPJ: não
  if eh_loja and (w is not null or c is not null)
     and (tg_op = 'INSERT' or not era_loja
          or w is distinct from nullif(regexp_replace(coalesce(old.loja_whats, ''), '\D', '', 'g'), '')
          or c is distinct from nullif(regexp_replace(coalesce(old.loja_cnpj, ''), '\D', '', 'g'), '')) then
    if exists (select 1 from perfis p where p.user_id <> new.user_id and coalesce(p.loja, false)
                 and coalesce(trim(p.loja_nome), '') <> ''
                 and ((w is not null and regexp_replace(coalesce(p.loja_whats, ''), '\D', '', 'g') = w)
                   or (c is not null and regexp_replace(coalesce(p.loja_cnpj, ''), '\D', '', 'g') = c))) then
      raise exception 'loja_duplicada';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists perfis_uma_loja on public.perfis;
create trigger perfis_uma_loja before insert or update on public.perfis
  for each row execute function public.perfis_uma_loja();
