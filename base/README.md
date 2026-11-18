# Base de harness web

Una base para construir interfaces con IA y comprobar que funcionan para quien las usa. Viene con una app de ejemplo que **empieza con problemas a propósito**: es el punto de partida para probar tu agente de código.

Un harness es lo que rodea a un agente de IA para que trabaje bien. Esta base trae instrucciones, límites y pruebas:

| Parte | Archivo | Para qué sirve |
|---|---|---|
| **Instrucciones** | [`AGENTS.md`](AGENTS.md) | Las reglas que el agente lee antes de escribir código |
| **Límites** | [`harness/presupuestos.json`](harness/presupuestos.json) | Lo que la app no puede superar |
| **Pruebas** | [`harness/check.mjs`](harness/check.mjs) | Usan la app en Chrome con Playwright y miden la experiencia |

## Pruébala

Necesitas Node.js y Google Chrome.

```bash
npm install
```

```bash
npm run harness
```

La app de ejemplo termina en rojo. Ahora abre tu agente de código en esta carpeta y pídele:

> Sigue AGENTS.md y no termines hasta que `npm run harness` esté en 5/5.

## Qué miden las pruebas

| Prueba | Qué comprueba | Límite |
|---|---|---|
| **Renderizado** | La pantalla no salta mientras llega el contenido (CLS) | ≤ 0,1 |
| **Streaming** | La app responde mientras genera (frames largos e INP) | ≤ 5 frames de más de 50 ms · INP ≤ 200 ms |
| **DOM** | Al refinar no se recrea la lista y se conserva el foco | ≤ 60 nodos nuevos |
| **Estado** | La nota y la marca de la persona sobreviven | Intactas |
| **Accesibilidad** | Avisa sin saturar y cada campo tiene nombre | `aria-busy` · 1 a 3 anuncios |

Las pruebas corren con la CPU limitada para acercarse a un celular de gama media-baja. Cámbialo con `HARNESS_CPU=4 npm run harness`.

## Úsala en tu proyecto

1. Copia `AGENTS.md` y la carpeta `harness/`.
2. Cambia las reglas de `AGENTS.md` por las de tu proyecto.
3. Ajusta `harness/presupuestos.json` a lo que necesita tu app.
4. En `harness/check.mjs`, cambia los selectores `data-testid` y el recorrido por un flujo real de tu app.
5. Empieza con **una sola prueba**: el problema que más te duela hoy.

`src/modelo.ts` simula la respuesta de un modelo en streaming para que las mediciones se puedan repetir sin red ni costo.
