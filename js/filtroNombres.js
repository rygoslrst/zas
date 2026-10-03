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
//  1. Nada que parezca un teléfono (7 cifras o más) ni números y siglas con
//     mala fama (69, 420, 1488, KKK).
//  2. Todo se lleva a una "forma canónica" que atiende a cómo SUENA el nombre:
//     mayúsculas, sin tildes (la Ñ sí cuenta: AÑO no es ANO), números y
//     símbolos que imitan letras (P3N3, 5EX0), letras que suenan igual (C/K/QU,
//     V/B, Z/S, Y/I, X/CH como en XUXA, HUE/GUE/WE), sin H muda y sin letras
//     repetidas (PUUUTA), salvo RR y LL (PERRA no es PERA).
//  3. Se buscan las prohibidas en todo el nombre junto (atrapa "P U T A" y
//     "MIPENE") y, al revés, en cada palabra (ATUP). Las marcadas con * sólo
//     cuentan como palabra entera.
//  4. Una aparición se perdona si queda dentro de una palabra permitida
//     (PENÉLOPE, ÉPICO, PÁJARO...).
// ============================================================================

const PROHIBIDAS = ('ANAL*,ANO*,ANUS*,ASSHOLE*,AWEONAO,BASTARD,BITCH,BOLUD,BOLUDO,BOOBS*,CABRON,CACA,CACHOND,' +
  'CACHONDO,CAGADA,CAGAO,CAGAR,CAGON,CALLAMPA,CAMIONA,CARAJO,CHINGA,CHOTA*,CHUCHA,CHUCHETUMARE,CHUPA*,CHUPALA,' +
  'CHUPALO,CHUPAME,CHUPAMELA,CHUPAPICO,CLITORI,COCAINA,COCK*,COJONES,COLIZA,CONCHA,CONCHESUMADRE,CONCHESUMARE,' +
  'CONCHETUMADRE,CONCHETUMARE,CONCHUD,CONDON,CONO*,COÑO*,CORNUD,CORNUDO,CSM,CSMRE*,CSTM*,CTM,CTMR*,CTMRE*,CULEAR,' +
  'CULER,CULERO,CULIA,CULIAD,CULIAO,CULIAR,CULICAGADO,CULITO,CULO,CUNT,DESNUD,DICK*,ESCROTO,ESPERMA,ESTUPIDA,' +
  'ESTUPIDO,EYACUL,FAGGOT,FCK*,FELACION,FEMBOY,FLETO,FOLLAR,FUCK,GILIPOLLAS,GONORREA,HDLGP*,HDP*,HITLER,HORNY*,' +
  'HUEVADA,HUEVEO,IDIOTA,IMBECIL,JOTO*,LACRA,LAMEME,LCTM*,LPM*,MALPARID,MALPARIDO,MAMADA,MAMAGUEBO,MAMAME,MAMAR*,' +
  'MARACA*,MARACO,MARICA,MARICON,MARIGUANA,MARIHUANA,MASTURB,MIERD,MIERDA,MILF,MONGO*,MONGOLICO,MRD*,NALGA,NAZI,' +
  'NECROFIL,NEGRATA,NEPE,NIGGA,NIGGER,NUDES,OJETE,ORGASM,PAJA,PAJEAR,PAJERA,PAJERO,PAJIAR,PANOCHA,PEDO,PEDOFIL,' +
  'PELOTUD,PELOTUDO,PENDEJ,PENE,PENIS,PERKIN,PERRA,PEZON,PICHULA,PICO,PINGA,PIRULA,POLLA,PORN,PORNO,POTO,' +
  'PROSTITUT,PTM*,PUSSY*,PUTA,PUTEAR,PUTITA,PUTO,PUTONA,QL*,QLA*,QLIA,QLIAO,QLO*,RAJA*,RAPE*,RETRASADO,SACOWEA,' +
  'SEMEN,SEXI,SEXO,SEXUAL,SHIT*,SIDA*,SIDOSO,SLUT,STFU*,SUBNORMAL,SUDACA,SUICID,TARADA,TARADO,TERRORIST,TESTICUL,' +
  'TETA,TETAS,TETON,TETONA,TITS*,TORTILLERA,TRAGASABLE,TRAVELO,TROLO*,TULA*,TUMADRE,TUMARE,VAGIN,VAGINA,VERGA,' +
  'VIOLADOR,VIOLAR,WEA*,WEAS*,WEBON,WEON,WHORE,WN*,WNA*,WNS*,WTF*,ZOOFIL,ZORRA,ZORRITA,ZORRON').split(',');

const PERMITIDAS = ('ANA,CACAO,CACATÚA,CHINGANA,COMPUTADOR,COMPUTADORA,CONCHALÍ,DISPUTA,ÉPICO,ESCULAPIO,' +
  'ESPERANZA,KAKASHI,PAJARITO,PÁJARO,PENÉLOPE,PERA,PICCOLO,PICOLO,POLA,POTOSÍ,PUTAENDO,REPUTACIÓN,SORA,SORAYA,' +
  'TÓPICO,TORPEDO,TRÓPICO').split(',');

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
  t = t.replace(/CH/g, '#').replace(/X/g, '#').replace(/QU/g, 'K');
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
const al_reves = s => [...s].reverse().join('');

// ¿Hay una prohibida en el nombre junto (o en alguna de sus palabras)?
function contieneProhibida(junto, palabras) {
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

export function nombreProhibido(texto) {
  const crudo = String(texto || '').slice(0, 40).toUpperCase();
  // Datos personales: 7 cifras o más parece un teléfono
  if ((crudo.match(/[0-9]/g) || []).length >= 7) return true;
  // Números y siglas con mala fama
  if (/(^|[^0-9])(69|420|1488)([^0-9]|$)/.test(crudo) || crudo.replace(/[^A-Z]/g, '').includes('KKK')) return true;
  const palabras = formaCanonica(crudo).split(' ').filter(w => w && !FORMAS_PERMITIDAS.includes(w));
  const junto = palabras.join('');
  if (!junto) return false;
  if (contieneProhibida(junto, palabras)) return true;
  // Al revés, palabra por palabra (ATUP, OLUK): sólo las prohibidas de 4 letras o más
  return palabras.some(w => {
    const r = al_reves(w);
    return FORMAS_PROHIBIDAS.some(({ forma, entera }) => forma.length >= 4 && (entera ? forma === r : r.includes(forma)));
  });
}
