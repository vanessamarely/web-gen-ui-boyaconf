# UI generativa sin fricción

Charla técnica para **BoyaConf 2026** (Tunja, Boyacá) de [Vanessa Aristizabal](https://github.com/vanessamarely).

> La UI generativa crea experiencias personalizadas, pero también nuevos retos de rendimiento. Veremos cómo optimizar el renderizado, el streaming, la reutilización del DOM y el estado para construir interfaces rápidas, fluidas y accesibles.

El hilo conductor: **¿qué es la web agéntica?** Un agente **lee** tu sitio, lo **usa** con tools que tú defines (WebMCP) y **genera** una interfaz a la medida de cada persona. Esa UI generativa es la cara de la web agéntica: tiene que funcionar sin fricción para la persona y para el agente.

Tema visual: **telar boyacense**. La urdimbre (estructura fija) es el renderizado, la trama (hilos que llegan) es el streaming, no destejer es reutilizar el DOM y el patrón es el estado. El hilo principal del navegador es, literalmente, un hilo.

| Carpeta | Qué es | URL publicada | URL local |
|---|---|---|---|
| [`slides/`](slides) | **Deck interactivo** (34 slides) + **consola de la presentadora** en `/presenter/` + **app de asistentes** en `/live/` | https://genui-boyaconf-slides.web.app | http://localhost:5291 |
| [`demo/`](demo) | **Mercado campesino**: un agente arma tu mercado de la semana con tools de WebMCP mientras la lista se genera en streaming | https://genui-boyaconf-demo.web.app | http://localhost:5292 |
| [`skills/frictionless-genui`](skills/frictionless-genui) | **Guía para tu agente de código**: aplica la charla a tu proyecto | — | — |

## Temario (30 min)

1. **¿Qué es la web agéntica?** Tres capas (lee · usa · genera), lo nuevo (WebMCP, Prompt API, agentes del navegador), una tool en tu página y por qué la UI generativa es su cara. → Pregunta 1
2. **Renderizado, la urdimbre:** datos, no HTML (catálogo + JSON Schema); primero el plan, luego el contenido.
3. **Streaming, la trama:** envía cambios por id, no el documento entero; el agente trabaja a la vista.
4. **Reutilizar el DOM, no destejer:** refinar sin regenerar (reconciliar por id, `moveBefore()`); el agente cambia algo y tú no pierdes nada. → Pregunta 2
5. **Estado, el patrón:** un solo estado para persona y agente (con versión), lo de la persona gana, el agente avisa y todo se puede deshacer.
6. **Demo** (4 clips), cómo medir la fricción → Pregunta 3 → muro de tejedores → 10 puntadas → podio → ¡Gracias, sumercé!

## La app de asistentes

- **Apodos** generados con sabor boyacense ("Ruana Paramuna", "Tiple Veloz"): ≈ 1.700 combinaciones y numeración automática si alguien repite.
- **Crea tu tejedor**: avatar con ruana (Nobsa, Lago de Tota, Páramo, Ráquira…), patrón, sombrero de paja o fieltro, y accesorio (madeja, tiple, tejo, laptop, frailejón, almojábana), más **el hilo** que te llevas (una práctica de la charla). Se dibuja en el celular (SVG) y se descarga como PNG 1080×1350.
- **3 preguntas por el podio**: 500 puntos por acierto + bono por rapidez; bonos con tope por llegar a tiempo, publicar tu tejedor, preguntar y reaccionar. El primer lugar ve un código de 4 letras para reclamar el premio.
- **Notas que no se mueven** mientras escribes, **reacciones** (si la sala reacciona en masa: 🔥 un tejedor cruza corriendo, 🤯 ¡tejo con mecha!, ❤️ el sol de Boyacá) y **preguntas a la presentadora** (solo sobre el tema; nunca se proyectan).
- **Memoria** descargable (PDF, HTML o Markdown) con el resumen de cada slide, tus notas y tu tejedor. Las notas nunca salen del celular.

## Mercado campesino: la demo

Le pides al agente *"Mercado para 4 con 120 mil, para un cuchuco"*: el agente llama tools de WebMCP y la lista se genera por puestos de la plaza (tubérculos, verduras, granos, frutas, lácteos). Productos y precios **ficticios**.

- **Interruptor Ingenuo ↔ Sin fricción** (barra superior) y **HUD** con CLS, nodos creados, focos perdidos, INP y llamadas a tools.
- **Sin fricción**: primero el plan (puestos reservados con su altura final) → cambios por id en streaming → filas por id parchadas por suscripción y movidas con `moveBefore()` → un solo store con versión → lo de la persona gana → actividad visible, anuncios `aria-live`, cancelar y deshacer.
- **Ingenuo**: documento entero releído en cada pedazo, `innerHTML` de cada puesto y regeneraciones que pisan lo que la persona marcó.
- **8 tools WebMCP** (`ver_mercado`, `buscar_productos`, `armar_mercado`, `ajustar_presupuesto`, `agregar_producto`, `quitar_producto`, `marcar_comprado`, `enviar_pedido` con confirmación). Usa `document.modelContext` nativo si el navegador lo trae; si no, un polyfill.
- **Inspector de tools** (botón *Tools WebMCP* o `?inspector`): schema, *Run tool* y actividad, como DevTools → Application → WebMCP.
- **Motor**: agente simulado y determinista por defecto (funciona sin red); `?engine=nano` usa Gemini Nano (Prompt API con `responseConstraint`) si el equipo lo tiene.

Medido en la misma escena (refinar el presupuesto mientras la persona escribe una nota), con `node scripts/record-clips.mjs`:

| | Ingenuo | Sin fricción |
|---|---|---|
| Nodos creados | 71.765 | 147 |
| Renders | 381 | 26 |
| Focos perdidos | 2 | 0 |
| Nota y producto marcado | se pierden | se conservan |
| CLS al generar la lista | 0,029 | 0,004 |

Parámetros: `?modo=ingenuo|fluido`, `?cps=600` (velocidad del "modelo"), `?engine=nano`, `?inspector`. En la consola: `mercadoDemo.pedir('…')`.

## Correr en local

```bash
npm install
```

```bash
npm run dev:slides
```

```bash
npm run dev:demo
```

- Deck: http://localhost:5291 · consola: `/presenter/` · asistentes: `/live/`
- **Ensayo sin internet**: agrega `?local` al deck y a `/live/`; cada pestaña es un asistente (BroadcastChannel). Las respuestas del podio se cargan solas desde `slides/answers.json` (no está en el repo ni en el build).
- **Ensayo con Firestore sin ensuciar la sesión real**: `?session=ensayo1`.
- Atajos del deck: `←/→` · **V** revelar respuesta · **Q** preguntas del público · **L** claro/oscuro · **H** alto contraste · **A** proporción (4:3, 16:10, 16:9, 21:9) · **E** pantalla extendida · **J** QR para unirse · **P** consola · **F** pantalla completa · **M** menú.

```bash
npm test
```

```bash
npm run clips
```

(`npm run clips` graba los 4 clips de la demo en `slides/public/clips/`; necesita `npm run dev:demo` corriendo y Google Chrome instalado.)

## Guía para tu agente de código

[`skills/frictionless-genui`](skills/frictionless-genui) es una guía (skill) que tu agente de código puede seguir para volver agéntica y sin fricción la UI generativa de tu proyecto: inventario de intenciones, tools de WebMCP, plan primero, cambios por id, reconciliación con `moveBefore()`, estado con versión, accesibilidad y medición antes/después. Cópiala a la carpeta de skills de tu agente y pídele: *"Revisa mi UI generativa con la guía frictionless-genui"*.

## Despliegue (Firebase Hosting + Firestore)

Copia [`.env.example`](.env.example) a `slides/.env.local` con la config web del proyecto. Luego:

```bash
npm test && npm run build && firebase deploy
```

Pasos de consola (solo la dueña del proyecto):

1. **Authentication → Sign-in method → Anónimo**: habilitar (sin esto los celulares quedan en modo local).
2. **GitHub** (para presentar en vivo): crea una OAuth App en https://github.com/settings/developers con callback `https://<proyecto>.firebaseapp.com/__/auth/handler` y pega el Client ID y el secreto en Firebase.
3. **Authentication → Settings → Authorized domains**: agrega `genui-boyaconf-slides.web.app` y `genui-boyaconf-demo.web.app`.
4. Antes de la charla: deck con `?presenter=1` → menú → **Cargar respuestas del podio…** (`slides/answers.json`) y **Vaciar sesión en vivo…** si ensayaste en la sesión real.

---

Hecho en Colombia con ❤️ y una ruana. Productos, precios y puestos del Mercado campesino son ficticios.
