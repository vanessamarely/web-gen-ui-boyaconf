# Mercado generativo

La IA elige qué interfaz mostrar. La web debe seguir siendo rápida, segura y accesible.

## Reglas

1. El texto del modelo nunca se ejecuta como HTML.
2. La pantalla se actualiza por tandas, no con cada pedazo de la respuesta.
3. Lo que ya está en pantalla se reutiliza por su clave.
4. Lo que cambió la persona gana sobre lo que sugiere la IA.
5. Cada campo tiene nombre y el estado se anuncia sin saturar.

## Antes de entregar

Ejecuta `npx playwright test`. Si una regla falla, corrige el código y vuelve a ejecutarla.
