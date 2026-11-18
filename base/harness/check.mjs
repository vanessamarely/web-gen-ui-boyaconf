// Pruebas del harness (Playwright): usan la app en un navegador real, como una persona, y miden la experiencia.
//   npm run harness            todas las pruebas
//   npm run harness -- --json  salida para otras herramientas
// Termina con código 1 si alguna prueba falla: el trabajo del agente no está listo.
import { spawn } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const P = JSON.parse(readFileSync(join(RAIZ, 'harness/presupuestos.json'), 'utf8'));
const URL_APP = process.env.HARNESS_URL ?? 'http://localhost:5293';
const CPU = Number(process.env.HARNESS_CPU ?? 6); // simula un celular de gama media-baja
const T = (id) => `[data-testid="${id}"]`;

/** Instala los medidores antes de que cargue la app. */
function medidores() {
  const h = (window.__h = { cls: 0, inp: 0, largos: 0, nodos: 0, busyVisto: false, anuncios: 0 });
  new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (e.duration > 50) h.largos++; })).observe({ type: 'long-animation-frame', buffered: true });
  new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) h.cls += e.value; })).observe({ type: 'layout-shift', buffered: true });
  new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (e.interactionId) h.inp = Math.max(h.inp, e.duration); })).observe({ type: 'event', durationThreshold: 16, buffered: true });
  addEventListener('DOMContentLoaded', () => {
    const lista = document.querySelector('[data-testid="lista"]');
    new MutationObserver((rs) => rs.forEach((r) => r.addedNodes.forEach((n) => { if (n.nodeType === 1) h.nodos += 1 + n.getElementsByTagName('*').length; }))).observe(lista, { childList: true, subtree: true });
    new MutationObserver(() => { if (lista.getAttribute('aria-busy') === 'true') h.busyVisto = true; }).observe(lista, { attributes: true, attributeFilter: ['aria-busy'] });
    const vivo = document.querySelector('[role="status"], [aria-live="polite"]');
    if (vivo) new MutationObserver(() => h.anuncios++).observe(vivo, { childList: true, characterData: true, subtree: true });
  });
}

async function pagina(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 760 } });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });
  await page.addInitScript(medidores);
  await page.goto(URL_APP, { waitUntil: 'load' });
  return page;
}

const filas = (page) => page.locator(`${T('lista')} [data-id]`);
/** La generación terminó cuando llega el consejo y la lista deja de cambiar. */
async function esperarFin(page, total) {
  await page.waitForFunction((n) => document.querySelectorAll('[data-testid="lista"] [data-id]').length >= n && /Compra temprano/.test(document.querySelector('#consejo')?.textContent ?? ''), total, { timeout: 90000 });
  await page.waitForTimeout(500);
}

async function renderizado(browser) {
  const page = await pagina(browser);
  await page.click(T('generar'));
  await page.waitForTimeout(700); // fuera de la ventana de "entrada reciente" del clic
  await page.evaluate(() => { window.__h.cls = 0; });
  await esperarFin(page, 40);
  const cls = await page.evaluate(() => window.__h.cls);
  await page.close();
  return { id: 'renderizado', nombre: 'Renderizado', mide: 'CLS: la pantalla no salta', valor: +cls.toFixed(3), limite: `≤ ${P.cls}`, ok: cls <= P.cls, pista: 'Reserva el espacio antes de que llegue el contenido.' };
}

async function streaming(browser) {
  const page = await pagina(browser);
  await page.evaluate(() => { window.__h.largos = 0; });
  await page.click(T('generar'));
  await filas(page).nth(24).waitFor({ timeout: 60000 });
  await page.evaluate(() => { window.__h.inp = 0; });
  const caja = await page.locator(T('contador')).boundingBox();
  for (let i = 0; i < 6; i++) {
    await page.mouse.click(caja.x + caja.width / 2, caja.y + caja.height / 2);
    await page.waitForTimeout(220);
  }
  await esperarFin(page, 40);
  const { inp, largos } = await page.evaluate(() => ({ inp: window.__h.inp, largos: window.__h.largos }));
  await page.close();
  return { id: 'streaming', nombre: 'Streaming', mide: 'Frames largos mientras genera', valor: largos, unidad: 'frames > 50 ms', detalle: inp ? `INP ${Math.round(inp)} ms` : 'INP < 16 ms', limite: `≤ ${P.framesLargos} frames y INP ≤ ${P.inpMs} ms`, ok: largos <= P.framesLargos && inp <= P.inpMs, pista: 'Lee cada pedazo una sola vez y pinta como máximo una vez por frame.' };
}

