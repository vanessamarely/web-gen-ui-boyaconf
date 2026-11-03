// Tools de WebMCP del Mercado campesino. Cada execute llama la MISMA lógica que los botones
// (el store): la persona y el agente comparten un solo estado.
//  · Las tools que cambian la lista aceptan `version`: si la lista cambió, responden "vuelve a leer".
//  · Los cambios del agente quedan en el historial (deshacer) y se anuncian (aria-live).
//  · enviar_pedido es irreversible: consequentialHint + confirmación en pantalla.
import { BY_ID, buscar, fmtCOP } from '../catalog';
import { mercado } from '../store';
import { detectarPlato, type Pedido } from '../genui/planner';
import { metrics } from '../lab/metrics';
import { trackSpan } from '../lab/perf-tracks';
import { anunciar, fin, inicio } from './actividad';
import { getModelContext, validate, type ModelContextTool } from './webmcp';

export interface ToolHost {
  generar(p: Pedido, signal?: AbortSignal): Promise<{ cambios: number }>;
  confirmar(texto: string): Promise<boolean>;
}

const versionVieja = (v: unknown) =>
  typeof v === 'number' && v !== mercado.version ? `Error: la lista cambió (versión actual ${mercado.version}, tú viste la ${v}). Llama ver_mercado y vuelve a intentar.` : null;

export const TOOLS: ModelContextTool[] = [];

export function crearTools(host: ToolHost): ModelContextTool[] {
  const t: ModelContextTool[] = [
    {
      name: 'ver_mercado',
      description: 'Devuelve la lista actual del mercado: versión, personas, presupuesto, total y cada producto (cantidad, si ya se compró y si la persona lo editó).',
      inputSchema: { type: 'object', properties: {} },
      annotations: { readOnlyHint: true },
      execute: () => JSON.stringify(mercado.resumenParaAgente()),
    },
    {
      name: 'buscar_productos',
      description: 'Busca productos del catálogo de la plaza por nombre. Úsala para obtener el id antes de agregar o marcar.',
      inputSchema: { type: 'object', properties: { texto: { type: 'string', description: 'nombre o parte del nombre, p. ej. "uchuva"' } }, required: ['texto'] },
      annotations: { readOnlyHint: true },
      execute: ({ texto }) => {
        const r = buscar(String(texto)).slice(0, 5);
        return r.length ? JSON.stringify(r.map((p) => ({ id: p.id, nombre: p.nombre, precio: p.precio, unidad: p.unidad }))) : `Error: no encontré "${texto}". Prueba con otra palabra.`;
      },
    },
    {
      name: 'armar_mercado',
      description: 'Arma (o rehace) la lista del mercado de la semana por puestos según personas, presupuesto en pesos y el plato principal. La lista aparece en streaming.',
      inputSchema: {
        type: 'object',
        properties: {
          personas: { type: 'integer', minimum: 1, maximum: 12, description: 'cuántas personas comen' },
          presupuesto: { type: 'integer', minimum: 20000, maximum: 1000000, description: 'pesos colombianos' },
          plato: { type: 'string', enum: ['cuchuco', 'mute', 'sopa'], description: 'plato principal de la semana' },
        },
        required: ['personas', 'presupuesto'],
      },
      execute: async ({ personas, presupuesto, plato }, { signal }) => {
        const r = await host.generar({ personas: Number(personas), presupuesto: Number(presupuesto), plato: String(plato ?? 'cuchuco') }, signal);
        return `Listo: ${mercado.items.size} productos en ${mercado.plan.length} puestos, total ${fmtCOP(mercado.total)} (${r.cambios} cambios). Versión ${mercado.version}.`;
      },
    },
    {
      name: 'ajustar_presupuesto',
      description: 'Refina la lista existente para otro presupuesto o número de personas SIN rehacerla: conserva lo que la persona ya marcó o editó.',
      inputSchema: {
        type: 'object',
        properties: {
          presupuesto: { type: 'integer', minimum: 20000, maximum: 1000000 },
          personas: { type: 'integer', minimum: 1, maximum: 12 },
          version: { type: 'integer', description: 'versión que devolvió ver_mercado' },
        },
        required: ['presupuesto', 'version'],
      },
      execute: async ({ presupuesto, personas, version }, { signal }) => {
        const err = versionVieja(version);
        if (err) return err;
        const antes = { comprados: mercado.comprados, notas: [...mercado.items.values()].filter((i) => i.nota).length };
        const r = await host.generar({ personas: Number(personas ?? mercado.personas), presupuesto: Number(presupuesto), plato: mercado.plato }, signal);
        const despues = { comprados: mercado.comprados, notas: [...mercado.items.values()].filter((i) => i.nota).length };
        const perdidos = antes.comprados - despues.comprados + (antes.notas - despues.notas);
        return `Ajustado a ${fmtCOP(Number(presupuesto))}: ${r.cambios} cambios, total ${fmtCOP(mercado.total)}. ${perdidos > 0 ? `Se perdieron ${perdidos} marcas o notas de la persona.` : 'Lo que la persona marcó o anotó se conservó.'}`;
      },
    },
    {
      name: 'agregar_producto',
      description: 'Agrega un producto del catálogo a la lista (o cambia su cantidad si ya estaba y la persona no la fijó).',
      inputSchema: { type: 'object', properties: { id: { type: 'string', description: 'id de buscar_productos' }, cantidad: { type: 'number', minimum: 0.5, description: 'kg, lb o unidades' } }, required: ['id', 'cantidad'] },
      execute: ({ id, cantidad }) => {
        const r = mercado.agregar(String(id), Number(cantidad), 'Lo pidió la persona');
        return r.ok ? `Agregado: ${r.nombre}.` : `Error: ${r.error}`;
      },
    },
    {
      name: 'quitar_producto',
      description: 'Quita un producto de la lista.',
      inputSchema: { type: 'object', properties: { id: { type: 'string' }, version: { type: 'integer' } }, required: ['id', 'version'] },
      execute: ({ id, version }) => {
        const err = versionVieja(version);
        if (err) return err;
        const r = mercado.quitar(String(id));
        return r.ok ? `Quitado: ${r.nombre}.` : `Error: ${r.error}`;
      },
    },
    {
      name: 'marcar_comprado',
      description: 'Marca un producto de la lista como ya comprado (o lo desmarca).',
      inputSchema: { type: 'object', properties: { id: { type: 'string' }, comprado: { type: 'boolean' }, version: { type: 'integer' } }, required: ['id', 'version'] },
      execute: ({ id, comprado, version }) => {
        const err = versionVieja(version);
        if (err) return err;
        const r = mercado.marcar(String(id), comprado !== false);
        return r.ok ? `${r.nombre}: ${comprado === false ? 'pendiente' : 'comprado'}.` : `Error: ${r.error}`;
      },
    },
    {
      name: 'enviar_pedido',
      description: 'Envía la lista a los puestos para que la tengan lista. IRREVERSIBLE: la página le pide confirmación a la persona.',
      inputSchema: { type: 'object', properties: { version: { type: 'integer' } }, required: ['version'] },
      annotations: { consequentialHint: true },
      execute: async ({ version }) => {
        const err = versionVieja(version);
        if (err) return err;
        if (!mercado.items.size) return 'Error: la lista está vacía.';
        const ok = await host.confirmar(`¿Enviar a los puestos ${mercado.items.size} productos por ${fmtCOP(mercado.total)}?`);
        return ok ? `Pedido enviado: MC-${(mercado.version * 7919) % 100000}.` : 'La persona canceló el envío.';
      },
    },
  ];
  TOOLS.splice(0, TOOLS.length, ...t);
  return t;
}

