# Pruebas automáticas

## Microjuegos

Sirven para revisar microjuegos nuevos sin jugarlos a mano: capturas de
pantalla y jugadores automáticos ("bots") que prueban que todo se puede ganar.

1. Arranca el servidor (`python servidor.py`) y abre `http://localhost:8124/?debug`.
2. En la consola del navegador (F12):

```js
await import('/herramientas/pruebas/arnes.js');   // toma el control del reloj
await import('/herramientas/pruebas/bots.js');    // un bot por microjuego

__probar('Frena', 3, 1.85, 8)        // 8 partidas en nivel 3, velocidad máxima
__ver('Frena', 1.5, 1, 1); await __foto('frena')   // captura a los 1,5 s → capturas/frena.jpg
```

`hoja.py` junta capturas en una hoja de contacto:
`python herramientas/pruebas/hoja.py Frena,Salta a,b hoja.jpg` (desde `capturas/`).

Para un microjuego nuevo, agrega su bot en `bots.js`. El bot no tiene tiempo
de reacción: si él pierde, casi seguro el microjuego tiene un caso imposible.

## Filtro de nombres

`http://localhost:8124/herramientas/pruebas/filtro.html` (con el servidor
andando). Ver `herramientas/filtro_nombres/LEEME.md`. Al terminar de cargar
deja el resumen en `window.__filtro`; `window.__compararBD()` manda todos los
nombres a Supabase y compara.
