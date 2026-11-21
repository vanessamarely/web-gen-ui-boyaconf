// Gemini Nano en el computador de la presentadora responde las preguntas del público
// usando solo el contenido de la charla. La respuesta viaja al celular de quien preguntó.
import { SLIDES } from '../shared/content';

interface Sesion { prompt(t: string, o?: unknown): Promise<string>; destroy(): void }
interface API { availability(o?: unknown): Promise<string>; create(o?: unknown): Promise<Sesion> }
const LM = () => (globalThis as unknown as { LanguageModel?: API }).LanguageModel;
const IDIOMA = { expectedInputs: [{ type: 'text', languages: ['es'] }], expectedOutputs: [{ type: 'text', languages: ['es'] }] };

export async function nanoListo(): Promise<boolean> {
  try {
    return LM() ? (await LM()!.availability(IDIOMA)) === 'available' : false;
  } catch {
    return false;
  }
}

const CONTEXTO = SLIDES.filter((s) => s.kind === 'content')
  .map((s) => `- ${s.title}: ${s.summary.join(' ')}`)
  .join('\n')
  .slice(0, 5000);

export async function responderConNano(pregunta: string): Promise<string> {
  const s = await LM()!.create(IDIOMA);
  try {
    const r = await s.prompt(`Eres el asistente de la charla "UI generativa sin fricción" de Vanessa Aristizabal en BoyaConf 2026.
Responde la pregunta de una persona del público en español de Colombia, en máximo 3 frases cortas y claras.
Usa solo este contenido de la charla. Si la respuesta no está aquí, di que Vanessa la responderá al final.
Contenido:
${CONTEXTO}

Pregunta: "${pregunta}"`);
    return r.trim().slice(0, 600);
  } finally {
    s.destroy();
  }
}
