-- Cadernex — fecha funções internas que qualquer visitante podia chamar pela API.
-- backup_montar devolve o banco inteiro (e-mails, CPFs, endereços, pagamentos) sem conferir quem chama;
-- backup_auto, corrida_avisar e corridas_paradas disparam backup e notificações.
-- Quem usa essas funções continua funcionando: backup_admin (só moderador) e mudar_corrida rodam como dono do banco,
-- e as rotinas automáticas (cron) rodam como postgres.
-- Rodar uma vez no Supabase: SQL Editor → colar tudo → Run. Pode rodar de novo sem problema.

revoke execute on function public.backup_montar() from public, anon, authenticated;
revoke execute on function public.backup_auto() from public, anon, authenticated;
revoke execute on function public.corrida_avisar(public.corridas, text) from public, anon, authenticated;
revoke execute on function public.corridas_paradas() from public, anon, authenticated;
revoke execute on function public._promotor_mov(uuid) from public, anon, authenticated;
revoke execute on function public._promotor_saldo(uuid) from public, anon, authenticated;

-- conferência: tem que mostrar "não" nas duas colunas para todas
select p.proname as funcao,
       case when has_function_privilege('anon', p.oid, 'execute') then 'SIM' else 'não' end as visitante,
       case when has_function_privilege('authenticated', p.oid, 'execute') then 'SIM' else 'não' end as logado
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname in ('backup_montar','backup_auto','corrida_avisar','corridas_paradas','_promotor_mov','_promotor_saldo')
 order by 1;
