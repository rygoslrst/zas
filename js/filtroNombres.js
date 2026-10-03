// ============================================================================
//  filtroNombres.js — el filtro de nombres de la tabla de récords (copia local)
// ----------------------------------------------------------------------------
//  La regla de verdad vive en la base de datos (Supabase, proyecto "zas"):
//  la función nombre_prohibido y las tablas palabras_prohibidas y
//  palabras_permitidas. Esta copia sirve para avisar al instante y cuando no
//  hay internet. Si se cambia el procedimiento, cambiarlo en los dos lados
//  (herramientas/tabla_en_linea.sql). Las listas salen de
//  herramientas/filtro_nombres/*.txt (armar.py las copia acá); las palabras
//  que se agreguen sólo en el panel de Supabase valen igual, porque la base
//  revisa el nombre otra vez al guardarlo.
//
//  Cómo funciona (v5):
//  1. Nada que parezca un teléfono (7 cifras o más) ni números y siglas con
//     mala fama (69, 420, 1488, KKK).
//  2. Todo se lleva a una "forma canónica" que atiende a cómo SUENA y se LEE
//     el nombre: mayúsculas, sin tildes (la Ñ sí cuenta: AÑO no es ANO),
//     números y símbolos que imitan letras (P3N3, 5EX0, @), letras sueltas
//     seguidas como una palabra (P U T A), letras que suenan igual (C/K/QU,
//     CE/SE, V/B, Z/S, Y/I, LL/Y, GE/JE, PH/F, X/CH como en XUXA, HUE/GUE/WE),
//     sin H muda y sin letras repetidas (PUUUTA), salvo RR (PERRA no es PERA).
//  3. Como algunos trucos se pueden leer de dos maneras, también se prueba con
//     el 1 (o ! |) como L (CU1O), la V como U (PVTA) y la LL como L (CULLO).
//  4. Se buscan las prohibidas dentro de cada palabra (MIPENE) y de las
//     palabras pegadas a una vecina corta (PU TA, MARI CON; pero no JOSÉ
//     MÉNDEZ). Las marcadas como enteras (ANO, WN, TETA) y las escritas al
//     revés (ATUP) sólo cuentan como palabra suelta.
//  5. Una aparición se perdona si queda dentro de una palabra permitida
//     (PENÉLOPE, ÉPICO, VERGARA...).
// ============================================================================

