-- ============================================================================
--  tabla_en_linea.sql — la tabla de récords en línea (Supabase, proyecto "zas")
-- ----------------------------------------------------------------------------
--  Ya está aplicada en el proyecto (ref eouuvfqpktumfwlebmqz, región São
--  Paulo). Está acá como registro: si hubiera que rehacer el proyecto, se
--  corre entera en el SQL Editor de Supabase y se cambian URL y llave en
--  js/tabla.js.
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
--  FILTRO DE NOMBRES (v4, 2026-10-03; el usuario lo pidió "mucho" y después
--  "más filtros y entradas"):
--  las palabras prohibidas y las excepciones son DOS TABLAS que se pueden
--  ampliar desde el panel (Table Editor), escribiendo la palabra normal: su
--  forma canónica se calcula sola. js/filtroNombres.js tiene una copia del
--  procedimiento y una foto de las listas (para avisar al instante y sin red);
--  si se cambia el procedimiento, cambiarlo en los dos lados.
--
--  OJO: el tope de puntaje depende de cómo se calcula en el juego
--  (Director.puntosPorMicro: un microjuego da como mucho 370, un jefe 1110).
--  Si se cambia el puntaje del juego, hay que cambiar el tope acá también.
--
--  Para borrar un puntaje trucho: Table Editor → records → marcar → Delete,
--  o en el SQL Editor:  delete from public.records where nombre = 'NOMBRE';
-- ============================================================================

-- ---------------------------------------------------------------- récords
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

-- ---------------------------------------------------------------- filtro
-- La forma canónica: lo que importa es cómo SUENA. Mayúsculas, sin tildes (la
-- Ñ sí cuenta: AÑO no es ANO), números y símbolos que imitan letras (P3N3,
-- 5EX0, @), letras que suenan igual (C/K/QU, V/B, Z/S, Y/I, X/CH como en
-- XUXA, HUE/GUE/WE), sin H muda y sin letras repetidas (PUUUTA), salvo RR y
-- LL (PERRA no es PERA).
create or replace function public.forma_canonica(texto text) returns text
language plpgsql immutable set search_path = '' as $$
declare
  t text;
begin
  t := upper(coalesce(texto, ''));
  t := translate(t, 'ÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÇ', 'AAAAAEEEEIIIIOOOOOUUUUC');
  t := translate(t, '013456789@$!|€', 'OIEASGTBGASIIE');
  t := regexp_replace(t, '[^A-ZÑ ]', '', 'g');
  t := replace(t, 'CH', '#');
  t := replace(t, 'X', '#');
  t := replace(t, 'QU', 'K');
  t := translate(t, 'CQVZY', 'KKBSI');
  t := replace(t, 'HUE', 'WE');
  t := replace(t, 'HUI', 'WI');
  t := replace(t, 'GUE', 'WE');
  t := replace(t, 'GUI', 'WI');
  t := replace(t, 'H', '');
  t := replace(t, '#', 'CH');
  t := regexp_replace(t, 'R{2,}', '%', 'g');
  t := regexp_replace(t, 'L{2,}', '&', 'g');
  t := regexp_replace(t, '([A-ZÑ%&])\1+', '\1', 'g');
  t := replace(replace(t, '%', 'RR'), '&', 'LL');
  t := btrim(regexp_replace(t, '\s+', ' ', 'g'));
  return t;
end $$;

create table public.palabras_prohibidas (
  palabra text primary key,
  entera boolean not null default false,
  forma text generated always as (public.forma_canonica(palabra)) stored,
  nota text
);
comment on table public.palabras_prohibidas is
  'Nombres prohibidos en la tabla de récords. entera = false: prohibida aunque esté dentro de otra palabra; true: sólo como palabra entera (para palabras muy cortas o comunes).';

create table public.palabras_permitidas (
  palabra text primary key,
  forma text generated always as (public.forma_canonica(palabra)) stored,
  nota text
);
comment on table public.palabras_permitidas is
  'Excepciones: nombres reales que contienen o se parecen a una palabra prohibida (PENÉLOPE, ÉPICO, SORA...). Las de 5 letras o más se perdonan aunque estén pegadas a otras.';

