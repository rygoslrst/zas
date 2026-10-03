# Filtro de nombres de la tabla de récords

El juego revisa el nombre apenas se escribe (`js/filtroNombres.js`) y la base
de datos lo revisa otra vez al guardarlo y al mostrar la tabla (Supabase,
proyecto **zas**). Las dos usan las mismas listas y el mismo procedimiento.

## Si se cuela un nombre durante el torneo

En el panel de Supabase (también funciona desde el celular):
**Table Editor** → proyecto **zas**.

- **Sacar un puntaje de la tabla:** tabla `records`, en esa fila marcar
  `oculto` = `true`. No se borra; se puede deshacer.
- **Prohibir una palabra para siempre:** tabla `palabras_prohibidas` →
  *Insert row*: escribir la palabra en `palabra` (normal, con o sin tildes).
  Si es corta o aparece dentro de nombres comunes, marcar `entera` = `true`
  (sólo cuenta como palabra suelta). Vale al instante, también para los
  puntajes que ya estaban: la tabla los muestra como JUGADOR.
- **Permitir un nombre real que el filtro rechaza:** tabla
  `palabras_permitidas` → *Insert row* con el nombre.

Lo que se agrega en el panel funciona enseguida en la base. El juego lo
aprende recién cuando se pase a los archivos de acá (abajo); mientras, la
base igual lo revisa al guardar.

## Cambiar las listas de verdad

1. Editar `prohibidas.txt` o `permitidas.txt` (al principio de cada uno está
   explicado el formato: `*` = sólo palabra entera, `~` = también al revés).
2. `python herramientas/filtro_nombres/armar.py` → actualiza
   `js/filtroNombres.js` y escribe `sincronizar.sql`.
3. Correr `sincronizar.sql` en Supabase (SQL Editor). Sólo toca las palabras
   de los archivos (nota "lista: ..."); las agregadas a mano quedan.
4. Probar (ver abajo) y publicar el juego.

`armar.py` imprime una "huella" de cada lista y la consulta que da la misma
huella en la base: si coinciden, el juego y la base tienen las mismas listas.

## Probar

Con el servidor (`python servidor.py`), abrir
`http://localhost:8124/herramientas/pruebas/filtro.html`:

- Revisa `deben_pasar.txt` (≈1.150 nombres reales), `deben_caer.txt` (≈370
  trucos) y unas 2.800 variantes armadas de cada palabra prohibida.
- **Comparar con la base de datos** manda cada nombre a Supabase y avisa si
  el juego y la base no opinan lo mismo.
- **Combinaciones naturales:** ~107.000 nombres como los escribiría un niño
  (nombre + apellido, inicial, año, dos nombres). Hoy caen 22 (0,02 %), casi
  todos pegados y donde de verdad se lee algo (PIPOTORRES, CHAPUTAPIA).
- Hay una caja para probar un nombre suelto y ver su "forma canónica".

## Lo que no atrapa (a propósito)

- Dos palabras largas separadas no se leen juntas (PASTA BASE, sí PASTABASE):
  si no, JOSÉ MÉNDEZ caería por SEMEN y DANTE TAPIA por TETA.
- Palabras cortas o comunes marcadas como enteras (TETA, NAZI, CACA, POLLA)
  no se buscan dentro de otras palabras (MITETA pasa).
- Trucos con letras de relleno (PUXTA) o deformaciones que cambian cómo se
  lee. Para eso está la moderación a mano de arriba.
