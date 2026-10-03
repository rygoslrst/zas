-- ============================================================================
--  tabla_en_linea.sql — la tabla de récords en línea (Supabase, proyecto "zas")
-- ----------------------------------------------------------------------------
--  Ya está aplicada en el proyecto (ref eouuvfqpktumfwlebmqz, región São
--  Paulo). Está acá como registro: si hubiera que rehacer el proyecto, se
--  corre entera en el SQL Editor de Supabase y se cambian URL y llave en
--  js/tabla.js.
--
--  Idea: nadie entra directo a la tabla. El juego (rol "anon", con la llave
--  pública) sólo puede llamar a dos funciones:
--    mejores_records(cuantos)  → los primeros (10 por defecto, 50 como mucho)
--    anotar_record(nombre, puntaje, rondas) → anota y devuelve el puesto.
--  anotar_record rechaza puntajes imposibles, limpia el nombre (groserías →
--  JUGADOR) y acepta como mucho 20 anotaciones por minuto entre todos.
--
--  OJO: el tope de puntaje depende de cómo se calcula en el juego
--  (Director.puntosPorMicro: un microjuego da como mucho 370, un jefe 1110).
--  Si se cambia el puntaje del juego, hay que cambiar el tope acá también.
--
--  Para borrar un puntaje trucho: Supabase → proyecto zas → Table Editor →
--  records → marcar la fila → Delete. O en el SQL Editor:
--    delete from public.records where nombre = 'NOMBRE';
-- ============================================================================

create table public.records (
  id bigint generated always as identity primary key,
  nombre text not null check (char_length(nombre) between 1 and 10),
  puntaje integer not null check (puntaje > 0 and puntaje % 10 = 0),
  rondas integer not null check (rondas between 1 and 500),
  creado timestamptz not null default now()
);
create index records_orden on public.records (puntaje desc, rondas desc, creado asc);
create index records_creado on public.records (creado);

alter table public.records enable row level security;
revoke all on public.records from anon, authenticated;

-- Nombre limpio: mayúsculas, letras/números/espacios, hasta 10; groserías → JUGADOR
create or replace function public.limpiar_nombre(texto text) returns text
language plpgsql immutable set search_path = '' as $$
declare
  n text;
  plano text;
begin
  n := upper(coalesce(texto, ''));
  n := regexp_replace(n, '[^A-ZÁÉÍÓÚÑÜ0-9 ]', '', 'g');
  n := btrim(regexp_replace(n, '\s+', ' ', 'g'));
  n := btrim(left(n, 10));
  if n = '' then return 'JUGADOR'; end if;
  plano := translate(n, 'ÁÉÍÓÚÜÑ013457', 'AEIOUUNOIEAST');
  if replace(plano, ' ', '') ~ '(PUTA|PUTO|MIERDA|CULIA|CTM|CHUCHA|WEON|HUEON|HUEVON|AWEON|MARICON|MARACO|VERGA|PICHULA|ZORRA|NAZI|CABRON|PENDEJ|POLLA|QLO)'
     or string_to_array(plano, ' ') && array['CULO','CONCHA','PENE','PICO','PERRA','CACA','SEXO','CONO','JOTO','NALGA','TETA','TETAS','CHUPA','CHUPALA'] then
    return 'JUGADOR';
  end if;
  return n;
end $$;

create or replace function public.anotar_record(p_nombre text, p_puntaje integer, p_rondas integer)
returns integer language plpgsql security definer set search_path = '' as $$
declare
  nuevo bigint;
  puesto integer;
begin
  if p_rondas is null or p_rondas < 1 or p_rondas > 500
     or p_puntaje is null or p_puntaje <= 0 or p_puntaje % 10 <> 0
     or p_puntaje > p_rondas * 370 + ((p_rondas + 8) / 12 + 1) * 740 then
    raise exception 'puntaje imposible';
  end if;
  if (select count(*) from public.records where creado > now() - interval '1 minute') >= 20 then
    raise exception 'demasiadas anotaciones: espera un momento';
  end if;
  insert into public.records (nombre, puntaje, rondas)
    values (public.limpiar_nombre(p_nombre), p_puntaje, p_rondas)
    returning id into nuevo;
  select count(*) + 1 into puesto from public.records r
    where r.puntaje > p_puntaje
       or (r.puntaje = p_puntaje and r.rondas > p_rondas)
       or (r.puntaje = p_puntaje and r.rondas = p_rondas and r.id < nuevo);
  return puesto;
end $$;

create or replace function public.mejores_records(cuantos integer default 10)
returns table (nombre text, puntaje integer, rondas integer, creado timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.nombre, r.puntaje, r.rondas, r.creado
  from public.records r
  order by r.puntaje desc, r.rondas desc, r.creado asc
  limit least(greatest(coalesce(cuantos, 10), 1), 50);
$$;

revoke all on function public.limpiar_nombre(text) from public, anon, authenticated;
revoke all on function public.anotar_record(text, integer, integer) from public, authenticated;
revoke all on function public.mejores_records(integer) from public, authenticated;
grant execute on function public.anotar_record(text, integer, integer) to anon;
grant execute on function public.mejores_records(integer) to anon;
