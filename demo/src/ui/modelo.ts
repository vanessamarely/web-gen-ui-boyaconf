// Gemini Nano en el navegador. Donde no existe (como en los celulares), se usa una respuesta grabada de Nano.
import grabaciones from './grabaciones.json';
import { ESQUEMA, instrucciones } from './esquema';

interface Sesion { promptStreaming(t: string, o?: unknown): ReadableStream<string>; destroy(): void }
interface API { availability(o?: unknown): Promise<string>; create(o?: unknown): Promise<Sesion> }
const LM = () => (globalThis as unknown as { LanguageModel?: API }).LanguageModel;
const IDIOMA = { expectedInputs: [{ type: 'text', languages: ['es'] }], expectedOutputs: [{ type: 'text', languages: ['es'] }] };
const params = new URLSearchParams(location.search);

export interface Grabacion { pedido: string; trozos: [string, number][] }
const GRABADAS = grabaciones as Grabacion[];
export const PEDIDOS = ['Arma un mercado para 4 personas con 120 mil', '¿Dónde está más barata la papa?', '¿Qué cocino con papa, habas y cubios?'];
export let ultima: Grabacion | null = null;

export async function motor(): Promise<'nano' | 'grabacion'> {
  if (params.get('motor') === 'grabacion' || !LM()) return 'grabacion';
  try {
    return (await LM()!.availability(IDIOMA)) === 'available' ? 'nano' : 'grabacion';
  } catch {
    return 'grabacion';
  }
}

const espera = (ms: number, signal?: AbortSignal) => new Promise<void>((ok, no) => {
  const t = setTimeout(ok, ms);
  signal?.addEventListener('abort', () => (clearTimeout(t), no(new DOMException('Cancelado', 'AbortError'))), { once: true });
});

/** Prueba de seguridad: agrega a la respuesta un HTML que ejecuta código si la web lo inserta como HTML. */
export const prueba = { activa: params.has('inyectar') };
export const SCRIPT_DE_PRUEBA = "<img src=x onerror='window.__xss=(window.__xss||0)+1'>";
async function* conPrueba(fuente: AsyncGenerator<string>): AsyncGenerator<string> {
  let acumulado = '';
  let hecho = !prueba.activa;
  for await (const t of fuente) {
    if (hecho) { yield t; continue; }
    const antes = acumulado.length;
    acumulado += t;
    const m = /"texto"\s*:\s*"/.exec(acumulado);
    if (!m) { yield t; continue; }
    const corte = m.index + m[0].length - antes;
    yield t.slice(0, corte);
    yield SCRIPT_DE_PRUEBA;
    yield t.slice(corte);
    hecho = true;
  }
}

export function pedirAlModelo(pedido: string, signal?: AbortSignal): AsyncGenerator<string> {
  return conPrueba(desdeElModelo(pedido, signal));
}
/** Si Nano no responde, la demo sigue con la respuesta grabada y lo avisa. */
export const estadoMotor = { respaldo: false };
async function* desdeElModelo(pedido: string, signal?: AbortSignal): AsyncGenerator<string> {
  estadoMotor.respaldo = false;
  if ((await motor()) === 'nano') {
    let primero = true;
    try {
      for await (const t of desdeNano(pedido, signal)) {
        primero = false;
        yield t;
      }
      return;
    } catch (e) {
      if ((e as DOMException).name === 'AbortError' || !primero) throw e;
      console.warn('[modelo] Gemini Nano no respondió, uso la grabación:', e);
      estadoMotor.respaldo = true;
    }
  }
  yield* desdeGrabacion(pedido, signal);
}
async function* desdeGrabacion(pedido: string, signal?: AbortSignal): AsyncGenerator<string> {
  {
    const g = GRABADAS.find((x) => x.pedido === pedido) ?? GRABADAS[0];
    if (!g) throw new Error('No hay respuestas grabadas');
    for (const [t, dt] of g.trozos) {
      await espera(dt, signal);
      yield t;
    }
  }
}
async function* desdeNano(pedido: string, signal?: AbortSignal): AsyncGenerator<string> {
  // Si Nano tarda demasiado en empezar, se usa la grabación.
  const sesion = await Promise.race([LM()!.create({ ...IDIOMA, signal }), espera(15000, signal).then(() => { throw new Error('Nano tardó demasiado'); })]);
  const lector = sesion.promptStreaming(instrucciones(pedido), { responseConstraint: ESQUEMA, signal }).getReader();
  const trozos: [string, number][] = [];
  let previo = performance.now();
  try {
    for (;;) {
      const { value, done } = await lector.read();
      if (done) break;
      trozos.push([value, Math.round(performance.now() - previo)]);
      previo = performance.now();
      yield value;
    }
    ultima = { pedido, trozos };
  } finally {
    sesion.destroy();
  }
}
