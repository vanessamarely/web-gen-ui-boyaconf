// Graba los clips de la demo Mercado campesino para los slides (y como plan B sin red).
// Usa Playwright con el Google Chrome instalado (no descarga navegadores).
//   npm run dev:demo                         (en otra terminal)
//   node scripts/record-clips.mjs            → todos
//   node scripts/record-clips.mjs arma       → solo uno: arma | ingenuo | fluido | devtools
// Salida: slides/public/clips/<nombre>.webm + <nombre>.png (póster = último cuadro)
// e imprime las métricas medidas en cada clip (para los números de los slides).
import { chromium } from 'playwright-core';
import { mkdirSync, renameSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'slides/public/clips');
const TMP = join(ROOT, '.clips-tmp');
const DEMO = process.env.DEMO_URL ?? 'http://localhost:5292';
const SIZE = { width: 1100, height: 660 };
mkdirSync(OUT, { recursive: true });

const idle = (p) => p.waitForFunction(() => !document.querySelector('[data-cancelar]:not([hidden])'), null, { timeout: 60000 });
const metrics = (p) => p.evaluate(() => ({ ...window.mercadoDemo.metrics }));

async function pedir(p, texto) {
  await p.fill('#q', '');
  await p.type('#q', texto, { delay: 22 });
  await p.waitForTimeout(300);
  await p.click('[data-pedido] button');
}

/** Lista ya armada (rápido) para empezar las escenas 2–4 desde el mismo punto. */
async function preparar(p) {
  await p.evaluate(async () => {
    await window.mercadoDemo.pedir('Mercado para 4 con 120 mil, para un cuchuco');
  });
  await idle(p);
  await p.evaluate(() => {
    window.scrollTo(0, 0);
    window.mercadoDemo.resetMetrics();
  });
  await p.waitForTimeout(500);
}

/** La persona marca la papa y escribe una nota mientras el agente refina la lista. */
async function refinarMientrasEscribo(p) {
  await p.check('[data-id="papa-pastusa"] .chk');
  await p.waitForTimeout(900);
  await p.click('[data-id="cubio"] .nota');
  await p.keyboard.type('bien grandes', { delay: 60 });
  await p.evaluate(() => {
    window.mercadoDemo.pedir('Súbele el presupuesto a 160 mil');
  });
  await p.waitForTimeout(700);
  await p.keyboard.type(', por favor', { delay: 70 });
  await idle(p);
  await p.waitForTimeout(1500);
  return p.evaluate(() => {
    const m = window.mercadoDemo.mercado;
    return { papaComprada: m.items.get('papa-pastusa')?.comprado ?? false, nota: m.items.get('cubio')?.nota ?? '', foco: document.activeElement?.classList.contains('nota') ?? false };
  });
}

const SCENES = {
  // 1 · El agente arma el mercado: plan → puestos reservados → cambios en streaming → tools a la vista.
  async arma(p) {
    await p.goto(`${DEMO}/?modo=fluido`, { waitUntil: 'load' });
    await p.waitForTimeout(800);
    await p.evaluate(() => window.mercadoDemo.resetMetrics());
    await pedir(p, 'Mercado para 4 con 120 mil, para un cuchuco');
    await idle(p);
    await p.waitForTimeout(2000);
    return metrics(p);
  },
  // 2 · Ingenuo: mientras marcas y escribes, el agente sube el presupuesto y todo se re-pinta.
  async ingenuo(p) {
    await p.goto(`${DEMO}/?modo=ingenuo`, { waitUntil: 'load' });
    await preparar(p);
    const r = await refinarMientrasEscribo(p);
    return { ...(await metrics(p)), ...r };
  },
  // 3 · Sin fricción: el mismo pedido; tu nota, tu foco y lo marcado siguen ahí.
  async fluido(p) {
    await p.goto(`${DEMO}/?modo=fluido`, { waitUntil: 'load' });
    await preparar(p);
    const r = await refinarMientrasEscribo(p);
    return { ...(await metrics(p)), ...r };
  },
  // 4 · Las tools por dentro: inspector, versión vieja → "vuelve a leer" → reintento correcto.
  async devtools(p) {
    await p.goto(`${DEMO}/?modo=fluido`, { waitUntil: 'load' });
    await preparar(p);
    await p.click('[data-inspector-toggle]');
    await p.waitForTimeout(1200);
    await p.click('[data-t="marcar_comprado"]');
    await p.waitForTimeout(900);
    // La persona marca algo mientras tanto: la versión que tenía la tool queda vieja.
    await p.check('[data-id="cubio"] .chk');
    await p.waitForTimeout(900);
    await p.click('[data-run]');
    await p.waitForTimeout(1800);
    await p.click('[data-t="ver_mercado"]');
    await p.waitForTimeout(600);
    await p.click('[data-run]');
    await p.waitForTimeout(1600);
    await p.click('[data-t="marcar_comprado"]'); // el ejemplo ya trae la versión vigente
    await p.waitForTimeout(800);
    await p.click('[data-run]');
    await p.waitForTimeout(2200);
    const tools = await p.evaluate(async () => (await document.modelContext.getTools()).length);
    return { ...(await metrics(p)), toolsRegistradas: tools, salida: await p.textContent('[data-out]') };
  },
};

const only = process.argv[2];
const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const [name, scene] of Object.entries(SCENES)) {
  if (only && only !== name) continue;
  rmSync(TMP, { recursive: true, force: true });
  const ctx = await browser.newContext({ viewport: SIZE, deviceScaleFactor: 1, colorScheme: 'light', recordVideo: { dir: TMP, size: SIZE } });
  const p = await ctx.newPage();
  const result = await scene(p);
  await p.screenshot({ path: join(OUT, `${name}.png`) });
  const video = p.video();
  await ctx.close();
  renameSync(await video.path(), join(OUT, `${name}.webm`));
  console.log(name, JSON.stringify(result));
}
await browser.close();
rmSync(TMP, { recursive: true, force: true });
