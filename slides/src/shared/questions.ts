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
    topic: 'Renderizado, streaming y DOM',
    text: 'Mientras la IA responde por partes, ¿qué conviene hacer?',
    options: [
      { id: 'a', label: 'Reemplazar toda la interfaz con cada pedazo' },
      { id: 'b', label: 'Mostrar como HTML lo que escribe el modelo' },
      { id: 'c', label: 'Actualizar por tandas y reutilizar lo que ya está' },
      { id: 'd', label: 'Ocultar la pantalla hasta que termine' },
    ],
  },
  q3: {
    id: 'q3',
    topic: 'La idea de la charla',
    text: 'La UI generativa cambia cómo construimos la web, pero…',
    options: [
      { id: 'a', label: '…la IA ya se encarga de todo' },
      { id: 'b', label: '…el rendimiento deja de importar' },
      { id: 'c', label: '…ya no hacen falta las pruebas' },
      { id: 'd', label: '…seguimos respondiendo por quien la usa' },
    ],
  },
};
