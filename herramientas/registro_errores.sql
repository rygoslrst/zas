-- ============================================================================
--  registro_errores.sql — dónde quedan anotados los errores del juego
-- ----------------------------------------------------------------------------
--  Si el juego falla en un teléfono (un error de JavaScript, o la página que
--  nunca termina de cargar), js/errores.js lo manda acá. Sin datos personales:
--  el mensaje, dónde pasó (archivo:línea), la página y el navegador.
--
--  Se corre una vez en el proyecto "zas" de Supabase (SQL Editor → pegar →
--  Run). Hasta que exista, el juego intenta anotar y no pasa nada.
--
--  Para mirar los errores: Table Editor → errores, o en el SQL Editor:
--      select creado, mensaje, donde, navegador from public.errores
--      order by creado desc limit 50;
-- ============================================================================

create table if not exists public.errores (
  id bigint generated always as identity primary key,
  creado timestamptz not null default now(),
  mensaje text not null check (char_length(mensaje) <= 300),
  donde text check (char_length(donde) <= 200),
  pagina text check (char_length(pagina) <= 120),
  navegador text check (char_length(navegador) <= 200)
);
create index if not exists errores_creado on public.errores (creado);
alter table public.errores enable row level security;
revoke all on public.errores from anon, authenticated;

-- El juego sólo puede anotar (no leer). Como mucho 200 por hora entre todos
-- (un error en bucle no llena la base) y se guardan los últimos 5000.
create or replace function public.anotar_error(p_mensaje text, p_donde text, p_pagina text, p_navegador text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.errores where creado > now() - interval '1 hour') >= 200 then
    return;
  end if;
  insert into public.errores (mensaje, donde, pagina, navegador)
  values (left(coalesce(nullif(p_mensaje, ''), '(sin mensaje)'), 300), left(p_donde, 200),
          left(p_pagina, 120), left(p_navegador, 200));
  delete from public.errores where id <= (select max(id) - 5000 from public.errores);
end $$;
revoke all on function public.anotar_error(text, text, text, text) from public, authenticated;
grant execute on function public.anotar_error(text, text, text, text) to anon;