// <listas> — generado por herramientas/filtro_nombres/armar.py: no editar a mano
const PROHIBIDAS = (
  'ANAL*,ANO*,ANUS*,BOOBS*,BUCETA,CACHOND,CARALHO,CHOTA*,CLITORI,COCK*,COJONES,CONCHA,CONDON,CONO*,' +
  'COÑO*,CULITO,CULO~,CULON*,CULONA,CUM*,CUMSHOT,DESNUD,DICK*,DILDO,ESCROTO,ESPERMA,EYACUL,FELACION,' +
  'FOLLADA,FOLLAR,HENTAI,MAMADA,MASTURB,MILF,NALGA,NUDE*,NUDES,OJETE,ONLYFANS,ORGASM,PAJA~,PAJEAR,' +
  'PAJERA,PAJERO,PAJIAR,PAJILLER,PANOCHA,NEPE*,PENE~,PENIS~,PEZON,PICHULA,PICO~,PINGA,PIROCA,PIRULA,' +
  'PITO*,POLLA*,PORN~,PORNO~,POTO~,PROSTITUT,PUSSY*,SECSO,SEKSI,SEMEN*,SEX*,SEXI,SEXO,SEXUAL,' +
  'TESTICUL,TETA*~,TETAS*,TETON,TETUDA,TITS*,TRAGALECHE,TRAGASABLE,TULA*,VAGIN,VERGA~,XVIDEOS,XXX,' +
  'BASTARD,BASURA*,BOBA*,BOBO*,BOLUD,CABRON,CACA*,CAGADA,CAGAO,CAGAR,CAGON,CARAJO,CHINGA,CONCHESUM,' +
  'CONCHETUM,CONCHUD,CORNUD,CRETIN,CULER,CULICAGADO,ESCORIA*,ESTUPID,GILIPOLLAS,GONORREA,IDIOTA,' +
  'IMBECIL,INUTIL*,LACRA,LESA*,LESO*,MALNACID,MALPARID,MAMAGUEBO,MERDA,MIERD~,MOJON*,PEDO,PELOTUD,' +
  'PENDEJ,PERRA,PUTA~,PUTEAR,PUTIT,PUTO~,TARAD,TONTA*,TONTO*,TUMADRE,TUMAMA,TUMARE,ZORRA,ZORRITA,' +
  'ZORRON,AWEONAD,AWEONAO,CALLAMPA,CAMIONA*,CARERAJA,CARERRAJA,CHUCHA,CHUCHETUM,CHUPA*,CHUPALA,' +
  'CHUPALO,CHUPAME,COLIZA,CULEAR,CULIA,CULIAO~,FLETO,HUEVADA,HUEVEO,LAMEME,MAMAME,MAMAR*,MARACA*,' +
  'MARACO,PERKIN,QL*,QLA*,QLIA,QLO*,RAJA*,SACOEWEA,SACOWEA,WEA*,WEAS*,WEBON~,WEON~,WN*,WNA*,WNS*,' +
  'BINLADEN,CUMA*,FLAITE*,FUHRER,HITLER~,LONGI*,NAZI*,NAZIS*,NEGRATA,NIGGA*,NIGGER,PERUCHO*,PINOCHET,' +
  'SUDACA,TERRORIST,ANORMAL*,AUTISTA*,BALLENA*,CANCER*,CHANCHA*,CHANCHO*,DOWN*,FEA*,FEO*,GORDA*,' +
  'GORDO*,GUATON*,GUATONA*,MONGO*,MONGOLICO,RETARD,RETRASAD,SIDA*,SIDOSO,SUBNORMAL,VACA*,DYKE*,FAG*,' +
  'FAGGOT,FEMBOY,GAY*,GEI*,HOMO*,JOTO*,LESBI*,LESBIANA*,MARICA,MARICON~,MARIMACHO,MARIPOSON,SODOMIT,' +
  'TORTILLERA,TRANNY,TRAVA*,TRAVELO,TRAVESTI,TROLO*,COCAINA,FALOPA*,MARIHUANA,MARIJUANA,MATATE*,' +
  'MUERETE*,NECROFIL,PASTABASE,PEDERAST,PEDOFIL,RAPE*,RAPIST,SUICID,VIOLACION,VIOLADOR,VIOLAR*,WEED*,' +
  'ZOOFILIA*,ASSHOLE*,BITCH,CUNT,CUZAO,DUMBASS,FCK*,FODASE,FUCK*,FUCKER,FUCKIN,FUCKOFF,FUCKU*,' +
  'FUCKYOU,GTFO*,HORNY*,JIZZ*,PORRA*,SHIT*,SKANK,SLUT,STFU*,TWAT*,VIADO*,WANKER,WHORE,WTF*,CDTM*,' +
  'CHTM*,CSM,CSMRE*,CSTM*,CTM,HDLGP*,HDP*,LCDTM*,LCTM*,LPM*,LPQLP*,LPQTP*,MRD*,MRDA*,PQTP*,PTA*,PTM*,' +
  'PTO*,VRG*,VRGA*').split(',');
const PERMITIDAS = (
  'ANA,KAKASHI,MARICARMEN,PENÉLOPE,SORA,SORAYA,VERGARA,CONCHALÍ,POTOSÍ,PUTAENDO,ALACRÁN,CACAO,' +
  'CACATÚA,CÁLCULO,CHINGANA,CÍRCULO,COMPUTADOR,COMPUTADORA,DISPUTA,ÉPICO,ESCULAPIO,ESPECTÁCULO,' +
  'ESPERANZA,KUNTUR,MÚSCULO,OBSTÁCULO,ORÁCULO,PAJARITO,PÁJARO,PERA,PICCOLO,PICOLO,POLA,REPUTACIÓN,' +
  'TÓPICO,TORPEDO,TRÓPICO,TUBÉRCULO,VEHÍCULO').split(',');
// </listas>

// Como translate() de SQL: cada letra de "de" pasa a la de la misma posición en "a"
function cambiar(texto, de, a) {
  let r = '';
  for (const c of texto) { const i = de.indexOf(c); r += i >= 0 ? a[i] : c; }
  return r;
}

// Las letras sueltas seguidas forman una palabra: "P U T A" es PUTA
function juntarSueltas(texto) {
  const r = [];
  let suelta = '';
  for (const w of texto.trim().split(/\s+/)) {
    if (w.length === 1) suelta += w;
    else {
      if (suelta) { r.push(suelta); suelta = ''; }
      if (w) r.push(w);
    }
  }
  if (suelta) r.push(suelta);
  return r.join(' ');
}

