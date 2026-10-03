"""Arma las listas del filtro de nombres a partir de prohibidas.txt y permitidas.txt.

    python herramientas/filtro_nombres/armar.py

1. Copia las listas en js/filtroNombres.js (entre <listas> y </listas>).
2. Escribe sincronizar.sql, que pone las mismas listas en la base de datos
   (Supabase → SQL Editor, o execute_sql). Sólo toca las palabras que vienen
   de estos archivos (nota "lista: ..."); las agregadas a mano en el panel
   quedan como están.

Después: probar con herramientas/pruebas/filtro.html (ver el LEEME de pruebas).
"""
import hashlib
import re
import sys
from pathlib import Path

AQUI = Path(__file__).resolve().parent
RAIZ = AQUI.parent.parent
JS = RAIZ / 'js' / 'filtroNombres.js'
LETRAS = re.compile(r'^[A-ZÁÉÍÓÚÑÜ]+$')


def leer(nombre, con_marcas):
    """Devuelve [(palabra, entera, al_reves, tema)] y avisa de errores."""
    filas, vistas, errores = [], set(), []
    tema = ''
    for n, linea in enumerate((AQUI / nombre).read_text(encoding='utf-8').splitlines(), 1):
        linea = linea.strip()
        if linea.startswith('## '):
            tema = linea[3:].strip()
            continue
        if not linea or linea.startswith('#'):
            continue
        palabra = linea.upper()
        entera = al_reves = False
        while con_marcas and palabra[-1:] in ('*', '~'):
            entera |= palabra[-1] == '*'
            al_reves |= palabra[-1] == '~'
            palabra = palabra[:-1]
        if not LETRAS.match(palabra):
            errores.append(f'{nombre}:{n}: "{linea}" (sólo letras, y al final * o ~)')
        elif palabra in vistas:
            errores.append(f'{nombre}:{n}: "{palabra}" está repetida')
        vistas.add(palabra)
        filas.append((palabra, entera, al_reves, tema))
    return filas, errores


def lista_js(nombre, items):
    texto = ','.join(items)
    trozos, actual = [], ''
    for item in texto.split(','):
        if actual and len(actual) + len(item) > 96:
            trozos.append(actual + ',')
            actual = ''
        actual += ('' if not actual else ',') + item
    trozos.append(actual)
    cuerpo = ' +\n  '.join(f"'{t}'" for t in trozos)
    return f"const {nombre} = (\n  {cuerpo}).split(',');"


def sql_texto(s):
    return "'" + s.replace("'", "''") + "'"


def main():
    prohibidas, e1 = leer('prohibidas.txt', True)
    permitidas, e2 = leer('permitidas.txt', False)
    if e1 or e2:
        print('\n'.join(e1 + e2))
        sys.exit(1)

    # 1. js/filtroNombres.js
    marcas = [p + ('*' if e else '') + ('~' if r else '') for p, e, r, _ in prohibidas]
    bloque = ('// <listas> — generado por herramientas/filtro_nombres/armar.py: no editar a mano\n'
              + lista_js('PROHIBIDAS', marcas) + '\n'
              + lista_js('PERMITIDAS', [p for p, *_ in permitidas]) + '\n'
              + '// </listas>')
    js = JS.read_text(encoding='utf-8')
    js, n = re.subn(r'// <listas>.*?// </listas>', lambda _: bloque, js, flags=re.S)
    if n != 1:
        sys.exit('No encontré las marcas <listas> en js/filtroNombres.js')
    JS.write_text(js, encoding='utf-8')

    # 2. sincronizar.sql: una línea por tema, con las marcas * y ~ como en el archivo
    def por_tema(filas, con_marcas):
        temas = {}
        for p, e, r, tema in filas:
            temas.setdefault(tema, []).append(p + ('*' if con_marcas and e else '') + ('~' if con_marcas and r else ''))
        return ',\n'.join(f'  ({sql_texto(t)}, {sql_texto(",".join(ws))})' for t, ws in temas.items())
    sql = [
        '-- Generado por herramientas/filtro_nombres/armar.py (no editar a mano).',
        '-- Pone en la base las listas de prohibidas.txt y permitidas.txt. Las',
        '-- palabras agregadas a mano en el panel (con una nota que no empieza con',
        '-- "lista:") no se tocan.',
        'begin;',
        'create temp table lista_p on commit drop as',
        "select regexp_replace(w, '[*~]', '', 'g') as palabra, w like '%*%' as entera, w like '%~%' as al_reves,",
        "       'lista: ' || v.tema as nota",
        'from (values',
        por_tema(prohibidas, True),
        ') as v(tema, ws), unnest(string_to_array(v.ws, \',\')) as w;',
        "delete from public.palabras_prohibidas where nota like 'lista:%' and palabra not in (select palabra from lista_p);",
        'insert into public.palabras_prohibidas (palabra, entera, al_reves, nota) select * from lista_p',
        'on conflict (palabra) do update set entera = excluded.entera, al_reves = excluded.al_reves, nota = excluded.nota;',
        'create temp table lista_a on commit drop as',
        "select w as palabra, 'lista: ' || v.tema as nota",
        'from (values',
        por_tema(permitidas, False),
        ') as v(tema, ws), unnest(string_to_array(v.ws, \',\')) as w;',
        "delete from public.palabras_permitidas where nota like 'lista:%' and palabra not in (select palabra from lista_a);",
        'insert into public.palabras_permitidas (palabra, nota) select * from lista_a',
        'on conflict (palabra) do update set nota = excluded.nota;',
        'commit;',
    ]
    (AQUI / 'sincronizar.sql').write_text('\n'.join(sql) + '\n', encoding='utf-8')
    print(f'{len(prohibidas)} prohibidas, {len(permitidas)} permitidas → js/filtroNombres.js y sincronizar.sql')

    # 3. Huella, para confirmar que la base quedó igual que los archivos
    def huella(filas, linea):
        filas = sorted(filas, key=lambda f: f[0].encode('utf-8'))          # como collate "C"
        return hashlib.md5('\n'.join(map(linea, filas)).encode('utf-8')).hexdigest()
    print('huella prohibidas:', huella(prohibidas, lambda f: f'{f[0]}|{str(f[1]).lower()}|{str(f[2]).lower()}'))
    print('huella permitidas:', huella(permitidas, lambda f: f[0]))
    print('en la base:', HUELLA_SQL)


HUELLA_SQL = ("select md5(string_agg(palabra || '|' || entera || '|' || al_reves, E'\\n' order by palabra collate \"C\")) "
              "from public.palabras_prohibidas where nota like 'lista:%' union all "
              "select md5(string_agg(palabra, E'\\n' order by palabra collate \"C\")) "
              "from public.palabras_permitidas where nota like 'lista:%';")


if __name__ == '__main__':
    main()
