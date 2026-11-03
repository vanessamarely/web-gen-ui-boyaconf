// Mercado campesino: un agente arma tu mercado de la semana con tools de WebMCP mientras la
// lista se genera en streaming. Interruptor Ingenuo ↔ Sin fricción para la charla.
import { fmtCOP } from './catalog';
import { mercado } from './store';
import { generar, type Modo } from './genui/stream';
import { VistaFluida, VistaIngenua, type Vista } from './genui/render';
import { nanoDisponible, pideNano } from './genui/engine';
import { atender } from './agente/agente';
import { eventos, onEvento, type Evento } from './agente/actividad';
import { registrarTools, ejecutar } from './agente/tools';
import { montarInspector } from './agente/inspector';
import { metrics, resetMetrics, startMetrics } from './lab/metrics';
import { mountHud } from './lab/hud';
import { esc } from './esc';

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;
const params = new URLSearchParams(location.search);
let modo: Modo = params.get('modo') === 'ingenuo' ? 'ingenuo' : 'fluido';

const lista = $('#lista');
startMetrics(lista);
mountHud($('#hud'));

// ── Vista según el modo ──────────────────────────────────────────────
let vista: Vista | null = null;
function montarVista() {
  vista?.desmontar();
  vista = modo === 'fluido' ? new VistaFluida() : new VistaIngenua();
  vista.montar(lista);
  document.body.dataset.modo = modo;
  document.querySelectorAll<HTMLButtonElement>('[data-modo]').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.modo === modo)));
}
function setModo(m: Modo) {
  modo = m;
  const u = new URL(location.href);
  u.searchParams.set('modo', m);
  history.replaceState(null, '', u);
  montarVista();
  resetMetrics();
}
document.querySelectorAll<HTMLButtonElement>('[data-modo]').forEach((b) => b.addEventListener('click', () => setModo(b.dataset.modo as Modo)));
montarVista();

// ── Resumen (todo derivado en código, no por el modelo) ──────────────
const resumen = $('[data-resumen]');
function pintarResumen() {
  const total = mercado.total;
  const sobra = mercado.presupuesto - total;
  const pct = Math.min(100, (total / mercado.presupuesto) * 100 || 0);
  resumen.innerHTML = mercado.items.size
    ? `<div class="r-item"><small>Personas</small><b>${mercado.personas}</b></div>
       <div class="r-item"><small>Presupuesto</small><b>${fmtCOP(mercado.presupuesto)}</b></div>
       <div class="r-item"><small>Total</small><b>${fmtCOP(total)}</b></div>
       <div class="r-item ${sobra < 0 ? 'mal' : ''}"><small>${sobra < 0 ? 'Te pasas' : 'Te sobran'}</small><b>${fmtCOP(Math.abs(sobra))}</b></div>
       <div class="r-item"><small>Comprados</small><b>${mercado.comprados} / ${mercado.items.size}</b></div>
       <div class="r-bar" role="progressbar" aria-label="Presupuesto usado" aria-valuenow="${Math.round(pct)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${pct}%"></i></div>`
    : '<p class="r-vacio">El resumen aparece aquí cuando el agente arme tu lista.</p>';
}
mercado.suscribir('resumen', pintarResumen);
pintarResumen();

// ── El agente: petición → tools ──────────────────────────────────────
const SUGERENCIAS = ['Mercado para 4 con 120 mil, para un cuchuco', 'Súbele el presupuesto a 160 mil', 'Agrega 2 libras de uchuvas', 'Marca la papa pastusa como comprada', 'Envía el pedido'];
$('[data-sugerencias]').innerHTML = SUGERENCIAS.map((s) => `<button type="button" data-s="${esc(s)}">${esc(s)}</button>`).join('');
const input = $<HTMLInputElement>('#q');
const cancelar = $<HTMLButtonElement>('[data-cancelar]');
const respuesta = $('[data-respuesta]');
let ac: AbortController | null = null;

