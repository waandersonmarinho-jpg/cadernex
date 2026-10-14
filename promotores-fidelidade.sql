-- Cadernex — Fidelidade (parte 4; rode depois das partes 1, 2 e 3)
-- A primeira entrega paga pelo app de cada loja é a fidelidade da loja com o Cadernex:
-- não gera comissão. O promotor ganha a partir da segunda entrega.
-- Rodar uma vez no Supabase: SQL Editor → colar tudo → Run. Pode rodar de novo sem problema.

create or replace function public._promotor_mov(p uuid)
returns table (loja_id uuid, quando timestamptz, origem text, taxa numeric, comissao numeric)
language sql stable security definer set search_path = public as $$
  with entregas as (
    select l.user_id loja, pg.pago_em quando,
           coalesce(pg.taxa_app, 0) + coalesce(pg.comissao, 0) taxa,
           row_number() over (partition by l.user_id order by pg.pago_em, pg.corrida_id) n
      from perfis l join pagamentos pg on pg.cliente_id = l.user_id
     where l.indicado_por = p and pg.status = 'pago'
       and pg.pago_em >= l.indicado_em and pg.pago_em < l.indicado_em + promotor_prazo()
  )
  -- a 1ª entrega de cada loja é da fidelidade com o Cadernex
  select loja, quando, 'entrega', taxa, taxa * promotor_taxa() from entregas where n > 1
  union all
  select l.user_id, e.pago_em, 'venda', coalesce(e.taxa_app, 0), coalesce(e.taxa_app, 0) * promotor_taxa()
    from perfis l join encomendas e on e.loja_id = l.user_id
   where l.indicado_por = p and e.pago_em is not null and e.status <> 'devolvida'
     and e.pago_em >= l.indicado_em and e.pago_em < l.indicado_em + promotor_prazo()
$$;
revoke all on function public._promotor_mov(uuid) from public, anon, authenticated;
