// Motor de IA: Gemini Nano en el navegador (Prompt API) si está disponible y se pidió con
// ?engine=nano; si no, el planificador determinista (planner.ts). Ambos devuelven DATOS
// validados por un schema: ids del catálogo y cantidades, nunca HTML.
import { CATALOGO, PUESTOS, BY_ID } from '../catalog';
import { PLATOS, redondear, type ListaGenerada, type Pedido } from './planner';

interface LMSession {
  prompt(input: string, opts?: { responseConstraint?: unknown; signal?: AbortSignal }): Promise<string>;
  destroy(): void;
}
interface LMStatic {
  availability(opts?: unknown): Promise<string>;
  create(opts?: unknown): Promise<LMSession>;
}
const LM = () => (globalThis as unknown as { LanguageModel?: LMStatic }).LanguageModel;
const LANG = { expectedInputs: [{ type: 'text', languages: ['es'] }], expectedOutputs: [{ type: 'text', languages: ['es'] }] };
export const pideNano = () => new URLSearchParams(location.search).get('engine') === 'nano';

let disponible: Promise<boolean> | null = null;
export function nanoDisponible(): Promise<boolean> {
  if (!pideNano()) return Promise.resolve(false);
  disponible ??= (async () => {
    try {
      return LM() ? (await LM()!.availability(LANG)) === 'available' : false;
    } catch {
      return false;
    }
  })();
  return disponible;
}

/** Schema de salida: el modelo solo puede elegir ids del catálogo (enum). */
export const LISTA_SCHEMA = {
  type: 'object',
  properties: {
    lineas: {
      type: 'array',
      maxItems: 22,
      items: {
        type: 'object',
        properties: { id: { type: 'string', enum: CATALOGO.map((p) => p.id) }, cantidad: { type: 'number' }, razon: { type: 'string' } },
        required: ['id', 'cantidad', 'razon'],
      },
    },
    consejo: { type: 'string' },
  },
  required: ['lineas', 'consejo'],
};

export async function listaConNano(p: Pedido, signal?: AbortSignal): Promise<ListaGenerada | null> {
  try {
    const s = await LM()!.create({ ...LANG, signal });
    const catalogo = CATALOGO.map((x) => `${x.id}: ${x.nombre}, $${x.precio}/${x.unidad}`).join('\n');
    const raw = await s.prompt(
      `Eres el asistente de una plaza de mercado en Tunja (Boyacá). Arma el mercado de la semana para ${p.personas} personas con ${p.presupuesto} pesos, que incluya los ingredientes para ${PLATOS[p.plato]?.nombre ?? 'un cuchuco'}. Usa SOLO estos productos (id exacto):\n${catalogo}\nNo te pases del presupuesto. Razones de máximo 6 palabras.`,
      { responseConstraint: LISTA_SCHEMA, signal },
    );
    s.destroy();
    const data = JSON.parse(raw) as { lineas: { id: string; cantidad: number; razon: string }[]; consejo: string };
    // Validamos en código: el schema es una pista, el código es la ley.
    const seen = new Set<string>();
    const lineas = data.lineas.filter((l) => BY_ID.has(l.id) && !seen.has(l.id) && seen.add(l.id)).map((l) => ({ ...l, cantidad: redondear(l.id, l.cantidad || 1) }));
    if (!lineas.length) return null;
    const orden = PUESTOS.map((x) => x.id);
    lineas.sort((a, b) => orden.indexOf(BY_ID.get(a.id)!.puesto) - orden.indexOf(BY_ID.get(b.id)!.puesto));
    const plan = orden.map((puesto) => ({ puesto, items: lineas.filter((l) => BY_ID.get(l.id)!.puesto === puesto).length })).filter((x) => x.items > 0);
    return { plan, lineas, consejo: data.consejo.slice(0, 160) };
  } catch (e) {
    if ((e as DOMException).name === 'AbortError') throw e;
    console.warn('[engine] Nano falló, uso el planificador:', e);
    return null;
  }
}
