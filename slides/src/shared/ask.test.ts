import { describe, expect, it } from 'vitest';
import { isOnTopic, respuestaDeLaCharla } from './ask';
import { SLIDES } from './content';

describe('preguntas solo sobre la charla', () => {
  it.each([
    '¿Puedo usar WebMCP con Angular?',
    '¿Cómo marco una tool como irreversible?',
    '¿Qué diferencia hay entre MCP y una API REST?',
    '¿Gemini Nano funciona en el celular?',
    '¿Cómo evito el prompt injection en las reseñas?',
    '¿El agente puede usar mi formulario de login?',
    '¿moveBefore funciona en Safari?',
    '¿Cómo evito el CLS cuando la UI se genera en streaming?',
    '¿Qué es exactamente la web agéntica?',
    'No entendí esa parte',
    '¿Me explicas otra vez lo último?',
  ])('acepta: %s', (q) => expect(isOnTopic(q)).toBe(true));

  it.each(['¿Qué comiste hoy?', '¿Dónde compraste tu blusa?', 'hola', '¿Cuál es tu equipo de fútbol?', 'qué puta charla de MCP'])('rechaza: %s', (q) =>
    expect(isOnTopic(q)).toBe(false),
  );
});

describe('respuesta con el contenido de la charla', () => {
  it.each([
    ['No entendí qué es un harness', /harness/i],
    ['¿Qué mide CLS en Core Web Vitals?', /medíamos/i],
    ['¿Qué es la web agéntica?', /agéntica/i],
  ])('encuentra: %s', (q, titulo) => expect(respuestaDeLaCharla(q, SLIDES)?.title).toMatch(titulo));
  it('no inventa una respuesta', () => expect(respuestaDeLaCharla('¿Sirve con kubernetes?', SLIDES)).toBeNull());
});
