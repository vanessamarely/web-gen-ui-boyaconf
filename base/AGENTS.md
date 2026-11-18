# Instrucciones para el agente de IA

Esta app genera su interfaz con la respuesta de un modelo en streaming. Tu trabajo termina cuando pasan todas las pruebas, no cuando el código compila.

## Cómo trabajar

1. Ejecuta `npm run harness` antes de cambiar nada.
2. Corrige solo la primera prueba que falle.
3. Vuelve a ejecutar `npm run harness`. Repite hasta llegar a 5/5.
4. No cambies `src/modelo.ts`, `harness/check.mjs` ni `harness/presupuestos.json`. Si una prueba parece equivocada, detente y explícalo.

## Reglas de la interfaz

- **Renderizado:** reserva el espacio final antes de que llegue el contenido. Usa el mensaje `plan`.
- **Streaming:** procesa cada línea completa una sola vez y pinta como máximo una vez por frame.
- **DOM:** cada fila se identifica por su `id`. Actualiza solo lo que cambió; no reemplaces la lista con `innerHTML`.
- **Estado:** lo que hizo la persona (marcas y notas) vive aparte de lo que genera el modelo. Una regeneración nunca lo borra.
- **Accesibilidad:** marca la lista con `aria-busy` mientras se genera, anuncia el resultado en una región de estado y da nombre accesible a cada campo.

## Comandos

- `npm run dev`: abre la app en `http://localhost:5293`.
- `npm run harness`: mide la experiencia en Chrome con CPU limitada.
