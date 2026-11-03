// Streaming de la UI generativa.
//
// SIN FRICCIÓN · el modelo emite primero el PLAN (qué puestos y cuántos ítems) y luego CAMBIOS
//   pequeños por id (una línea JSON por cambio: add / replace / remove / done). Cada línea completa
//   se aplica una sola vez al store; el store avisa una vez por frame.
// INGENUO · el modelo reenvía la lista entera; en cada pedazo que llega se vuelve a leer TODO
//   lo recibido, se vacía la lista y se reconstruye (y la vista se pinta con innerHTML).
import { BY_ID, PUESTOS } from '../catalog';
import { mercado, type Cambio } from '../store';
import { trackSpan } from '../lab/perf-tracks';
import { generarLista, type ListaGenerada, type Pedido } from './planner';
import { listaConNano, nanoDisponible } from './engine';

export type Modo = 'fluido' | 'ingenuo';

const params = new URLSearchParams(location.search);
/** Caracteres por segundo del "modelo" (ajustable para ensayar: ?cps=600). */
export const CPS = Number(params.get('cps')) || 520;

/** Cambios para pasar del estado actual a la lista nueva. */
export function cambiosPara(lista: ListaGenerada, modo: Modo, refinando: boolean): Cambio[] {
  const out: Cambio[] = [];
  if (modo === 'ingenuo' || !refinando) {
    if (modo === 'fluido') out.push({ op: 'plan', plan: lista.plan });
    if (modo === 'fluido') out.push({ op: 'consejo', texto: lista.consejo });
    for (const p of PUESTOS) {
      const del = lista.lineas.filter((l) => BY_ID.get(l.id)!.puesto === p.id);
      if (!del.length) continue;
      for (const l of del) out.push({ op: 'add', item: l });
      if (modo === 'fluido') out.push({ op: 'done', puesto: p.id });
    }
    // En la versión ingenua el consejo llega AL FINAL y se inserta ARRIBA (empuja todo).
    if (modo === 'ingenuo') out.push({ op: 'consejo', texto: lista.consejo });
    out.push({ op: 'done' });
    return out;
  }
  // Refinar: solo lo que cambió, por id.
  const nuevos = new Map(lista.lineas.map((l) => [l.id, l]));
  out.push({ op: 'plan', plan: lista.plan });
  for (const p of PUESTOS) {
    let toca = false;
    for (const id of mercado.orden[p.id])
      if (!nuevos.has(id)) {
        out.push({ op: 'remove', id });
        toca = true;
      }
    for (const l of lista.lineas.filter((x) => BY_ID.get(x.id)!.puesto === p.id)) {
      const cur = mercado.items.get(l.id);
      if (!cur) out.push({ op: 'add', item: l });
      else if (cur.cantidad !== l.cantidad) out.push({ op: 'replace', id: l.id, cantidad: l.cantidad, razon: l.razon });
      else continue;
      toca = true;
    }
    if (toca || mercado.busy.has(p.id)) out.push({ op: 'done', puesto: p.id });
  }
  out.push({ op: 'consejo', texto: lista.consejo });
  out.push({ op: 'done' });
  return out;
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => (clearTimeout(t), reject(new DOMException('Cancelado', 'AbortError'))), { once: true });
  });

/** Texto en pedazos de 3–9 caracteres (semilla fija), en ráfagas como una red real. */
async function* trozos(texto: string, signal?: AbortSignal): AsyncGenerator<string> {
  let seed = 11;
  const TICK = 60;
  const porTick = Math.max(8, Math.round((CPS * TICK) / 1000));
  await sleep(250, signal); // tiempo al primer token
  for (let i = 0; i < texto.length; ) {
    let n = 0;
    while (n < porTick && i < texto.length) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff;
      const k = 3 + (seed % 7);
      yield texto.slice(i, i + k);
      i += k;
      n += k;
    }
    await sleep(TICK, signal);
  }
}

export interface ResultadoStream {
  cambios: number;
  ms: number;
}

/** Genera (o refina) la lista y la aplica al store según el modo. */
export async function generar(pedido: Pedido, modo: Modo, signal?: AbortSignal): Promise<ResultadoStream> {
  const t0 = performance.now();
  const refinando = mercado.items.size > 0;
  const lista = (await nanoDisponible()) ? ((await listaConNano(pedido, signal)) ?? generarLista(pedido)) : generarLista(pedido);
  const cambios = cambiosPara(lista, modo, refinando);
  const texto = cambios.map((c) => JSON.stringify(c)).join('\n') + '\n';
  mercado.setPedido(pedido);

  if (modo === 'fluido') {
    // Parser por líneas: cada carácter se lee una vez; cada línea completa es un cambio.
    let buf = '';
    for await (const t of trozos(texto, signal)) {
      buf += t;
      let nl: number;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const linea = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        const s = performance.now();
        mercado.aplicar(JSON.parse(linea) as Cambio, { respetarPersona: true });
        trackSpan('Cambios', JSON.parse(linea).op, s, performance.now(), 'secondary');
      }
    }
  } else {
    // Ingenuo: documento entero. En cada pedazo se relee TODO y se reconstruye la lista.
    let buf = '';
    for await (const t of trozos(texto, signal)) {
      buf += t;
      const s = performance.now();
      const completas = buf.split('\n').slice(0, -1);
      mercado.vaciar();
      for (const l of completas) mercado.aplicar(JSON.parse(l) as Cambio, { respetarPersona: false });
      mercado.flushNow(); // y se pinta en cada pedazo, sin esperar el frame
      trackSpan('Documento', `releer ${completas.length} líneas`, s, performance.now(), 'error');
    }
  }
  trackSpan('Stream', `${modo} · ${cambios.length} cambios`, t0, performance.now(), 'primary');
  return { cambios: cambios.length, ms: performance.now() - t0 };
}
