// ============================================================================
//  filtroNombres.js — el filtro de nombres de la tabla de récords (copia local)
// ----------------------------------------------------------------------------
//  La regla de verdad vive en la base de datos (Supabase, proyecto "zas"):
//  la función nombre_prohibido y las tablas palabras_prohibidas y
//  palabras_permitidas, que se pueden ampliar desde el panel de Supabase sin
//  tocar el juego. Esta copia sirve para avisar al instante y cuando no hay
//  internet. Si se cambia el procedimiento, cambiarlo en los dos lados (ver
//  herramientas/tabla_en_linea.sql). Las listas de acá son una foto: las
//  palabras nuevas que se agreguen en Supabase valen igual (las revisa la
//  base de datos al guardar).
//
//  Cómo funciona:
//  1. Todo se lleva a una "forma canónica" que atiende a cómo SUENA el nombre:
//     mayúsculas, sin tildes (la Ñ sí cuenta: AÑO no es ANO), números y
//     símbolos que imitan letras (P3N3, 5EX0), letras que suenan igual (C/K/QU,
//     V/B, Z/S, Y/I, HUE/GUE/WE), sin H muda y sin letras repetidas (PUUUTA),
//     salvo RR y LL (PERRA no es PERA).
//  2. Se buscan las prohibidas en todo el nombre junto (atrapa "P U T A" y
//     "MIPENE"). Las marcadas con * sólo cuentan como palabra entera.
//  3. Una aparición se perdona si queda dentro de una palabra permitida
//     (PENÉLOPE, ÉPICO, PÁJARO...).
// ============================================================================

const PROHIBIDAS = ('ANAL*,ANO*,ASSHOLE*,AWEONAO,BITCH,CABRON,CACA,CAGADA,CAGAR,CAGON,CALLAMPA,CHUCHA,' +
  'CHUCHETUMARE,CHUPA*,CHUPALA,CHUPALO,CHUPAMELA,CHUPAPICO,CONCHA,CONCHESUMADRE,CONCHESUMARE,CONCHETUMADRE,' +
  'CONCHETUMARE,CONDON,CONO*,COÑO*,CSM,CTM,CTMR*,CULEAR,CULIA,CULIAO,CULIAR,CULICAGADO,CULITO,CULO,CUNT,DESNUD,' +
  'DICK*,ESPERMA,ESTUPIDA,ESTUPIDO,FAGGOT,FEMBOY,FOLLAR,FUCK,HITLER,IDIOTA,IMBECIL,LACRA,MAMADA,MAMAR*,MARACO,' +
  'MARICA,MARICON,MIERD,MIERDA,MONGO*,MONGOLICO,NAZI,NIGGA,NIGGER,ORGASM,PAJA,PAJERA,PAJERO,PEDO,PENDEJ,PENE,' +
  'PENIS,PERKIN,PERRA,PEZON,PICHULA,PICO,PIRULA,POLLA,PORNO,POTO,PUSSY*,PUTA,PUTITA,PUTO,QL*,QLIA,QLIAO,RAJA*,' +
  'RETRASADO,SACOWEA,SEMEN,SEXI,SEXO,SHIT*,SIDA*,SIDOSO,TARADA,TARADO,TETA,TETAS,TETON,TETONA,TRAVELO,TULA*,' +
  'TUMADRE,TUMARE,VAGIN,VAGINA,VERGA,VIOLADOR,VIOLAR,WEA*,WEBON,WEON,ZORRA,ZORRITA,ZORRON').split(',');

const PERMITIDAS = ('ANA,CACAO,CACATÚA,CONCHALÍ,ÉPICO,ESCULAPIO,ESPERANZA,KAKASHI,PAJARITO,PÁJARO,PENÉLOPE,' +
  'PERA,PICCOLO,PICOLO,POLA,POTOSÍ,SORA,SORAYA,TÓPICO,TORPEDO,TRÓPICO').split(',');

// Como translate() de SQL: cada letra de "de" pasa a la de la misma posición en "a"
function cambiar(texto, de, a) {
  let r = '';
  for (const c of texto) { const i = de.indexOf(c); r += i >= 0 ? a[i] : c; }
  return r;
}

export function formaCanonica(texto) {
  let t = String(texto || '').toUpperCase();
  t = cambiar(t, 'ÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÇ', 'AAAAAEEEEIIIIOOOOOUUUUC');
  t = cambiar(t, '013456789@$!|€', 'OIEASGTBGASIIE');
  t = t.replace(/[^A-ZÑ ]/g, '');
  t = t.replace(/CH/g, '#').replace(/QU/g, 'K');
  t = cambiar(t, 'CQVZY', 'KKBSI');
  t = t.replace(/HUE/g, 'WE').replace(/HUI/g, 'WI').replace(/GUE/g, 'WE').replace(/GUI/g, 'WI');
  t = t.replace(/H/g, '').replace(/#/g, 'CH');
  t = t.replace(/R{2,}/g, '%').replace(/L{2,}/g, '&');
  t = t.replace(/([A-ZÑ%&])\1+/g, '$1');
  t = t.replace(/%/g, 'RR').replace(/&/g, 'LL');
  return t.replace(/\s+/g, ' ').trim();
}

const FORMAS_PROHIBIDAS = PROHIBIDAS.map(p => ({ forma: formaCanonica(p.replace('*', '')), entera: p.endsWith('*') }));
const FORMAS_PERMITIDAS = PERMITIDAS.map(formaCanonica);
const PERMITIDAS_LARGAS = FORMAS_PERMITIDAS.filter(f => f.length >= 5);

export function nombreProhibido(texto) {
  const palabras = formaCanonica(String(texto || '').slice(0, 40)).split(' ')
    .filter(w => w && !FORMAS_PERMITIDAS.includes(w));
  const junto = palabras.join('');
  if (!junto) return false;
  // ¿La aparición que empieza en "pos" queda dentro de una permitida larga?
  const perdonada = (pos, largo) => PERMITIDAS_LARGAS.some(a => {
    for (let s = junto.indexOf(a); s >= 0; s = junto.indexOf(a, s + 1)) {
      if (s <= pos && s + a.length >= pos + largo) return true;
    }
    return false;
  });
  for (const { forma, entera } of FORMAS_PROHIBIDAS) {
    if (!forma) continue;
    if (entera) {
      if (palabras.includes(forma) || forma === junto) return true;
      continue;
    }
    for (let pos = junto.indexOf(forma); pos >= 0; pos = junto.indexOf(forma, pos + 1)) {
      if (!perdonada(pos, forma.length)) return true;
    }
  }
  return false;
}
