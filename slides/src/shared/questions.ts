// Las 3 preguntas del podio (estilo Kahoot), una al final de cada bloque de la charla.
// Aquí solo van el texto y las opciones: las respuestas correctas NO viven en el código
// (el bundle es público). Están en Firestore en un documento que solo la presentadora
// puede leer; al revelar, el deck publica únicamente la respuesta de esa pregunta.

export type QuestionId = 'q1' | 'q2' | 'q3';
export type OptionId = 'a' | 'b' | 'c' | 'd';
export const QUESTION_IDS: QuestionId[] = ['q1', 'q2', 'q3'];

export interface Question {
  id: QuestionId;
  /** bloque de la charla que evalúa */
  topic: string;
  text: string;
  options: { id: OptionId; label: string }[];
}

export type AnswerKey = Partial<Record<QuestionId, { correct: OptionId; explain: string }>>;

export function parseAnswerKey(raw: unknown): AnswerKey {
  const out: AnswerKey = {};
  if (!raw || typeof raw !== 'object') throw new Error('El archivo no es un JSON de respuestas');
  for (const q of QUESTION_IDS) {
    const a = (raw as Record<string, { correct?: string; explain?: string }>)[q];
    if (!a) continue;
    if (!['a', 'b', 'c', 'd'].includes(a.correct ?? '')) throw new Error(`${q}: "correct" debe ser a, b, c o d`);
    out[q] = { correct: a.correct as OptionId, explain: String(a.explain ?? '').slice(0, 400) };
  }
  if (!Object.keys(out).length) throw new Error('No encontré q1, q2 ni q3');
  return out;
}

export const QUESTIONS: Record<QuestionId, Question> = {
  q1: {
    id: 'q1',
    topic: 'Qué es un harness',
    text: '¿Qué hace un harness?',
    options: [
      { id: 'a', label: 'Escribe el código en lugar del agente' },
      { id: 'b', label: 'Le da instrucciones al agente y comprueba el resultado' },
      { id: 'c', label: 'Hace que la IA responda más rápido' },
      { id: 'd', label: 'Diseña la página sin usar código' },
    ],
  },
  q2: {
    id: 'q2',
    topic: 'Corrección 3',
    text: 'En la corrección 3, ¿qué evitó que la web borrara la lista y se perdiera la nota?',
    options: [
      { id: 'a', label: 'Reservar el espacio de la pantalla' },
      { id: 'b', label: 'Dibujar una sola vez por frame' },
      { id: 'c', label: 'Actualizar cada fila por su id' },
      { id: 'd', label: 'Ponerle nombre a cada campo' },
    ],
  },
  q3: {
    id: 'q3',
    topic: 'La frase de la charla',
    text: 'Completa la frase: La IA construye la página y…',
    options: [
      { id: 'a', label: '…la misma IA dice si quedó bien' },
      { id: 'b', label: '…el diseño dice si quedó bien' },
      { id: 'c', label: '…el modelo dice si quedó bien' },
      { id: 'd', label: '…las pruebas dicen si quedó bien' },
    ],
  },
};
