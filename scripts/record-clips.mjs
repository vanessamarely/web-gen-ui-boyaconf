// Capturas de apertura con la app real del experimento: antes y después del harness.
//   node scripts/record-clips.mjs
// Salida: slides/public/clips/{antes,despues}-{1,2}.png (solo las filas que importan, en grande).
import { spawn } from 'node:child_process';
import { mkdirSync, renameSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'slides/public/clips');
mkdirSync(OUT, { recursive: true });

const VERSIONES = [
  { nombre: 'antes', dir: 'base', port: 5294, color: '#e5294f' },
  { nombre: 'despues', dir: 'docs/corrida-agente/despues', port: 5295, color: '#12a673' },
];

/** Recorta solo las dos filas de la historia y resalta la nota. */
async function captura(page, archivo, color) {
  await page.evaluate(() => scrollTo(0, 0));
  await page.addStyleTag({ content: `[data-id="papa-criolla"] input[type="text"] { outline: 3px solid ${color} !important; outline-offset: 1px; font-weight: 700; font-size: 18px; } [data-id="papa-criolla"] input[type="checkbox"] { outline: 3px solid ${color}; outline-offset: 2px; }` });
  await page.waitForTimeout(200);
  const a = await page.locator('[data-id="papa-criolla"]').boundingBox();
  await page.screenshot({ path: join(OUT, archivo), clip: { x: a.x, y: a.y, width: a.width, height: a.height } });
}

const TMP = join(ROOT, '.clips-tmp');
/** Video corto: la lista se arma en pantalla a medida que llega la respuesta. */
async function grabarGeneracion(browser, url) {
  rmSync(TMP, { recursive: true, force: true });
  const size = { width: 1000, height: 620 };
  const ctx = await browser.newContext({ viewport: size, recordVideo: { dir: TMP, size } });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'load' });
  const rotulo = (t) => page.evaluate((texto) => {
    let el = document.querySelector('#rotulo-clip');
    if (!el) { el = document.createElement('div'); el.id = 'rotulo-clip'; el.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:99;padding:12px 24px;border-radius:999px;background:#1a0e1c;color:#fff;font:700 26px system-ui;white-space:nowrap'; document.body.append(el); }
    el.textContent = texto;
  }, t);
  await rotulo('Presiono “Armar mi mercado”');
  await page.waitForTimeout(1500);
  await rotulo('La respuesta llega por partes…');
  await page.click('[data-testid="generar"]');
  await page.waitForFunction(() => /Compra temprano/.test(document.querySelector('#consejo')?.textContent ?? ''), null, { timeout: 60000 });
  await rotulo('La lista quedó armada');
  await page.waitForTimeout(2500);
  const video = page.video();
  await ctx.close();
  renameSync(await video.path(), join(OUT, 'generando.webm'));
  rmSync(TMP, { recursive: true, force: true });
}

const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const v of VERSIONES) {
  const srv = spawn(join(ROOT, 'base/node_modules/.bin/vite'), [join(ROOT, v.dir), '--port', String(v.port), '--strictPort'], { stdio: 'ignore', detached: true });
  const url = `http://localhost:${v.port}`;
  for (let i = 0; i < 80 && !(await fetch(url).then(() => true).catch(() => false)); i++) await new Promise((r) => setTimeout(r, 200));
  if (v.nombre === 'despues') await grabarGeneracion(browser, url);
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 760 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'load' });
  await page.click('[data-testid="generar"]');
  await page.waitForFunction(() => /Compra temprano/.test(document.querySelector('#consejo')?.textContent ?? ''), null, { timeout: 60000 });
  await page.waitForTimeout(500);
  await page.locator('[data-id="papa-criolla"] input[type="checkbox"]').check();
  await page.locator('[data-id="papa-criolla"] input[type="text"]').click();
  await page.keyboard.type('bien grandes', { delay: 30 });
  if (v.nombre === 'despues') {
    await page.locator('[data-id="papa-pastusa"]').evaluate((el) => scrollTo(0, el.getBoundingClientRect().top + scrollY - 72));
    await page.waitForTimeout(200);
    await page.screenshot({ path: join(OUT, 'app.png') });
  }
  await captura(page, `${v.nombre}-1.png`, '#2f6fdb');
  await page.locator('[data-id="papa-criolla"] input[type="text"]').focus();
  await page.evaluate(() => document.querySelector('[data-testid="refinar"]').click());
  await page.waitForFunction(() => document.querySelectorAll('[data-testid="lista"] [data-id]').length >= 43 && /Compra temprano/.test(document.querySelector('#consejo')?.textContent ?? ''), null, { timeout: 60000 });
  await page.waitForTimeout(500);
  const r = await page.evaluate(() => ({ nota: document.querySelector('[data-id="papa-criolla"] input[type="text"]').value, marca: document.querySelector('[data-id="papa-criolla"] input[type="checkbox"]').checked }));
  await captura(page, `${v.nombre}-2.png`, v.color);
  await ctx.close();
  process.kill(-srv.pid);
  console.log(v.nombre, JSON.stringify(r));
}
await browser.close();
