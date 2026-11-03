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
    topic: 'Web agéntica',
    text: '¿Qué agrega WebMCP a la web agéntica?',
    options: [
      { id: 'a', label: 'Un modelo de IA dentro de Chrome que genera páginas completas' },
      { id: 'b', label: 'Que tu página exponga tools con nombre, descripción y JSON Schema que un agente puede llamar' },
      { id: 'c', label: 'Un protocolo para que los servidores hablen con bases de datos' },
      { id: 'd', label: 'Un framework de JavaScript para hacer chatbots' },
    ],
  },
  q2: {
    id: 'q2',
    topic: 'Reutilizar el DOM',
    text: 'Le pides al agente "súbele el presupuesto" y regenera la lista. ¿Cómo evitas perder lo que ya marcaste?',
    options: [
      { id: 'a', label: 'Reemplazar toda la lista con innerHTML, que es más simple' },
      { id: 'b', label: 'Recargar la página con el nuevo presupuesto' },
      { id: 'c', label: 'Reconciliar por id estable y aplicar solo los cambios' },
      { id: 'd', label: 'Pedirle al modelo que vuelva a escribir lo que marcaste' },
    ],
  },
  q3: {
    id: 'q3',
    topic: 'Estado',
    text: 'El agente (con una tool de WebMCP) y la persona (con un botón) cambian la misma lista. ¿Qué es lo correcto?',
    options: [
      { id: 'a', label: 'Que el agente tenga su propia copia de la lista' },
      { id: 'b', label: 'Que los dos llamen la misma lógica sobre un solo estado, con versión' },
      { id: 'c', label: 'Que el agente haga clic en los botones de la página' },
      { id: 'd', label: 'Que la última regeneración del modelo siempre gane' },
    ],
  },
};
