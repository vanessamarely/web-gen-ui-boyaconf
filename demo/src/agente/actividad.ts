// Actividad del agente a la vista: cada llamada a una tool es un evento visible
// (también cuando la llama un agente del navegador desde fuera de la página).
export type Estado = 'run' | 'ok' | 'error' | 'cancel';
export interface Evento {
  id: number;
  tool: string;
  args: Record<string, unknown>;
  estado: Estado;
  detalle: string;
  /** id de la acción en el historial (para deshacer) */
  accion?: number;
  at: number;
}

let seq = 0;
export const eventos: Evento[] = [];
const listeners = new Set<(e: Evento) => void>();
export const onEvento = (fn: (e: Evento) => void) => (listeners.add(fn), () => listeners.delete(fn));
const emit = (e: Evento) => listeners.forEach((fn) => fn(e));

export function inicio(tool: string, args: Record<string, unknown>, detalle = 'Trabajando…'): Evento {
  const e: Evento = { id: ++seq, tool, args, estado: 'run', detalle, at: Date.now() };
  eventos.unshift(e);
  if (eventos.length > 30) eventos.length = 30;
  emit(e);
  return e;
}
export function fin(e: Evento, estado: Estado, detalle: string, accion?: number) {
  Object.assign(e, { estado, detalle, accion });
  emit(e);
}

// ── Anuncios para lectores de pantalla: cortos y espaciados (nunca uno por token) ──
const cola: string[] = [];
let ocupado = false;
export function anunciar(texto: string) {
  cola.push(texto);
  if (!ocupado) siguiente();
}
function siguiente() {
  const el = document.querySelector('[data-anuncio]');
  const t = cola.shift();
  if (!el || !t) return void (ocupado = false);
  ocupado = true;
  el.textContent = t;
  setTimeout(siguiente, 1600);
}
