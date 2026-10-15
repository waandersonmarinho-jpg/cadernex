-- Cadernex — Selfie obrigatória do entregador
-- O entregador só fica disponível para corridas se tiver a selfie (foto do rosto) no perfil.
-- A selfie fica no mesmo lugar da foto de perfil: pasta privada "perfis", arquivo <id>/foto.jpg.
-- Rodar uma vez no Supabase: SQL Editor → colar tudo → Run. Pode rodar de novo sem problema.

create or replace function public.tem_selfie(u uuid) returns boolean
language sql stable security definer set search_path = public, storage as $$
  select exists (select 1 from storage.objects where bucket_id = 'perfis' and name = u::text || '/foto.jpg')
$$;
revoke all on function public.tem_selfie(uuid) from public, anon;
grant execute on function public.tem_selfie(uuid) to authenticated;

create or replace function public.disponiveis_exige_selfie() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if not tem_selfie(coalesce(new.user_id, auth.uid())) then
    raise exception 'Tire uma selfie no seu perfil para ficar disponível.';
  end if;
  return new;
end $$;
drop trigger if exists disponiveis_exige_selfie on public.disponiveis;
create trigger disponiveis_exige_selfie before insert or update of veiculo, regiao on public.disponiveis
  for each row execute function public.disponiveis_exige_selfie();
