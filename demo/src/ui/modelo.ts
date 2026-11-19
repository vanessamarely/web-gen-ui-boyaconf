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

/** Solo para comprobar la seguridad: agrega HTML peligroso dentro del texto del modelo. */
function conContenidoExterno(trozos: [string, number][]): [string, number][] {
  if (!params.has('inyectar')) return trozos;
  const marca = '"texto": "';
  let acumulado = '';
  const salida: [string, number][] = [];
  let hecho = false;
  for (const [t, dt] of trozos) {
    const antes = acumulado.length;
    acumulado += t;
    const i = hecho ? -1 : acumulado.lastIndexOf(marca);
    if (i < 0 || !acumulado.slice(i + marca.length).length) { salida.push([t, dt]); continue; }
    const corte = i + marca.length - antes;
    salida.push([t.slice(0, corte), dt], ["<img src=x onerror='window.__xss=(window.__xss||0)+1'>", 0], [t.slice(corte), 0]);
    hecho = true;
  }
  return salida;
}

export async function* pedirAlModelo(pedido: string, signal?: AbortSignal): AsyncGenerator<string> {
  if ((await motor()) === 'grabacion') {
    const g = GRABADAS.find((x) => x.pedido === pedido) ?? GRABADAS[0];
    if (!g) throw new Error('No hay respuestas grabadas');
    for (const [t, dt] of conContenidoExterno(g.trozos)) {
      await espera(dt, signal);
      yield t;
    }
    return;
  }
  const sesion = await LM()!.create({ ...IDIOMA, signal });
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