export function formaCanonica(texto) {
  let t = String(texto || '').toUpperCase();
  t = cambiar(t, 'ÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÇ', 'AAAAAEEEEIIIIOOOOOUUUUC');
  t = cambiar(t, '0123456789@$!|€', 'OIZEASGTBGASIIE');
  t = juntarSueltas(t.replace(/[^A-ZÑ ]/g, '')).replace(/([AEIOU])\1+/g, '$1');
  t = t.replace(/PH/g, 'F').replace(/CH/g, '#').replace(/X/g, '#').replace(/QU/g, 'K');
  t = cambiar(t, 'VZY', 'BSI').replace(/NB/g, 'MB').replace(/C([EI])/g, 'S$1');
  // HUE, GÜE, GUI, HUA...: suenan WE, WI, WA (también con una H metida: HUHEON)
  t = cambiar(t, 'CQ', 'KK').replace(/[HG]U([EIA])/g, 'W$1').replace(/H/g, '');
  t = t.replace(/GU([EIA])/g, 'W$1').replace(/(^|[ AEIOU])U([EIA])/g, '$1W$2');
  t = t.replace(/G([EI])/g, 'J$1').replace(/#/g, 'CH');
  t = t.replace(/L{2,}/g, 'I').replace(/R{2,}/g, '%').replace(/([A-ZÑ%])\1+/g, '$1').replace(/%/g, 'RR');
  return t.replace(/\s+/g, ' ').trim();
}

const al_reves = s => [...s].reverse().join('');
const FORMAS_PROHIBIDAS = PROHIBIDAS.map(p => {
  const palabra = p.replace(/[*~]/g, '');
  return {
    forma: formaCanonica(palabra),
    reves: p.includes('~') ? formaCanonica(al_reves(palabra)) : '',
    entera: p.includes('*'),
  };
}).filter(p => p.forma);
const FORMAS_PERMITIDAS = PERMITIDAS.map(formaCanonica);
const PERMITIDAS_LARGAS = FORMAS_PERMITIDAS.filter(f => f.length >= 5);

// ¿La aparición que empieza en "pos" queda dentro de una permitida larga?
function perdonada(tramo, pos, largo) {
  return PERMITIDAS_LARGAS.some(a => {
    for (let s = tramo.indexOf(a); s >= 0 && s <= pos; s = tramo.indexOf(a, s + 1)) {
      if (s + a.length >= pos + largo) return true;
    }
    return false;
  });
}

// ¿Hay una prohibida en esta forma canónica?
function formaProhibida(forma) {
  const palabras = forma.split(' ').filter(w => w && !FORMAS_PERMITIDAS.includes(w));
  // Los tramos: cada palabra, pegada a la vecina cuando una de las dos es
  // corta (así PU TA y MARI CON se leen juntas, pero JOSÉ MÉNDEZ no)
  const tramos = [];
  let tramo = '', previa = '';
  for (const w of palabras) {
    if (tramo && previa.length > 3 && w.length > 3) { tramos.push(tramo); tramo = ''; }
    tramo += w;
    previa = w;
  }
  if (tramo) tramos.push(tramo);
  const suelta = f => palabras.includes(f) || tramos.includes(f);
  // Las enteras y las escritas al revés (ATUP), como palabra suelta
  if (FORMAS_PROHIBIDAS.some(p => (p.entera && suelta(p.forma)) || (p.reves && suelta(p.reves)))) return true;
  // Las demás, en cualquier parte de un tramo
  for (const t of tramos) {
    for (const { forma: f, entera } of FORMAS_PROHIBIDAS) {
      if (entera) continue;
      for (let pos = t.indexOf(f); pos >= 0; pos = t.indexOf(f, pos + 1)) {
        if (!perdonada(t, pos, f.length)) return true;
      }
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
  // Las lecturas posibles: tal cual, el 1 como L, la V como U, la LL como L
  let lecturas = [crudo];
  if (/[1!|]/.test(crudo)) lecturas = lecturas.concat(lecturas.map(v => cambiar(v, '1!|', 'LLL')));
  if (crudo.includes('V')) lecturas = lecturas.concat(lecturas.map(v => v.replace(/V/g, 'U')));
  if (crudo.includes('LL')) lecturas = lecturas.concat(lecturas.map(v => v.replace(/L{2,}/g, 'L')));
  return lecturas.some(v => formaProhibida(formaCanonica(v)));
}

// Para las pruebas (herramientas/pruebas/filtro.html)
export const LISTAS = { PROHIBIDAS, PERMITIDAS };