const CAMBIA = new Set(['armar_mercado', 'ajustar_presupuesto', 'agregar_producto', 'quitar_producto', 'marcar_comprado']);

function detalleInicio(name: string, a: Record<string, unknown>) {
  if (name === 'armar_mercado') return `Armando el mercado para ${a.personas} con ${fmtCOP(Number(a.presupuesto))}…`;
  if (name === 'ajustar_presupuesto') return `Ajustando a ${fmtCOP(Number(a.presupuesto))}…`;
  if (name === 'buscar_productos') return `Buscando "${a.texto}"…`;
  if (a.id && BY_ID.has(String(a.id))) return `${BY_ID.get(String(a.id))!.nombre}…`;
  return 'Leyendo la lista…';
}

/** Envuelve cada tool: actividad visible, historial para deshacer, anuncio y pista en DevTools. */
function instrumentar(tool: ModelContextTool): ModelContextTool {
  return {
    ...tool,
    execute: async (input, opts) => {
      const t0 = performance.now();
      metrics.tools++;
      const ev = inicio(tool.name, input, detalleInicio(tool.name, input));
      const snap = CAMBIA.has(tool.name) ? mercado.snapshot() : undefined;
      try {
        const err = validate(tool.inputSchema, input);
        const out = err ? `Error: ${err}` : String(await tool.execute(input, opts));
        const ok = !out.startsWith('Error') && !out.includes('canceló');
        const accion = ok && snap ? mercado.registrar(tool.name.replace('_', ' '), 'agente', snap) : undefined;
        fin(ev, ok ? 'ok' : 'error', out.length > 140 && tool.name === 'ver_mercado' ? `versión ${mercado.version} · ${mercado.items.size} productos` : out, ok ? accion : undefined);
        if (ok && accion) anunciar(`El agente: ${out}`);
        trackSpan('Tools', tool.name, t0, performance.now(), ok ? 'tertiary' : 'warning');
        return out;
      } catch (e) {
        const cancel = (e as DOMException).name === 'AbortError';
        fin(ev, cancel ? 'cancel' : 'error', cancel ? 'Cancelado por la persona' : String(e));
        throw e;
      }
    },
  };
}

/** Registra las tools en document.modelContext (nativo o polyfill). Devuelve si es nativo. */
export async function registrarTools(host: ToolHost, signal: AbortSignal) {
  const { mc, native } = getModelContext();
  for (const tool of crearTools(host)) {
    const t = instrumentar(tool);
    TOOLS.splice(TOOLS.findIndex((x) => x.name === t.name), 1, t);
    await mc.registerTool(t, { signal });
  }
  return { mc, native };
}

/** Ejecuta una tool como lo haría un agente: por document.modelContext si se puede, si no, directo. */
export async function ejecutar(name: string, args: Record<string, unknown>, signal?: AbortSignal): Promise<string> {
  const { mc } = getModelContext();
  const tools = await mc.getTools?.().catch(() => []);
  const reg = tools?.find((x) => x.name === name);
  if (reg && typeof mc.executeTool === 'function') return String(await mc.executeTool(reg, args, { signal }));
  const t = TOOLS.find((x) => x.name === name);
  if (!t) return `Error: no existe la tool ${name}`;
  return String(await t.execute(args, { signal }));
}

export { detectarPlato };
