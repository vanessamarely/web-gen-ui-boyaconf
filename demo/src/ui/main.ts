// Mercado generativo: la misma web muestra una interfaz distinta según cada pedido.
import { motor, pedirAlModelo, PEDIDOS, prueba, ultima } from './modelo';
import { VistaDirecta } from './directo';
import { VistaPreparada } from './preparada';
import { conteo } from './conteo';
import { decidirConNano, ejecutar, interpretar, registrar } from './agente';

const $ = <T extends HTMLElement>(s: string) => document.querySelector<T>(s)!;
const params = new URLSearchParams(location.search);
const raiz = $<HTMLElement>('[data-superficie]');
const estado = $<HTMLElement>('[data-estado]');
const input = $<HTMLInputElement>('#q');
let modo = params.get('modo') === 'directo' ? 'directo' : 'preparada';
let vista: VistaDirecta | VistaPreparada;
let control: AbortController | null = null;

// ── Medidas reales de cada respuesta ─────────────────────────────────
const m = { cls: 0, congelamientos: 0, nodos: 0, anuncios: 0, ms: 0 };
/** Core Web Vitals de toda la visita: LCP al cargar, INP y CLS mientras la usas. */
const cwv = { lcp: 0, inp: 0, cls: 0 };
new PerformanceObserver((l) => { const e = l.getEntries().at(-1); if (e) cwv.lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
new PerformanceObserver((l) => { for (const e of l.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) if (!e.hadRecentInput) cwv.cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
try { new PerformanceObserver((l) => { for (const e of l.getEntries() as unknown as { duration: number; interactionId?: number }[]) if (e.interactionId) cwv.inp = Math.max(cwv.inp, e.duration); }).observe({ type: 'event', buffered: true, durationThreshold: 16 } as PerformanceObserverInit); } catch { /* navegador sin esta medida */ }
const reiniciar = () => Object.assign(m, { cls: 0, congelamientos: 0, nodos: 0, anuncios: 0, ms: 0 });
new PerformanceObserver((l) => { for (const e of l.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) if (!e.hadRecentInput) m.cls += e.value; }).observe({ type: 'layout-shift', buffered: false });
try { new PerformanceObserver((l) => { m.congelamientos += l.getEntries().filter((e) => e.duration > 50).length; }).observe({ type: 'long-animation-frame', buffered: false }); } catch { /* navegador sin esta medida */ }
new MutationObserver((l) => {
  for (const r of l) for (const n of r.addedNodes) if (n instanceof Element) m.nodos += 1 + n.querySelectorAll('*').length;
  if (raiz.hasAttribute('aria-live')) m.anuncios += 1;
}).observe(raiz, { childList: true, subtree: true });
new MutationObserver(() => { m.anuncios += 1; }).observe(estado, { childList: true, characterData: true, subtree: true });
const papa = () => { const i = document.querySelector<HTMLInputElement>('[data-cantidad="papa-pastusa"]'); return i ? `${i.value} kg` : '–'; };
function pintarCwv() {
  const bueno = (v: number, l: number) => (v <= l ? 'ok' : 'mal');
  $('[data-cwv]').innerHTML = `<b>Core Web Vitals</b><span class="${bueno(cwv.lcp, 2500)}">LCP ${(cwv.lcp / 1000).toFixed(1).replace('.', ',')} s</span><span class="${bueno(cwv.inp, 200)}">INP ${Math.round(cwv.inp)} ms</span><span class="${bueno(cwv.cls, 0.1)}">CLS ${cwv.cls.toFixed(2).replace('.', ',')}</span>`;
}
setInterval(pintarCwv, 500);
function pintarMedidas() {
  $('[data-medidas]').innerHTML = [['Script ejecutado', `${(window as unknown as { __xss?: number }).__xss ?? 0} veces`], ['Actualizaciones', conteo.pintadas], ['Elementos creados', m.nodos.toLocaleString('es-CO')], ['Papa pastusa', papa()], ['Avisos al lector', m.anuncios]].map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('');
}

function montar() {
  vista = modo === 'directo' ? new VistaDirecta(raiz) : new VistaPreparada(raiz, (t) => { estado.textContent = t; });
  raiz.replaceChildren();
  estado.textContent = '';
  document.querySelectorAll<HTMLElement>('[data-modo]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.modo === modo)));
  $('[data-explica]').innerHTML = modo === 'directo'
    ? '<b>Sin preparar:</b> muestra la respuesta de la IA tal como llega. Se ve igual, pero mira las medidas de abajo: no cumple las 5 reglas.'
    : '<b>Preparada:</b> la misma respuesta de la IA, pero cumple las 5 reglas: es segura, eficiente, respeta tus cambios y es accesible.';
  $('[data-explica]').insertAdjacentHTML('beforeend', '<br><b>Pruébalo:</b> pide un mercado y, mientras responde, cambia la papa pastusa a 5 kg.');
}
document.querySelectorAll<HTMLElement>('[data-modo]').forEach((b) => b.addEventListener('click', () => { modo = b.dataset.modo!; control?.abort(); montar(); }));

async function pedir(texto: string) {
  control?.abort();
  const mio = (control = new AbortController());
  reiniciar();
  conteo.pintadas = 0;
  (window as unknown as { __xss?: number }).__xss = 0;
  const progreso = $<HTMLElement>('[data-progreso]');
  progreso.textContent = `“${texto}” · ${document.body.dataset.motor === 'nano' ? 'Gemini Nano está respondiendo…' : 'reproduciendo la respuesta grabada de Gemini Nano…'}`;
  progreso.hidden = false;
  const vivo = setInterval(pintarMedidas, 250);
  vista.empezar();
  const t0 = performance.now();
  try {
    for await (const trozo of pedirAlModelo(texto, mio.signal)) vista.recibir(trozo);
    vista.terminar();
  } catch (e) {
    if ((e as DOMException).name !== 'AbortError') { console.error(e); estado.textContent = 'La IA no pudo responder. Intenta de nuevo.'; }
    return;
  } finally {
    clearInterval(vivo);
    if (control === mio) progreso.hidden = true;
  }
  m.ms = Math.round(performance.now() - t0);
  await new Promise((ok) => setTimeout(ok, 300));
  pintarMedidas();
  document.body.dataset.listo = String(Date.now());
}

$('[data-chips]').innerHTML = PEDIDOS.map((p) => `<button type="button">${p}</button>`).join('');
$('[data-chips]').addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest('button'); if (b) { input.value = b.textContent!; void pedir(input.value); } });
$<HTMLFormElement>('[data-pedido]').addEventListener('submit', (e) => { e.preventDefault(); void pedir(input.value.trim()); });
input.value = PEDIDOS[0];
const casilla = $<HTMLInputElement>('[data-prueba]');
casilla.checked = prueba.activa;
casilla.addEventListener('change', () => (prueba.activa = casilla.checked));
montar();
pintarMedidas();
void motor().then((x) => { $('[data-motor]').textContent = x === 'nano' ? 'Gemini Nano en este navegador' : 'Respuesta grabada de Gemini Nano'; document.body.dataset.motor = x; });
// ── Web agéntica: el agente usa la página con acciones ───────────────
const PEDIDOS_AGENTE = ['Agrega 2 kg de papa criolla', 'Cambia la arracacha a 3 kg', 'Quita las rubas'];
const registro = $<HTMLElement>('[data-registro]');
const anotar = (html: string, clase = '') => { registro.insertAdjacentHTML('afterbegin', `<li class="${clase}">${html}</li>`); while (registro.children.length > 6) registro.lastElementChild!.remove(); };
let via: 'nativo' | 'local' = 'local';
async function usarAgente(texto: string) {
  if (!(vista instanceof VistaPreparada)) return anotar('El agente funciona en la versión <b>Preparada</b>.', 'mal');
  if (!vista.productos().length) return anotar('Primero pídele un mercado a la IA: el agente trabaja sobre esa lista.', 'mal');
  const nano = document.body.dataset.motor === 'nano';
  anotar(`<span class="quien">Tú</span> “${texto.replace(/</g, '&lt;')}”`);
  let llamada = null;
  try {
    llamada = nano ? await decidirConNano(texto, vista.productos()) : interpretar(texto);
  } catch (e) {
    console.error(e);
  }
  if (!llamada) return anotar('El agente no encontró una acción para ese pedido.', 'mal');
  const args = `{ id: "${llamada.args.id}"${llamada.tool === 'quitar_producto' ? '' : `, cantidad: ${llamada.args.cantidad ?? 1}`} }`;
  const error = ejecutar(vista, llamada);
  anotar(`<span class="quien">${nano ? 'Gemini Nano' : 'Agente'}</span> llamó <code>${llamada.tool}(${args})</code>${error ? ` · ${error}` : ' ✓'}`, error ? 'mal' : 'ok');
}
$('[data-chips-agente]').innerHTML = PEDIDOS_AGENTE.map((p) => `<button type="button">${p}</button>`).join('');
$('[data-chips-agente]').addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest('button'); if (b) { $<HTMLInputElement>('#qa').value = b.textContent!; void usarAgente(b.textContent!); } });
$<HTMLFormElement>('[data-agente]').addEventListener('submit', (e) => { e.preventDefault(); const v = $<HTMLInputElement>('#qa').value.trim(); if (v) void usarAgente(v); });
void registrar({ agregar: (i, c) => (vista instanceof VistaPreparada ? vista.agregar(i, c) : 'No disponible'), cambiar: (i, c) => (vista instanceof VistaPreparada ? vista.cambiar(i, c) : 'No disponible'), quitar: (i) => (vista instanceof VistaPreparada ? vista.quitar(i) : 'No disponible'), productos: () => (vista instanceof VistaPreparada ? vista.productos() : []) }).then((v) => {
  via = v;
  $('.agente-nota').insertAdjacentHTML('beforeend', ` <small>${via === 'nativo' ? 'WebMCP nativo de Chrome.' : 'Tu navegador aún no trae WebMCP: las acciones se registran en la página.'}</small>`);
});

Object.assign(window, { uiDemo: { usarAgente, pedir, medidas: () => ({ ...m, pintadas: conteo.pintadas, xss: (window as unknown as { __xss?: number }).__xss ?? 0 }), grabacion: () => ultima } });
