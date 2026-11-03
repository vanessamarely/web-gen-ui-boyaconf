// El agente del Mercado campesino: SOLO actúa llamando las tools de WebMCP (nunca toca el DOM).
//  · nano → Gemini Nano (Prompt API) elige la tool y los argumentos con salida estructurada.
//  · sim  → un planificador determinista (plan B sin Nano o sin red) que llama las MISMAS tools.
// Antes de cambiar algo lee la lista (ver_mercado) para usar la versión vigente; si una tool
// responde "la lista cambió", vuelve a leer y reintenta una vez.
import { buscar } from '../catalog';
import { mercado } from '../store';
import { detectarPlato } from '../genui/planner';
import { TOOLS, ejecutar } from './tools';

export interface Respuesta {
  mensaje: string;
  llamadas: number;
}

const num = (t: string, re: RegExp) => {
  const m = t.match(re);
  return m ? Number(m[1].replace(/\./g, '')) : undefined;
};

/** Lo que entendió de la petición (personas, presupuesto, plato). */
export function entender(texto: string) {
  const t = texto.toLowerCase();
  const miles = num(t, /(\d+)\s*(?:mil|k)\b/);
  const pesos = num(t, /\$\s?([\d.]{5,})/);
  return {
    personas: num(t, /(\d+)\s*(?:personas?|pers|comensales)/) ?? num(t, /para\s+(\d+)/),
    presupuesto: miles ? miles * 1000 : pesos,
    plato: /mute|cebada|sopa|cuchuco/.test(t) ? detectarPlato(t) : undefined,
  };
}

type Paso = { tool: string; args: (v: number) => Record<string, unknown> };

/** Plan B: reglas simples que deciden qué tools llamar. */
function planSimulado(texto: string): Paso[] | string {
  const t = texto.toLowerCase();
  const e = entender(texto);
  const hay = mercado.items.size > 0;
  const producto = () => {
    const sin = t.replace(/\b(marca|marcar|como|comprad[oa]s?|ya|agrega|añade|agregar|pon|quita|saca|elimina|la|el|las|los|de|una?|kg|libras?|lb|\d+)\b/g, ' ');
    return buscar(sin)[0] ?? sin.split(/\s+/).map((w) => buscar(w)[0]).find(Boolean);
  };
  if (/env[ií]a|pedido|domicilio/.test(t)) return [{ tool: 'enviar_pedido', args: (v) => ({ version: v }) }];
  if (/marca|ya compr/.test(t)) {
    const p = producto();
    if (!p) return 'No encontré ese producto en la lista.';
    return [
      { tool: 'buscar_productos', args: () => ({ texto: p.nombre }) },
      { tool: 'marcar_comprado', args: (v) => ({ id: p.id, comprado: true, version: v }) },
    ];
  }
  if (/agrega|añade|\bpon\b|suma/.test(t)) {
    const p = producto();
    if (!p) return 'No encontré ese producto en el catálogo.';
    return [
      { tool: 'buscar_productos', args: () => ({ texto: p.nombre }) },
      { tool: 'agregar_producto', args: () => ({ id: p.id, cantidad: num(t, /(\d+(?:[.,]\d)?)\s*(?:kg|lb|libras?|und|unidades)/) ?? 1 }) },
    ];
  }
  if (/quita|saca|elimina/.test(t)) {
    const p = producto();
    if (!p) return 'No encontré ese producto en la lista.';
    return [{ tool: 'quitar_producto', args: (v) => ({ id: p.id, version: v }) }];
  }
  if (hay && (e.presupuesto || e.personas) && !/arma|nuevo|otra vez|desde cero/.test(t)) {
    return [{ tool: 'ajustar_presupuesto', args: (v) => ({ presupuesto: e.presupuesto ?? mercado.presupuesto, personas: e.personas ?? mercado.personas, version: v }) }];
  }
  return [{ tool: 'armar_mercado', args: () => ({ personas: e.personas ?? 4, presupuesto: e.presupuesto ?? 120000, plato: e.plato ?? 'cuchuco' }) }];
}

// ── Gemini Nano (opcional) ────────────────────────────────────────────
interface LMSession {
  prompt(i: string, o?: { responseConstraint?: unknown; signal?: AbortSignal }): Promise<string>;
  destroy(): void;
}
const LM = () => (globalThis as unknown as { LanguageModel?: { availability(o?: unknown): Promise<string>; create(o?: unknown): Promise<LMSession> } }).LanguageModel;
const LANG = { expectedInputs: [{ type: 'text', languages: ['es'] }], expectedOutputs: [{ type: 'text', languages: ['es'] }] };

async function planNano(texto: string, signal?: AbortSignal): Promise<Paso[] | null> {
  if (new URLSearchParams(location.search).get('engine') !== 'nano' || !LM()) return null;
  try {
    if ((await LM()!.availability(LANG)) !== 'available') return null;
    const s = await LM()!.create({ ...LANG, signal });
    const lista = TOOLS.filter((t) => t.name !== 'ver_mercado').map((t) => `- ${t.name}: ${t.description} args: ${JSON.stringify(t.inputSchema?.properties ?? {})}`).join('\n');
    const raw = await s.prompt(`Eres el agente de un mercado campesino en Tunja. Elige UNA tool para esta petición. No incluyas "version" (la página la agrega).\nTools:\n${lista}\nLista actual: ${JSON.stringify(mercado.resumenParaAgente())}\nPetición: ${texto}`, {
      responseConstraint: { type: 'object', properties: { tool: { type: 'string', enum: TOOLS.map((t) => t.name) }, argumentos: { type: 'object' } }, required: ['tool', 'argumentos'] },
      signal,
    });
    s.destroy();
    const { tool, argumentos } = JSON.parse(raw) as { tool: string; argumentos: Record<string, unknown> };
    return [{ tool, args: (v) => ({ ...argumentos, version: v }) }];
  } catch (e) {
    if ((e as DOMException).name === 'AbortError') throw e;
    return null;
  }
}

/** Atiende una petición en lenguaje natural usando solo tools. */
export async function atender(texto: string, signal?: AbortSignal): Promise<Respuesta> {
  const plan = (await planNano(texto, signal)) ?? planSimulado(texto);
  if (typeof plan === 'string') return { mensaje: plan, llamadas: 0 };
  let llamadas = 0;
  let ultima = '';
  for (const paso of plan) {
    const necesitaVersion = /version/.test(JSON.stringify(TOOLS.find((t) => t.name === paso.tool)?.inputSchema?.required ?? []));
    let version = mercado.version;
    if (necesitaVersion) {
      const leido = JSON.parse(await ejecutar('ver_mercado', {}, signal)) as { version: number };
      version = leido.version;
      llamadas++;
    }
    ultima = await ejecutar(paso.tool, paso.args(version), signal);
    llamadas++;
    if (/la lista cambió/.test(ultima)) {
      // La persona cambió algo mientras tanto: releer y reintentar una vez (sin pisar nada).
      const leido = JSON.parse(await ejecutar('ver_mercado', {}, signal)) as { version: number };
      ultima = await ejecutar(paso.tool, paso.args(leido.version), signal);
      llamadas += 2;
    }
    if (ultima.startsWith('Error')) break;
  }
  return { mensaje: ultima, llamadas };
}
