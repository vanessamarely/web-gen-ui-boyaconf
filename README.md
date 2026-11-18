# UI generativa sin fricción

Charla técnica para **BoyaConf 2026** (Tunja, Boyacá) de [Vanessa Aristizabal](https://github.com/vanessamarely).

> La UI generativa crea experiencias personalizadas, pero también nuevos retos de rendimiento. Veremos cómo optimizar el renderizado, el streaming, la reutilización del DOM y el estado para construir interfaces rápidas, fluidas y accesibles.

El hilo de la charla: una web con UI generativa tiene **5 errores**. Un **harness web** (instrucciones, límites y pruebas en un navegador real) los encuentra, y un agente de código los corrige **uno por uno** hasta que las 5 pruebas pasan.

| Carpeta | Qué es | URL publicada | URL local |
|---|---|---|---|
| [`slides/`](slides) | **Presentación** + **consola de la presentadora** en `/presenter/` + **app de asistentes** en `/live/` | https://genui-boyaconf-slides.web.app | http://localhost:5291 |
| [`base/`](base) | **Ejemplo para probar**: la web con los 5 errores y su harness | — | — |
| [`docs/corrida-agente/`](docs/corrida-agente) | **La corrida real del agente**: mediciones, cambios y resultado final | — | — |
| [`demo/`](demo) | **Mercado campesino**: demo complementaria de la lista generada en streaming | https://genui-boyaconf-demo.web.app | http://localhost:5292 |
| [`skills/frictionless-genui`](skills/frictionless-genui) | **Guía para tu agente de código** | — | — |

## Los 5 errores

Estas cifras salen de la primera y la última ejecución del harness, guardadas en [`corridas.jsonl`](docs/corrida-agente/corridas.jsonl).

| Prueba | Qué pasaba | Antes | Después |
|---|---|---|---|
| **Renderizado** | El contenido saltaba (CLS) | 0,103 | 0 |
| **Streaming** | La web se congelaba mientras la IA generaba | 29 veces | 0 |
| **DOM** | La web borraba la lista y la creaba otra vez | 117.460 elementos | 60 |
| **Accesibilidad** | Un lector de pantalla no sabía qué era cada campo | 86 campos sin etiqueta | 0 |
| **Estado** | La nota y la marca de la persona se perdían | Perdidas | Intactas |

## Qué es real y qué es simulado

- **Real:** la ejecución del agente, las pruebas en Chrome, las mediciones y el código que se muestra.
- **Simulado:** la respuesta del modelo. [`base/src/modelo.ts`](base/src/modelo.ts) reproduce una respuesta grabada para que las mediciones se puedan repetir sin red ni costo.
- **Creado para esta charla:** la carpeta `base/` es un ejemplo, no un estándar de la industria.

## La app de asistentes

- **Crea tu tejedor:** un avatar que aparece en el muro y en el podio.
- **3 preguntas por el podio:** puntos por acierto y por rapidez, más puntos por participar.
- **Preguntas a la presentadora:** se escriben en la app y le llegan a ella.
- **Me perdí:** un aviso privado que le indica a la presentadora en qué slide se perdió la gente.
- **Calificación final:** claridad y utilidad de 1 a 5, visibles solo para la presentadora.
- **Memoria descargable** con el resumen de cada slide, tus notas y tu tejedor. Las notas nunca salen del celular.

La URL pública de la presentación muestra solo el contenido. No incluye las preguntas, el muro, el podio ni los controles de presentadora.

## Prueba el ejemplo

Necesitas Node.js y Google Chrome.

```bash
cd base
```

```bash
npm install
```

```bash
npm run harness
```

La web termina en rojo. Abre tu agente de código en esa carpeta y pídele:

> Sigue AGENTS.md y no termines hasta que `npm run harness` esté en 5/5.

## Correr la charla en local

```bash
npm install
```

```bash
npm run dev:slides
```

- Presentación: http://localhost:5291 · consola: `/presenter/` · asistentes: `/live/`
- **Ensayo sin internet:** agrega `?local` a la presentación y a `/live/`. Cada pestaña es un asistente.
- **Ensayo con Firestore sin tocar la sesión real:** agrega `?session=ensayo1`.
- **Atajos:** `←/→` · **V** revelar respuesta · **Q** preguntas del público · **L** claro/oscuro · **H** alto contraste · **A** proporción · **E** pantalla extendida · **J** QR para unirse · **P** consola · **F** pantalla completa · **M** menú.

Las respuestas del podio se cargan desde `slides/answers.json`, que no está en el repositorio ni en el build.

```bash
npm test
```

## Si el auditorio no tiene internet

- **Asistentes:** usan sus propios datos móviles. Quien no tenga datos participa levantando la mano.
- **Presentadora:** conecta solo su computador a los datos de su celular y abre la presentación publicada con `?presenter=1` antes de empezar. Los videos quedan guardados al abrirla.
- **Si la señal se cae:** los slides siguen funcionando y los celulares se ponen al día cuando vuelva.
- **Sin ninguna conexión:** corre `npm run dev:slides` y abre `http://localhost:5291/?local&presenter=1`. Los slides funcionan, pero los celulares no se sincronizan.

## Despliegue (Firebase Hosting + Firestore)

Copia [`.env.example`](.env.example) a `slides/.env.local` con la configuración web del proyecto. Luego:

```bash
npm test && npm run build && firebase deploy --project genui-boyaconf
```

Antes de la charla, abre la presentación con `?presenter=1` y, en el menú, usa **Cargar respuestas del podio…** y **Vaciar sesión en vivo…** si ensayaste en la sesión real.

---

Hecho en Colombia con ❤️ y una ruana. Productos, precios y puestos del Mercado campesino son ficticios.
