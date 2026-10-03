-- ============================================================================
--  tabla_en_linea.sql — la tabla de récords en línea (Supabase, proyecto "zas")
-- ----------------------------------------------------------------------------
--  Ya está aplicada en el proyecto (ref eouuvfqpktumfwlebmqz, región São
--  Paulo). Está acá como registro: si hubiera que rehacer el proyecto, se
--  corre entera en el SQL Editor de Supabase, después
--  herramientas/filtro_nombres/sincronizar.sql (las listas de palabras), y se
--  cambian URL y llave en js/tabla.js.
--
--  Idea: nadie entra directo a las tablas. El juego (rol "anon", con la llave
--  pública) sólo puede llamar a tres funciones:
--    mejores_records(cuantos)               → los primeros (10; 50 como mucho)
--    revisar_nombre(nombre)                 → el nombre como quedaría, o null
--                                             si no se puede usar
--    anotar_record(nombre, puntaje, rondas) → anota y devuelve el puesto
--  anotar_record rechaza puntajes imposibles, limpia el nombre (si es
--  prohibido, "JUGADOR") y acepta como mucho 20 anotaciones por minuto.
--
--  FILTRO DE NOMBRES (v5, 2026-10-03; el usuario pidió reforzarlo "lo más
--  posible"): las palabras prohibidas y las excepciones son DOS TABLAS que se
--  pueden ampliar desde el panel (Table Editor), escribiendo la palabra normal:
--  sus formas se calculan solas. Las listas base viven en
--  herramientas/filtro_nombres/*.txt (armar.py las pasa al juego y escribe
--  sincronizar.sql para la base). js/filtroNombres.js tiene una copia del
--  procedimiento: si se cambia acá, cambiarlo allá (y al revés), y probar con
--  herramientas/pruebas/filtro.html, que compara las dos.
--
--  MODERACIÓN: un nombre que se haya colado se puede
--    - tapar: agregando la palabra a palabras_prohibidas (la tabla lo muestra
--      como JUGADOR al instante, también en los puntajes viejos), o
--    - sacar: records → oculto = true (no se borra; se puede deshacer), o
--    - borrar: delete from public.records where nombre = 'NOMBRE';
--
--  OJO: el tope de puntaje depende de cómo se calcula en el juego
--  (Director.puntosPorMicro: un microjuego da como mucho 370, un jefe 1110).
--  Si se cambia el puntaje del juego, hay que cambiar el tope acá también.
-- ============================================================================

-- ---------------------------------------------------------------- récords
create table public.records (
  id bigint generated always as identity primary key,
  nombre text not null check (char_length(nombre) between 1 and 10),
  puntaje integer not null check (puntaje > 0 and puntaje % 10 = 0),
  rondas integer not null check (rondas between 1 and 500),
  creado timestamptz not null default now(),
  oculto boolean not null default false,
  constraint records_nombre_valido
    check (nombre ~ '^[A-ZÁÉÍÓÚÑÜ0-9]([A-ZÁÉÍÓÚÑÜ0-9 ]*[A-ZÁÉÍÓÚÑÜ0-9])?$')
);
comment on column public.records.oculto is
  'Marcar (true) para sacar este puntaje de la tabla sin borrarlo.';
create index records_orden on public.records (puntaje desc, rondas desc, creado asc);
create index records_creado on public.records (creado);
alter table public.records enable row level security;
revoke all on public.records from anon, authenticated;

-- ---------------------------------------------------------------- filtro
-- La forma canónica: lo que importa es cómo SUENA y se LEE. Mayúsculas, sin
-- tildes (la Ñ sí cuenta: AÑO no es ANO), números y símbolos que imitan letras
-- (P3N3, 5EX0, @), letras sueltas seguidas como una palabra (P U T A), letras
-- que suenan igual (C/K/QU, CE/SE, V/B, Z/S, Y/I, LL/Y, GE/JE, PH/F, X/CH como
-- en XUXA, HUE/GUE/WE), sin H muda y sin letras repetidas (PUUUTA), salvo RR
-- (PERRA no es PERA).
create or replace function public.forma_canonica(texto text) returns text
language plpgsql immutable set search_path = '' as $$
declare
  t text;
  w text;
  r text := '';
  suelta text := '';
begin
  t := upper(coalesce(texto, ''));
  t := translate(t, 'ÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÇ', 'AAAAAEEEEIIIIOOOOOUUUUC');
  t := translate(t, '0123456789@$!|€', 'OIZEASGTBGASIIE');
  t := regexp_replace(t, '[^A-ZÑ ]', '', 'g');
  -- Las letras sueltas seguidas forman una palabra
  foreach w in array regexp_split_to_array(btrim(t), '\s+') loop
    if char_length(w) = 1 then
      suelta := suelta || w;
    else
      if suelta <> '' then r := r || ' ' || suelta; suelta := ''; end if;
      if w <> '' then r := r || ' ' || w; end if;
    end if;
  end loop;
  if suelta <> '' then r := r || ' ' || suelta; end if;
  t := regexp_replace(r, '([AEIOU])\1+', '\1', 'g');
  t := replace(t, 'PH', 'F');
  t := replace(replace(t, 'CH', '#'), 'X', '#');
  t := replace(t, 'QU', 'K');
  t := replace(translate(t, 'VZY', 'BSI'), 'NB', 'MB');
  t := regexp_replace(t, 'C([EI])', 'S\1', 'g');
  -- HUE, GÜE, GUI, HUA...: suenan WE, WI, WA (también con una H metida: HUHEON)
  t := replace(regexp_replace(translate(t, 'CQ', 'KK'), '[HG]U([EIA])', 'W\1', 'g'), 'H', '');
  t := regexp_replace(t, 'GU([EIA])', 'W\1', 'g');
  t := regexp_replace(t, '(^|[ AEIOU])U([EIA])', '\1W\2', 'g');
  t := replace(regexp_replace(t, 'G([EI])', 'J\1', 'g'), '#', 'CH');
  t := regexp_replace(t, 'L{2,}', 'I', 'g');
  t := regexp_replace(t, 'R{2,}', '%', 'g');
  t := regexp_replace(t, '([A-ZÑ%])\1+', '\1', 'g');
  t := replace(t, '%', 'RR');
  return btrim(regexp_replace(t, '\s+', ' ', 'g'));
end $$;

create table public.palabras_prohibidas (
  palabra text primary key,
  entera boolean not null default false,
  al_reves boolean not null default false,
  forma text generated always as (public.forma_canonica(palabra)) stored,
  forma_reves text generated always as (public.forma_canonica(reverse(palabra))) stored,
  nota text
);
comment on table public.palabras_prohibidas is
  'Nombres prohibidos en la tabla de récords. entera = false: prohibida aunque esté dentro de otra palabra; true: sólo como palabra entera (para palabras muy cortas o comunes). al_reves = true: también escrita al revés, como palabra suelta (ATUP). Las de nota "lista: ..." vienen de herramientas/filtro_nombres/prohibidas.txt.';

create table public.palabras_permitidas (
  palabra text primary key,
  forma text generated always as (public.forma_canonica(palabra)) stored,
  nota text
);
comment on table public.palabras_permitidas is
  'Excepciones: nombres reales que contienen o se parecen a una palabra prohibida (PENÉLOPE, ÉPICO, VERGARA...). Las de 5 letras o más se perdonan aunque estén pegadas a otras.';

alter table public.palabras_prohibidas enable row level security;
alter table public.palabras_permitidas enable row level security;
revoke all on public.palabras_prohibidas from anon, authenticated;
revoke all on public.palabras_permitidas from anon, authenticated;

-- ¿Hay una prohibida en esta forma canónica? Se mira cada palabra y los
-- "tramos": palabras pegadas a la vecina cuando una de las dos es corta (así
-- PU TA y MARI CON se leen juntas, pero JOSÉ MÉNDEZ no). Las enteras y las
-- escritas al revés (ATUP) sólo como palabra suelta; las demás en cualquier
-- parte de un tramo, salvo que queden dentro de una permitida larga (PENÉLOPE
-- sí; PENELOPENE no).
create or replace function public.forma_prohibida(forma text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  palabras text[];
  tramos text[] := '{}';
  tramo text := '';
  previa text := '';
  w text;
begin
  select coalesce(array_agg(u.w order by u.i), '{}') into palabras
  from unnest(string_to_array(forma, ' ')) with ordinality as u(w, i)
  where u.w <> '' and not exists (select 1 from public.palabras_permitidas a where a.forma = u.w);
  foreach w in array palabras loop
    if tramo <> '' and char_length(previa) > 3 and char_length(w) > 3 then
      tramos := tramos || tramo;
      tramo := '';
    end if;
    tramo := tramo || w;
    previa := w;
  end loop;
  if tramo <> '' then tramos := tramos || tramo; end if;
  if cardinality(tramos) = 0 then return false; end if;
  if exists (select 1 from public.palabras_prohibidas p
             where (p.entera and p.forma <> '' and (p.forma = any(palabras) or p.forma = any(tramos)))
                or (p.al_reves and p.forma_reves <> '' and (p.forma_reves = any(palabras) or p.forma_reves = any(tramos)))) then
    return true;
  end if;
  return exists (
    select 1
    from unnest(tramos) as j(t)
    cross join public.palabras_prohibidas p
    cross join lateral generate_series(1, char_length(j.t) - char_length(p.forma) + 1) as s
    where not p.entera and p.forma <> ''
      and substr(j.t, s, char_length(p.forma)) = p.forma
      and not exists (
        select 1 from public.palabras_permitidas a
        cross join lateral generate_series(greatest(1, s + char_length(p.forma) - char_length(a.forma)), s) as k
        where char_length(a.forma) >= 5 and substr(j.t, k, char_length(a.forma)) = a.forma
      )
  );
end $$;

-- ¿El nombre tiene algo prohibido? Nada que parezca un teléfono, ni números o
-- siglas con mala fama; después, cada lectura posible (tal cual, el 1 como L,
-- la V como U, la LL como L) pasada a su forma canónica.
create or replace function public.nombre_prohibido(texto text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  crudo text;
  lecturas text[];
begin
  crudo := upper(coalesce(left(texto, 40), ''));
  if char_length(regexp_replace(crudo, '[^0-9]', '', 'g')) >= 7 then return true; end if;
  if crudo ~ '(^|[^0-9])(69|420|1488)([^0-9]|$)' or regexp_replace(crudo, '[^A-Z]', '', 'g') like '%KKK%' then
    return true;
  end if;
  lecturas := array[crudo];
  if crudo ~ '[1!|]' then
    lecturas := lecturas || array(select translate(v, '1!|', 'LLL') from unnest(lecturas) as v);
  end if;
  if strpos(crudo, 'V') > 0 then
    lecturas := lecturas || array(select replace(v, 'V', 'U') from unnest(lecturas) as v);
  end if;
  if strpos(crudo, 'LL') > 0 then
    lecturas := lecturas || array(select regexp_replace(v, 'L{2,}', 'L', 'g') from unnest(lecturas) as v);
  end if;
  return exists (select 1 from unnest(lecturas) as v where public.forma_prohibida(public.forma_canonica(v)));
end $$;

-- El nombre que se guarda: mayúsculas, letras/números/espacios, hasta 10.
-- Vacío o prohibido (lo escrito o cómo queda): "JUGADOR".
create or replace function public.limpiar_nombre(texto text) returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  n text;
begin
  n := upper(coalesce(texto, ''));
  n := regexp_replace(n, '[^A-ZÁÉÍÓÚÑÜ0-9 ]', '', 'g');
  n := btrim(regexp_replace(n, '\s+', ' ', 'g'));
  n := btrim(left(n, 10));
  if n = '' or public.nombre_prohibido(texto) or public.nombre_prohibido(n) then return 'JUGADOR'; end if;
  return n;
end $$;

-- Para el juego, antes de anotar: el nombre como quedaría, o null si no se
-- puede usar (así pide otro en vez de guardar "JUGADOR").
create or replace function public.revisar_nombre(p_nombre text) returns text
language plpgsql stable security definer set search_path = '' as $$
begin
  if public.nombre_prohibido(p_nombre) then return null; end if;
  return public.limpiar_nombre(p_nombre);
end $$;

-- ---------------------------------------------------------------- anotar y leer
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
    where not r.oculto
      and (r.puntaje > p_puntaje
           or (r.puntaje = p_puntaje and r.rondas > p_rondas)
           or (r.puntaje = p_puntaje and r.rondas = p_rondas and r.id < nuevo));
  return puesto;
end $$;

-- Los mejores, sin los ocultos. El nombre se revisa otra vez al leerlo: si
-- después se prohibió una palabra que tiene, sale como JUGADOR.
create or replace function public.mejores_records(cuantos integer default 10)
returns table (nombre text, puntaje integer, rondas integer, creado timestamptz)
language sql stable security definer set search_path = '' as $$
  select case when public.nombre_prohibido(r.nombre) then 'JUGADOR' else r.nombre end,
         r.puntaje, r.rondas, r.creado
  from (
    select x.nombre, x.puntaje, x.rondas, x.creado
    from public.records x
    where not x.oculto
    order by x.puntaje desc, x.rondas desc, x.creado asc
    limit least(greatest(coalesce(cuantos, 10), 1), 50)
  ) r
  order by r.puntaje desc, r.rondas desc, r.creado asc;
$$;

-- ---------------------------------------------------------------- permisos
revoke all on function public.forma_canonica(text) from public, anon, authenticated;
revoke all on function public.forma_prohibida(text) from public, anon, authenticated;
revoke all on function public.nombre_prohibido(text) from public, anon, authenticated;
revoke all on function public.limpiar_nombre(text) from public, anon, authenticated;
revoke all on function public.revisar_nombre(text) from public, authenticated;
revoke all on function public.anotar_record(text, integer, integer) from public, authenticated;
revoke all on function public.mejores_records(integer) from public, authenticated;
grant execute on function public.revisar_nombre(text) to anon;
grant execute on function public.anotar_record(text, integer, integer) to anon;
grant execute on function public.mejores_records(integer) to anon;

-- ---------------------------------------------------------------- listas
-- Correr herramientas/filtro_nombres/sincronizar.sql (lo escribe armar.py).