alter table public.palabras_prohibidas enable row level security;
alter table public.palabras_permitidas enable row level security;
revoke all on public.palabras_prohibidas from anon, authenticated;
revoke all on public.palabras_permitidas from anon, authenticated;

-- La búsqueda en sí, sobre el nombre junto y sus palabras. Una aparición se
-- perdona sólo si queda entera dentro de una permitida larga (PENÉLOPE sí,
-- PENELOPENE no).
create or replace function public.contiene_prohibida(junto text, palabras text[]) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  p record;
  inicio integer;
  pos integer;
begin
  for p in select forma, entera from public.palabras_prohibidas where forma <> '' loop
    if p.entera then
      if p.forma = any(palabras) or p.forma = junto then return true; end if;
    else
      inicio := 1;
      loop
        pos := strpos(substr(junto, inicio), p.forma);
        exit when pos = 0;
        pos := inicio + pos - 1;
        if not exists (
          select 1 from public.palabras_permitidas a
          cross join generate_series(1, greatest(char_length(junto) - char_length(a.forma) + 1, 0)) as s
          where char_length(a.forma) >= 5
            and substr(junto, s, char_length(a.forma)) = a.forma
            and s <= pos and s + char_length(a.forma) >= pos + char_length(p.forma)
        ) then
          return true;
        end if;
        inicio := pos + 1;
      end loop;
    end if;
  end loop;
  return false;
end $$;

-- ¿El nombre tiene algo prohibido? Nada que parezca un teléfono, ni números o
-- siglas con mala fama; después, las palabras (sin las permitidas sueltas),
-- todo junto (atrapa "P U T A" y "MIPENE") y cada palabra al revés (ATUP).
create or replace function public.nombre_prohibido(texto text) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  crudo text;
  palabras text[];
  junto text;
  w text;
begin
  crudo := upper(coalesce(left(texto, 40), ''));
  if char_length(regexp_replace(crudo, '[^0-9]', '', 'g')) >= 7 then return true; end if;
  if crudo ~ '(^|[^0-9])(69|420|1488)([^0-9]|$)' or regexp_replace(crudo, '[^A-Z]', '', 'g') like '%KKK%' then
    return true;
  end if;
  select coalesce(array_agg(u.w order by u.i), '{}') into palabras
  from unnest(string_to_array(public.forma_canonica(crudo), ' ')) with ordinality as u(w, i)
  where u.w <> '' and not exists (select 1 from public.palabras_permitidas a where a.forma = u.w);
  junto := array_to_string(palabras, '');
  if junto = '' then return false; end if;
  if public.contiene_prohibida(junto, palabras) then return true; end if;
  foreach w in array palabras loop
    if exists (
      select 1 from public.palabras_prohibidas p
      where char_length(p.forma) >= 4
        and ((not p.entera and position(p.forma in reverse(w)) > 0) or (p.entera and p.forma = reverse(w)))
    ) then
      return true;
    end if;
  end loop;
  return false;
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

-- ---------------------------------------------------------------- permisos
revoke all on function public.forma_canonica(text) from public, anon, authenticated;
revoke all on function public.contiene_prohibida(text, text[]) from public, anon, authenticated;
revoke all on function public.nombre_prohibido(text) from public, anon, authenticated;
revoke all on function public.limpiar_nombre(text) from public, anon, authenticated;
revoke all on function public.revisar_nombre(text) from public, authenticated;
revoke all on function public.anotar_record(text, integer, integer) from public, authenticated;
revoke all on function public.mejores_records(integer) from public, authenticated;
grant execute on function public.revisar_nombre(text) to anon;
grant execute on function public.anotar_record(text, integer, integer) to anon;
grant execute on function public.mejores_records(integer) to anon;

