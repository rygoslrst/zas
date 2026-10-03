-- Generado por herramientas/filtro_nombres/armar.py (no editar a mano).
-- Pone en la base las listas de prohibidas.txt y permitidas.txt. Las
-- palabras agregadas a mano en el panel (con una nota que no empieza con
-- "lista:") no se tocan.
begin;
create temp table lista_p on commit drop as
select regexp_replace(w, '[*~]', '', 'g') as palabra, w like '%*%' as entera, w like '%~%' as al_reves,
       'lista: ' || v.tema as nota
from (values
  ('sexo y cuerpo', 'ANAL*,ANO*,ANUS*,BOOBS*,BUCETA,CACHOND,CARALHO,CHOTA*,CLITORI,COCK*,COJONES,CONCHA,CONDON,CONO*,COÑO*,CULITO,CULO~,CULON*,CULONA,CUM*,CUMSHOT,DESNUD,DICK*,DILDO,ESCROTO,ESPERMA,EYACUL,FELACION,FOLLADA,FOLLAR,HENTAI,MAMADA,MASTURB,MILF,NALGA,NUDE*,NUDES,OJETE,ONLYFANS,ORGASM,PAJA~,PAJEAR,PAJERA,PAJERO,PAJIAR,PAJILLER,PANOCHA,NEPE*,PENE~,PENIS~,PEZON,PICHULA,PICO~,PINGA,PIROCA,PIRULA,PITO*,POLLA*,PORN~,PORNO~,POTO~,PROSTITUT,PUSSY*,SECSO,SEKSI,SEMEN*,SEX*,SEXI,SEXO,SEXUAL,TESTICUL,TETA*~,TETAS*,TETON,TETUDA,TITS*,TRAGALECHE,TRAGASABLE,TULA*,VAGIN,VERGA~,XVIDEOS,XXX'),
  ('insultos', 'BASTARD,BASURA*,BOBA*,BOBO*,BOLUD,CABRON,CACA*,CAGADA,CAGAO,CAGAR,CAGON,CARAJO,CHINGA,CONCHESUM,CONCHETUM,CONCHUD,CORNUD,CRETIN,CULER,CULICAGADO,ESCORIA*,ESTUPID,GILIPOLLAS,GONORREA,IDIOTA,IMBECIL,INUTIL*,LACRA,LESA*,LESO*,MALNACID,MALPARID,MAMAGUEBO,MERDA,MIERD~,MOJON*,PEDO,PELOTUD,PENDEJ,PERRA,PUTA~,PUTEAR,PUTIT,PUTO~,TARAD,TONTA*,TONTO*,TUMADRE,TUMAMA,TUMARE,ZORRA,ZORRITA,ZORRON'),
  ('chilenismos', 'AWEONAD,AWEONAO,CALLAMPA,CAMIONA*,CARERAJA,CARERRAJA,CHUCHA,CHUCHETUM,CHUPA*,CHUPALA,CHUPALO,CHUPAME,COLIZA,CULEAR,CULIA,CULIAO~,FLETO,HUEVADA,HUEVEO,LAMEME,MAMAME,MAMAR*,MARACA*,MARACO,PERKIN,QL*,QLA*,QLIA,QLO*,RAJA*,SACOEWEA,SACOWEA,WEA*,WEAS*,WEBON~,WEON~,WN*,WNA*,WNS*'),
  ('odio y discriminación', 'BINLADEN,CUMA*,FLAITE*,FUHRER,HITLER~,LONGI*,NAZI*,NAZIS*,NEGRATA,NIGGA*,NIGGER,PERUCHO*,PINOCHET,SUDACA,TERRORIST'),
  ('burlas', 'ANORMAL*,AUTISTA*,BALLENA*,CANCER*,CHANCHA*,CHANCHO*,DOWN*,FEA*,FEO*,GORDA*,GORDO*,GUATON*,GUATONA*,MONGO*,MONGOLICO,RETARD,RETRASAD,SIDA*,SIDOSO,SUBNORMAL,VACA*'),
  ('homofobia', 'DYKE*,FAG*,FAGGOT,FEMBOY,GAY*,GEI*,HOMO*,JOTO*,LESBI*,LESBIANA*,MARICA,MARICON~,MARIMACHO,MARIPOSON,SODOMIT,TORTILLERA,TRANNY,TRAVA*,TRAVELO,TRAVESTI,TROLO*'),
  ('violencia y drogas', 'COCAINA,FALOPA*,MARIHUANA,MARIJUANA,MATATE*,MUERETE*,NECROFIL,PASTABASE,PEDERAST,PEDOFIL,RAPE*,RAPIST,SUICID,VIOLACION,VIOLADOR,VIOLAR*,WEED*,ZOOFILIA*'),
  ('inglés y portugués', 'ASSHOLE*,BITCH,CUNT,CUZAO,DUMBASS,FCK*,FODASE,FUCK*,FUCKER,FUCKIN,FUCKOFF,FUCKU*,FUCKYOU,GTFO*,HORNY*,JIZZ*,PORRA*,SHIT*,SKANK,SLUT,STFU*,TWAT*,VIADO*,WANKER,WHORE,WTF*'),
  ('siglas', 'CDTM*,CHTM*,CSM,CSMRE*,CSTM*,CTM,HDLGP*,HDP*,LCDTM*,LCTM*,LPM*,LPQLP*,LPQTP*,MRD*,MRDA*,PQTP*,PTA*,PTM*,PTO*,VRG*,VRGA*')
) as v(tema, ws), unnest(string_to_array(v.ws, ',')) as w;
delete from public.palabras_prohibidas where nota like 'lista:%' and palabra not in (select palabra from lista_p);
insert into public.palabras_prohibidas (palabra, entera, al_reves, nota) select * from lista_p
on conflict (palabra) do update set entera = excluded.entera, al_reves = excluded.al_reves, nota = excluded.nota;
create temp table lista_a on commit drop as
select w as palabra, 'lista: ' || v.tema as nota
from (values
  ('nombres', 'ANA,KAKASHI,MARICARMEN,PENÉLOPE,SORA,SORAYA,VERGARA'),
  ('lugares', 'CONCHALÍ,POTOSÍ,PUTAENDO'),
  ('palabras', 'ALACRÁN,CACAO,CACATÚA,CÁLCULO,CHINGANA,CÍRCULO,COMPUTADOR,COMPUTADORA,DISPUTA,ÉPICO,ESCULAPIO,ESPECTÁCULO,ESPERANZA,KUNTUR,MÚSCULO,OBSTÁCULO,ORÁCULO,PAJARITO,PÁJARO,PERA,PICCOLO,PICOLO,POLA,REPUTACIÓN,TÓPICO,TORPEDO,TRÓPICO,TUBÉRCULO,VEHÍCULO')
) as v(tema, ws), unnest(string_to_array(v.ws, ',')) as w;
delete from public.palabras_permitidas where nota like 'lista:%' and palabra not in (select palabra from lista_a);
insert into public.palabras_permitidas (palabra, nota) select * from lista_a
on conflict (palabra) do update set nota = excluded.nota;
commit;
