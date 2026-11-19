// Mercado generativo: la misma web muestra una interfaz distinta según cada pedido.
import { motor, pedirAlModelo, PEDIDOS, ultima } from './modelo';
import { VistaDirecta } from './directo';
import { VistaPreparada } from './preparada';
import { conteo } from './conteo';

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
const reiniciar = () => Object.assign(m, { cls: 0, congelamientos: 0, nodos: 0, anuncios: 0, ms: 0 });
new PerformanceObserver((l) => { for (const e of l.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) if (!e.hadRecentInput) m.cls += e.value; }).observe({ type: 'layout-shift', buffered: false });
try { new PerformanceObserver((l) => { m.congelamientos += l.getEntries().filter((e) => e.duration > 50).length; }).observe({ type: 'long-animation-frame', buffered: false }); } catch { /* navegador sin esta medida */ }
new MutationObserver((l) => {
  for (const r of l) for (const n of r.addedNodes) if (n instanceof Element) m.nodos += 1 + n.querySelectorAll('*').length;
  if (raiz.hasAttribute('aria-live')) m.anuncios += 1;
}).observe(raiz, { childList: true, subtree: true });
new MutationObserver(() => { m.anuncios += 1; }).observe(estado, { childList: true, characterData: true, subtree: true });
function pintarMedidas() {
  $('[data-medidas]').innerHTML = [['Saltos (CLS)', m.cls.toFixed(3)], ['Congelamientos', m.congelamientos], ['Elementos creados', m.nodos.toLocaleString('es-CO')], ['Anuncios', m.anuncios]].map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('');
}

function montar() {
  vista = modo === 'directo' ? new VistaDirecta(raiz) : new VistaPreparada(raiz, (t) => { estado.textContent = t; });
  raiz.replaceChildren();
  estado.textContent = '';
  document.querySelectorAll<HTMLElement>('[data-modo]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.modo === modo)));
}
document.querySelectorAll<HTMLElement>('[data-modo]').forEach((b) => b.addEventListener('click', () => { modo = b.dataset.modo!; control?.abort(); montar(); }));

async function pedir(texto: string) {
  control?.abort();
  const mio = (control = new AbortController());
  reiniciar();
  conteo.pintadas = 0;
  vista.empezar();
  const t0 = performance.now();
  try {
    for await (const trozo of pedirAlModelo(texto, mio.signal)) vista.recibir(trozo);
    vista.terminar();
  } catch (e) {
    if ((e as DOMException).name !== 'AbortError') { console.error(e); estado.textContent = 'La IA no pudo responder. Intenta de nuevo.'; }
    return;
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
montar();
pintarMedidas();
void motor().then((x) => { $('[data-motor]').textContent = x === 'nano' ? 'Gemini Nano en este navegador' : 'Respuesta grabada de Gemini Nano'; document.body.dataset.motor = x; });
Object.assign(window, { uiDemo: { pedir, medidas: () => ({ ...m, pintadas: conteo.pintadas, xss: (window as unknown as { __xss?: number }).__xss ?? 0 }), grabacion: () => ultima } });