async function refinar(browser) {
  const page = await pagina(browser);
  await page.click(T('generar'));
  await esperarFin(page, 40);
  await page.locator(`[data-id="papa-pastusa"] input[type="checkbox"]`).check();
  const nota = page.locator(`[data-id="cubios"] input[type="text"]`);
  await nota.click();
  await page.keyboard.type('bien grandes', { delay: 25 });
  await page.evaluate(() => {
    window.__h.nodos = 0;
    window.__h.anuncios = 0;
    window.__nota = document.activeElement;
    document.querySelector('[data-testid="refinar"]').click(); // lo pide el agente: la persona sigue escribiendo
  });
  await page.waitForTimeout(600);
  await page.keyboard.type(', gracias', { delay: 40 });
  await esperarFin(page, 43);
  const r = await page.evaluate(() => {
    const fila = (id) => document.querySelector(`[data-testid="lista"] [data-id="${id}"]`);
    return {
      nodos: window.__h.nodos,
      mismoNodo: document.activeElement === window.__nota && window.__nota.isConnected,
      nota: fila('cubios')?.querySelector('input[type="text"]')?.value ?? '',
      marcado: fila('papa-pastusa')?.querySelector('input[type="checkbox"]')?.checked ?? false,
      busyVisto: window.__h.busyVisto,
      busyFinal: document.querySelector('[data-testid="lista"]').getAttribute('aria-busy'),
      anuncios: window.__h.anuncios,
      vivo: Boolean(document.querySelector('[role="status"], [aria-live="polite"]')),
      sinNombre: [...document.querySelectorAll('[data-testid="lista"] input')].filter((i) => !i.getAttribute('aria-label') && !i.labels?.length).length,
    };
  });
  await page.close();
  const notaOk = r.nota === 'bien grandes, gracias';
  const a11y = r.busyVisto && r.busyFinal === 'false' && r.vivo && r.anuncios >= 1 && r.anuncios <= P.anunciosPorGeneracion && r.sinNombre === 0;
  return [
    { id: 'dom', nombre: 'DOM', mide: 'Nodos creados al refinar y foco', valor: r.nodos, limite: `≤ ${P.nodosAlRefinar} y conserva el foco`, ok: r.nodos <= P.nodosAlRefinar && r.mismoNodo, detalle: r.mismoNodo ? 'foco conservado' : 'foco perdido', pista: 'Reutiliza cada fila por su id; no reemplaces la lista.' },
    { id: 'estado', nombre: 'Estado', mide: 'Lo que hizo la persona sobrevive', valor: `${notaOk ? 'nota intacta' : 'nota perdida'} · ${r.marcado ? 'marca intacta' : 'marca perdida'}`, limite: 'nota y marca intactas', ok: notaOk && r.marcado, pista: 'Guarda lo de la persona aparte de lo que genera el modelo.' },
    { id: 'accesibilidad', nombre: 'Accesibilidad', mide: 'Avisa sin saturar', valor: `aria-busy ${r.busyVisto && r.busyFinal === 'false' ? 'sí' : 'no'} · ${r.anuncios} anuncios · ${r.sinNombre} campos sin nombre`, limite: `aria-busy, 1–${P.anunciosPorGeneracion} anuncios, campos con nombre`, ok: a11y, pista: 'Usa aria-busy, una región de estado y nombres accesibles.' },
  ];
}

async function servidor() {
  const arriba = await fetch(URL_APP).then(() => true).catch(() => false);
  if (arriba) return null;
  const proc = spawn('npx', ['vite', '--port', '5293', '--strictPort'], { cwd: RAIZ, stdio: 'ignore', detached: true });
  for (let i = 0; i < 60; i++) {
    if (await fetch(URL_APP).then(() => true).catch(() => false)) return proc;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No pude abrir la app en ${URL_APP}`);
}

const proc = await servidor();
const browser = await chromium.launch({ channel: 'chrome', headless: true });
let resultados;
try {
  resultados = [await renderizado(browser), await streaming(browser), ...(await refinar(browser))];
} finally {
  await browser.close();
  if (proc) process.kill(-proc.pid);
}

const verdes = resultados.filter((r) => r.ok).length;
const siguiente = resultados.find((r) => !r.ok);
appendFileSync(join(RAIZ, 'harness/corridas.jsonl'), JSON.stringify({ fecha: new Date().toISOString(), verdes, total: resultados.length, resultados }) + '\n');

if (process.argv.includes('--json')) console.log(JSON.stringify({ verdes, total: resultados.length, resultados }, null, 2));
else {
  console.log('\nHarness web · pruebas en un navegador real\n');
  for (const r of resultados) console.log(`${r.ok ? '✓' : '✗'} ${r.nombre.padEnd(14)} ${String(r.valor) + (r.unidad ? ' ' + r.unidad : '')}${r.detalle ? ` (${r.detalle})` : ''}  ·  límite: ${r.limite}`);
  console.log(`\n${verdes}/${resultados.length} pruebas pasaron`);
  if (siguiente) console.log(`Siguiente: ${siguiente.nombre}. ${siguiente.pista}\n`);
  else console.log('Listo para entregar.\n');
}
process.exit(siguiente ? 1 : 0);
