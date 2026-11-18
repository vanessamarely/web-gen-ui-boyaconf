# Corrida real del agente

Registro del experimento que se muestra en la charla. Un agente de código recibió la app de [`base/`](../../base) sin pasar ninguna de las 5 pruebas y siguió `AGENTS.md`.

| Archivo | Contenido |
|---|---|
| [`corridas.jsonl`](corridas.jsonl) | Las 6 ejecuciones del harness, en orden |
| [`commits.txt`](commits.txt) | Un commit por ronda |
| [`cambios.patch`](cambios.patch) | Todo lo que cambió el agente |
| [`despues/`](despues) | La app corregida |

El agente no modificó el modelo simulado, las pruebas ni los presupuestos. La prueba de Estado pasó en la ronda 3, al reutilizar las filas; la ronda 5 la pidió la guía de `AGENTS.md`, no una prueba.

Las instrucciones exactas que recibió el agente están en [`AGENTS-usado-en-la-corrida.md`](AGENTS-usado-en-la-corrida.md). Después se cambió la palabra "sensores" por "pruebas" en la base, sin tocar lo que se mide.
