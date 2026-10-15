-- Cadernex — Limites do valor da corrida no banco
-- O cliente continua escolhendo quanto oferece (pode ficar abaixo do "valor justo"),
-- mas as regras que hoje só o app confere passam a valer também no servidor:
--   • mínimo de R$ 8,00 (o mesmo do app em pedidos, lotes, lojas e compras);
--   • teto de R$ 20.000 (evita erro de digitação virar cobrança absurda);
--   • distância, se informada, entre 0 e 2.000 km;
--   • frete: ajudantes de 0 a 10 e andares de 0 a 50.
-- Vale para o insert do app e também para as funções (aumentar_valor etc.).
-- Corridas antigas não são mexidas.
-- Rodar uma vez no Supabase: SQL Editor → colar tudo → Run. Pode rodar de novo sem problema.

create or replace function public.corridas_valor_ok() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.valor is null or new.valor < 8 then
    raise exception 'O valor mínimo da corrida é R$ 8,00.' using errcode = 'check_violation';
  end if;
  if new.valor > 20000 then
    raise exception 'Valor da corrida alto demais. Confira o valor digitado.' using errcode = 'check_violation';
  end if;
  if new.distancia_km is not null and (new.distancia_km < 0 or new.distancia_km > 2000) then
    raise exception 'Distância inválida. Confira os endereços.' using errcode = 'check_violation';
  end if;
  if coalesce(new.ajudantes, 0) not between 0 and 10 or coalesce(new.andares, 0) not between 0 and 50 then
    raise exception 'Número de ajudantes ou andares inválido.' using errcode = 'check_violation';
  end if;
  return new;
end $$;

drop trigger if exists corridas_valor_ok on public.corridas;
create trigger corridas_valor_ok before insert or update of valor, distancia_km, ajudantes, andares on public.corridas
  for each row execute function public.corridas_valor_ok();