-- ---------------------------------------------------------------- listas
-- (las mismas que js/filtroNombres.js; ampliables desde el panel)
insert into public.palabras_prohibidas (palabra, entera)
select trim(trailing '*' from w), w like '%*'
from unnest(string_to_array(
  'ANAL*,ANO*,ANUS*,ASSHOLE*,AWEONAO,BASTARD,BITCH,BOLUD,BOLUDO,BOOBS*,CABRON,CACA,CACHOND,CACHONDO,' ||
  'CAGADA,CAGAO,CAGAR,CAGON,CALLAMPA,CAMIONA,CARAJO,CHINGA,CHOTA*,CHUCHA,CHUCHETUMARE,CHUPA*,CHUPALA,' ||
  'CHUPALO,CHUPAME,CHUPAMELA,CHUPAPICO,CLITORI,COCAINA,COCK*,COJONES,COLIZA,CONCHA,CONCHESUMADRE,' ||
  'CONCHESUMARE,CONCHETUMADRE,CONCHETUMARE,CONCHUD,CONDON,CONO*,COÑO*,CORNUD,CORNUDO,CSM,CSMRE*,CSTM*,' ||
  'CTM,CTMR*,CTMRE*,CULEAR,CULER,CULERO,CULIA,CULIAD,CULIAO,CULIAR,CULICAGADO,CULITO,CULO,CUNT,DESNUD,' ||
  'DICK*,ESCROTO,ESPERMA,ESTUPIDA,ESTUPIDO,EYACUL,FAGGOT,FCK*,FELACION,FEMBOY,FLETO,FOLLAR,FUCK,' ||
  'GILIPOLLAS,GONORREA,HDLGP*,HDP*,HITLER,HORNY*,HUEVADA,HUEVEO,IDIOTA,IMBECIL,JOTO*,LACRA,LAMEME,LCTM*,' ||
  'LPM*,MALPARID,MALPARIDO,MAMADA,MAMAGUEBO,MAMAME,MAMAR*,MARACA*,MARACO,MARICA,MARICON,MARIGUANA,' ||
  'MARIHUANA,MASTURB,MIERD,MIERDA,MILF,MONGO*,MONGOLICO,MRD*,NALGA,NAZI,NECROFIL,NEGRATA,NEPE,NIGGA,' ||
  'NIGGER,NUDES,OJETE,ORGASM,PAJA,PAJEAR,PAJERA,PAJERO,PAJIAR,PANOCHA,PEDO,PEDOFIL,PELOTUD,PELOTUDO,' ||
  'PENDEJ,PENE,PENIS,PERKIN,PERRA,PEZON,PICHULA,PICO,PINGA,PIRULA,POLLA,PORN,PORNO,POTO,PROSTITUT,PTM*,' ||
  'PUSSY*,PUTA,PUTEAR,PUTITA,PUTO,PUTONA,QL*,QLA*,QLIA,QLIAO,QLO*,RAJA*,RAPE*,RETRASADO,SACOWEA,SEMEN,' ||
  'SEXI,SEXO,SEXUAL,SHIT*,SIDA*,SIDOSO,SLUT,STFU*,SUBNORMAL,SUDACA,SUICID,TARADA,TARADO,TERRORIST,' ||
  'TESTICUL,TETA,TETAS,TETON,TETONA,TITS*,TORTILLERA,TRAGASABLE,TRAVELO,TROLO*,TULA*,TUMADRE,TUMARE,' ||
  'VAGIN,VAGINA,VERGA,VIOLADOR,VIOLAR,WEA*,WEAS*,WEBON,WEON,WHORE,WN*,WNA*,WNS*,WTF*,ZOOFIL,ZORRA,' ||
  'ZORRITA,ZORRON', ',')) as w;

insert into public.palabras_permitidas (palabra)
select w from unnest(string_to_array(
  'ANA,CACAO,CACATÚA,CHINGANA,COMPUTADOR,COMPUTADORA,CONCHALÍ,DISPUTA,ÉPICO,ESCULAPIO,ESPERANZA,KAKASHI,' ||
  'PAJARITO,PÁJARO,PENÉLOPE,PERA,PICCOLO,PICOLO,POLA,POTOSÍ,PUTAENDO,REPUTACIÓN,SORA,SORAYA,TÓPICO,' ||
  'TORPEDO,TRÓPICO', ',')) as w;
