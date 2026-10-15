-- Cadernex — Pix do entregador (botão "Ver Pix do entregador" no pix.js)
-- Devolve a chave Pix (CPF) e o nome do titular SÓ para o cliente daquela corrida,
-- só depois que um entregador aceitou, e só se o entregador ativou o Pix.
-- Corrida entregue: a chave fica visível por mais 7 dias (para pagar depois). Cancelada ou aberta: nunca.
-- Rodar uma vez no Supabase: SQL Editor → colar tudo → Run. Pode rodar de novo sem problema.

create or replace function public.pix_da_corrida(cid uuid)
returns table (chave text, titular text)
language sql stable security definer set search_path = public as $$
  select regexp_replace(d.cpf, '\D', '', 'g'), d.nome_completo
    from corridas c join dados_pessoais d on d.user_id = c.entregador_id
   where c.id = cid
     and c.cliente_id = auth.uid()
     and c.status in ('aceita', 'coletada', 'entregue')
     and (c.status <> 'entregue' or c.entregue_em > now() - interval '7 days')
     and d.pix_ativo
     and coalesce(d.cpf, '') <> ''
$$;
revoke all on function public.pix_da_corrida(uuid) from public, anon;
grant execute on function public.pix_da_corrida(uuid) to authenticated;
