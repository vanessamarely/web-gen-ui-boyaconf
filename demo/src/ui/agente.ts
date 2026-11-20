// Web agéntica: un agente usa la página llamando acciones (tools de WebMCP), nunca tocando el DOM.
// Gemini Nano elige la acción y sus argumentos. Sin Nano, un intérprete simple llama las mismas acciones.
import { BY_ID, CATALOGO } from '../catalog';

export interface Acciones {
  agregar(id: string, cantidad: number): string | null;
  cambiar(id: string, cantidad: number): string | null;
  quitar(id: string): string | null;
  productos(): string[];
}
export interface Llamada { tool: string; args: { id: string; cantidad?: number } }

const IDS = CATALOGO.map((p) => p.id);
const TOOLS = [
  { name: 'agregar_producto', description: 'Agrega un producto a la lista del mercado.' },
  { name: 'cambiar_cantidad', description: 'Cambia la cantidad de un producto que ya está en la lista.' },
  { name: 'quitar_producto', description: 'Quita un producto de la lista.' },
] as const;
const ESQUEMA = { type: 'object', properties: { id: { type: 'string', enum: IDS }, cantidad: { type: 'number' } }, required: ['id'] };

/** Registra las acciones con WebMCP si el navegador lo trae; si no, quedan en un registro local. */
export async function registrar(acciones: Acciones): Promise<'nativo' | 'local'> {
  const mc = (document as unknown as { modelContext?: { registerTool(t: unknown): Promise<void> } }).modelContext;
  if (!mc) return 'local';
  for (const t of TOOLS)
    await mc.registerTool({ ...t, inputSchema: ESQUEMA, execute: (a: { id: string; cantidad?: number }) => ejecutar(acciones, { tool: t.name, args: a }) ?? 'Listo' }).catch(() => undefined);
  return 'nativo';
}

export function ejecutar(acciones: Acciones, l: Llamada): string | null {
  if (!BY_ID.has(l.args.id)) return 'Ese producto no existe en la plaza.';
  const cant = Math.min(20, Math.max(0.5, Number(l.args.cantidad) || 1));
  if (l.tool === 'agregar_producto') return acciones.agregar(l.args.id, cant);
  if (l.tool === 'cambiar_cantidad') return acciones.cambiar(l.args.id, cant);
  if (l.tool === 'quitar_producto') return acciones.quitar(l.args.id);
  return 'Acción desconocida.';
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
/** Plan B sin Nano: reconoce el verbo, el producto y la cantidad. */
export function interpretar(texto: string): Llamada | null {
  const t = norm(texto);
  const p = [...CATALOGO].sort((a, b) => b.nombre.length - a.nombre.length).find((x) => t.includes(norm(x.nombre)) || t.includes(norm(x.nombre).replace(/s$/, '')));
  if (!p) return null;
  const cantidad = Number((t.match(/(\d+(?:[.,]\d+)?)/)?.[1] ?? '1').replace(',', '.'));
  const tool = /quita|saca|elimina|borra/.test(t) ? 'quitar_producto' : /cambia|deja|ajusta|pon /.test(t) ? 'cambiar_cantidad' : 'agregar_producto';
  return { tool, args: { id: p.id, cantidad } };
}

interface Sesion { prompt(t: string, o?: unknown): Promise<string>; destroy(): void }
const LM = () => (globalThis as unknown as { LanguageModel?: { create(o?: unknown): Promise<Sesion> } }).LanguageModel;
const IDIOMA = { expectedInputs: [{ type: 'text', languages: ['es'] }], expectedOutputs: [{ type: 'text', languages: ['es'] }] };

/** Gemini Nano decide qué acción llamar, con salida estructurada. */
export async function decidirConNano(texto: string, enLista: string[], signal?: AbortSignal): Promise<Llamada | null> {
  const s = await LM()!.create({ ...IDIOMA, signal });
  try {
    const salida = await s.prompt(
      `Eres un agente que usa la web de una plaza de mercado. Acciones disponibles:
${TOOLS.map((t) => `- ${t.name}: ${t.description}`).join('\n')}
Productos en la lista: ${enLista.join(', ') || 'ninguno'}.
Productos del catálogo: ${CATALOGO.map((p) => `${p.id} (${p.nombre}, ${p.unidad})`).join(', ')}.
Elige una sola acción para este pedido de la persona: "${texto}"`,
      { responseConstraint: { type: 'object', properties: { tool: { type: 'string', enum: TOOLS.map((t) => t.name) }, id: { type: 'string', enum: IDS }, cantidad: { type: 'number' } }, required: ['tool', 'id'] }, signal },
    );
    const d = JSON.parse(salida) as { tool: string; id: string; cantidad?: number };
    return { tool: d.tool, args: { id: d.id, cantidad: d.cantidad } };
  } finally {
    s.destroy();
  }
}
