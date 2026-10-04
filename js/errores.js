// ============================================================================
//  errores.js — si el juego falla en un teléfono, que quede anotado
// ----------------------------------------------------------------------------
//  Script común (no módulo) y en sintaxis vieja a propósito: se carga primero,
//  así también avisa si un navegador viejo no entiende los módulos del juego
//  (en ese caso el juego no arranca y nadie se enteraría).
//
//  Manda a Supabase (anotar_error, ver herramientas/registro_errores.sql) el
//  mensaje, dónde pasó, la página y el navegador. Nada personal. Como mucho 3
//  por visita; en localhost no manda nada.
// ============================================================================
(function () {
  var URL_RPC = 'https://eouuvfqpktumfwlebmqz.supabase.co/rest/v1/rpc/anotar_error';
  var LLAVE = 'sb_publishable_bEC0jMG9Ls2YGHzx2faIcg_xFMQU6WG';      // la misma (pública) de js/tabla.js
  var MAXIMO = 3;
  var local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname) || location.protocol === 'file:';
  var enviados = 0, vistos = {};

  function cortar(t, n) { t = String(t == null ? '' : t); return t.length > n ? t.slice(0, n) : t; }
  // De "https://rygoslrst.github.io/zas/js/ui.js" queda "js/ui.js"
  function corto(archivo) { return String(archivo || '').replace(location.origin, '').replace(/^\/zas\//, ''); }

  function anotar(mensaje, donde) {
    var clave = mensaje + '|' + donde;
    if (local || enviados >= MAXIMO || vistos[clave]) return;
    vistos[clave] = true;
    enviados++;
    var cuerpo = JSON.stringify({
      p_mensaje: cortar(mensaje, 300), p_donde: cortar(donde, 200),
      p_pagina: cortar(location.pathname + location.search, 120), p_navegador: cortar(navigator.userAgent, 200),
    });
    try {
      if (window.fetch) {
        fetch(URL_RPC, {
          method: 'POST', keepalive: true, body: cuerpo,
          headers: { apikey: LLAVE, 'Content-Type': 'application/json' },
        }).catch(function () { /* sin red: se pierde, no importa */ });
      } else {
        var x = new XMLHttpRequest();
        x.open('POST', URL_RPC);
        x.setRequestHeader('apikey', LLAVE);
        x.setRequestHeader('Content-Type', 'application/json');
        x.send(cuerpo);
      }
    } catch (e) { /* nada */ }
  }
  window.anotarError = anotar;

  window.addEventListener('error', function (e) {
    // Un archivo que no cargó (imagen, script): el evento llega por captura
    if (e.target && e.target !== window && (e.target.src || e.target.href)) {
      anotar('no cargó un archivo', corto(e.target.src || e.target.href));
      return;
    }
    var archivo = e.filename || '';
    // Errores de extensiones del navegador o de otros sitios: no son nuestros
    if (!archivo || archivo.indexOf(location.origin) !== 0) return;
    var pila = e.error && e.error.stack ? ' | ' + String(e.error.stack).split('\n').slice(0, 3).join(' < ') : '';
    anotar(e.message + pila, corto(archivo) + ':' + e.lineno + ':' + e.colno);
  }, true);

  window.addEventListener('unhandledrejection', function (e) {
    var r = e.reason || {};
    var pila = r.stack ? String(r.stack).split('\n').slice(0, 3).join(' < ') : '';
    // Las de la tabla de récords sin conexión ya se manejan aparte
    if (/rpc|Failed to fetch|NetworkError|aborted|Load failed/i.test(String(r.message || r))) return;
    anotar('promesa: ' + (r.message || String(r)), corto(pila));
  });

  // Si a los 30 s la página sigue en "Cargando" (con la pestaña a la vista),
  // algo no anduvo. También se anota si el aparato no tiene WebGL.
  var oculta = document.hidden;
  document.addEventListener('visibilitychange', function () { if (document.hidden) oculta = true; });
  setTimeout(function () {
    var cargando = document.getElementById('cargando'), error = document.getElementById('error');
    if (error && !error.hidden) anotar('sin WebGL', '');
    else if (cargando && !cargando.hidden && !oculta) anotar('no arrancó: sigue en Cargando a los 30 s', '');
  }, 30000);
})();
