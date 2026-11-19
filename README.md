# UI generativa sin fricción

Charla técnica para **BoyaConf 2026** (Tunja, Boyacá) de [Vanessa Aristizabal](https://github.com/vanessamarely).

> La UI generativa crea experiencias personalizadas, pero también nuevos retos de rendimiento. Veremos cómo optimizar el renderizado, el streaming, la reutilización del DOM y el estado para construir interfaces rápidas, fluidas y accesibles.

La idea de la charla: la UI generativa cambia cómo construimos la web, pero nos enfrenta a retos que ya conocíamos en **buenas prácticas, rendimiento y accesibilidad**.

| Carpeta | Qué es | URL publicada | URL local |
|---|---|---|---|
| [`slides/`](slides) | **Presentación** + **consola de la presentadora** en `/presenter/` + **app de asistentes** en `/live/` | https://genui-boyaconf-slides.web.app | http://localhost:5291 |
| [`demo/ui`](demo/ui) | **Mercado generativo**: Gemini Nano elige qué interfaz mostrar según cada pedido | https://genui-boyaconf-demo.web.app/ui/ | http://localhost:5292/ui/ |
| [`demo/tests`](demo/tests) | **Las 5 reglas** comprobadas con Playwright | — | — |
| [`skills/frictionless-genui`](skills/frictionless-genui) | **Guía para tu agente de código** | — | — |

## Las 5 reglas

Cifras medidas con la misma respuesta de Gemini Nano en las dos versiones de la demo. En la regla de renderizado se agrega un código dañino a propósito.

| Regla | Sin preparar | Preparada |
|---|---|---|
| **Renderizado:** código dañino incluido a propósito en la respuesta | Se ejecutó | No se ejecutó |
| **Streaming:** actualizaciones de pantalla | 204 | 51 |
| **DOM:** elementos creados | 5.274 | 56 |
| **Estado:** papa cambiada a 5 kg mientras la IA responde | Vuelve a 2 kg | Se queda en 5 kg |
| **Accesibilidad:** avisos al lector de pantalla | 204 | 2 |

## Prueba la demo

```bash
npm run build -w demo && npm run preview -w demo
```

Abre http://localhost:5292/ui/ en Chrome. Donde Gemini Nano no está disponible, como en los celulares, la página usa una respuesta grabada de Nano y lo indica.

```bash
cd demo && npx playwright test
```

## La app de asistentes

- **Crea tu tejedor:** un avatar que aparece en el muro y en el podio.
- **3 preguntas por el podio:** puntos por acierto y por rapidez, más puntos por participar.
- **Preguntas a la presentadora:** se escriben en la app y le llegan a ella.
- **Me perdí:** un aviso privado que le indica a la presentadora en qué slide se perdió la gente.
- **Calificación final:** claridad y utilidad de 1 a 5, visibles solo para la presentadora.
- **Memoria descargable** con el resumen de cada slide, tus notas y tu tejedor. Las notas nunca salen del celular.

La URL pública de la presentación muestra solo el contenido. No incluye las preguntas, el muro, el podio ni los controles de presentadora.

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