async function pedir(texto: string) {
  ac?.abort();
  const mine = (ac = new AbortController());
  cancelar.hidden = false;
  respuesta.hidden = true;
  try {
    const r = await atender(texto, mine.signal);
    respuesta.textContent = r.mensaje;
    respuesta.hidden = false;
  } catch (e) {
    if ((e as DOMException).name !== 'AbortError') console.error(e);
    respuesta.textContent = (e as DOMException).name === 'AbortError' ? 'Cancelaste al agente. Lo que alcanzó a hacer se puede deshacer.' : 'Algo falló; revisa la consola.';
    respuesta.hidden = false;
  } finally {
    if (ac === mine) cancelar.hidden = true;
  }
}
$<HTMLFormElement>('[data-pedido]').addEventListener('submit', (e) => {
  e.preventDefault();
  if (input.value.trim()) void pedir(input.value.trim());
});
$('[data-sugerencias]').addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-s]');
  if (!b) return;
  input.value = b.dataset.s!;
  void pedir(b.dataset.s!);
});
cancelar.addEventListener('click', () => ac?.abort());

// ── Actividad del agente (cada evento es un nodo por id: no se re-pinta todo) ──
const feed = $('[data-feed]');
const filasFeed = new Map<number, HTMLElement>();
const ICON: Record<Evento['estado'], string> = { run: '◌', ok: '✓', error: '!', cancel: '×' };
onEvento((ev) => {
  let li = filasFeed.get(ev.id);
  if (!li) {
    li = document.createElement('li');
    filasFeed.set(ev.id, li);
    feed.prepend(li);
    while (feed.children.length > 12) {
      const last = feed.lastElementChild as HTMLElement;
      filasFeed.forEach((v, k) => v === last && filasFeed.delete(k));
      last.remove();
    }
  }
  li.className = `ev ${ev.estado}`;
  li.innerHTML = `<code>${esc(ev.tool)}</code><span>${esc(ev.detalle)}</span><b aria-label="${ev.estado}">${ICON[ev.estado]}</b>`;
});
void eventos;

// ── Historial: cada cambio del agente se puede deshacer ──────────────
const hist = $('[data-historial]');
function pintarHistorial() {
  hist.innerHTML = mercado.historial.length
    ? mercado.historial.map((a) => `<li><span>${esc(a.label)}</span><time>${new Date(a.at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time><button type="button" data-undo="${a.id}">Deshacer</button></li>`).join('')
    : '<li class="vacio-h">Aún no hay cambios del agente.</li>';
}
hist.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLElement>('[data-undo]');
  if (b && mercado.deshacer(Number(b.dataset.undo))) $('[data-anuncio]').textContent = 'Deshecho el cambio del agente.';
});
mercado.suscribir('historial', pintarHistorial);
pintarHistorial();

// ── Confirmación en pantalla para lo irreversible ────────────────────
const dlg = $<HTMLDialogElement>('[data-confirmar]');
function confirmar(texto: string) {
  $('[data-confirmar-texto]').textContent = texto;
  dlg.showModal();
  return new Promise<boolean>((resolve) => dlg.addEventListener('close', () => resolve(dlg.returnValue === 'si'), { once: true }));
}

// ── WebMCP ───────────────────────────────────────────────────────────
const toolsAc = new AbortController();
const { native } = await registrarTools({ generar: (p, s) => generar(p, modo, s), confirmar }, toolsAc.signal);
void nanoDisponible().then((nano) => {
  $('[data-motor]').textContent = `${native ? 'WebMCP nativo' : 'WebMCP (polyfill)'} · ${nano ? 'Gemini Nano' : pideNano() ? 'Gemini Nano no disponible: agente simulado' : 'agente simulado'} · productos y precios ficticios`;
});
const setInspector = montarInspector($('#inspector'), $<HTMLButtonElement>('[data-inspector-toggle]'));
if (params.has('inspector')) setInspector(true);
// Sin atajo de una letra: en el modo ingenuo, las teclas que pierden el foco caerían en la página.

// Para ensayar y grabar los clips desde la consola o Playwright.
Object.assign(window, { mercadoDemo: { pedir, setModo, ejecutar, mercado, metrics, resetMetrics } });
