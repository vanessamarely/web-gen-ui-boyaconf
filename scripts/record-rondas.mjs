// Videos con zoom de cada corrección: la app real, antes y después del harness.
//   node scripts/record-rondas.mjs [renderizado streaming dom accesibilidad estado]
// Salida: slides/public/clips/r-<corrección>-{antes,despues}.{webm,jpg}
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'slides/public/clips');
const TMP = join(ROOT, '.rondas-tmp');
const SIZE = { width: 1280, height: 720 };
const VERSIONES = [
  { nombre: 'antes', dir: 'base', port: 5296, color: '#e5294f' },
  { nombre: 'despues', dir: 'docs/corrida-agente/despues', port: 5297, color: '#12a673' },
];
const listo = () => /Compra temprano/.test(document.querySelector('#consejo')?.textContent ?? '');
const fila = '[data-id="papa-criolla"]';

/** Capa de grabación: zoom animado, rótulo y marcas. No cambia el código de la app. */
function capa(color) {
  const zw = document.createElement('div');
  zw.id = 'zw';
  zw.append(...[...document.body.childNodes].filter((n) => n.nodeName !== 'SCRIPT'));
  document.body.append(zw);
  const css = document.createElement('style');
  css.textContent = `html, body { overflow: hidden; height: 100%; }
    #zw { transform-origin: 0 0; transition: transform 800ms cubic-bezier(.3,.7,.2,1); will-change: transform; }
    #rotulo { position: fixed; left: 50%; bottom: 104px; transform: translateX(-50%); z-index: 99; max-width: 78vw; padding: 14px 28px; border-radius: 18px; background: #1a0e1c; color: #fff; font: 800 34px/1.15 system-ui; text-align: center; box-shadow: 0 8px 30px #0006; }
    #guia { position: fixed; left: 0; right: 0; z-index: 90; border-top: 5px dashed ${color}; }
    #guia span { position: absolute; right: 100px; top: 6px; padding: 5px 12px; border-radius: 9px; background: ${color}; color: #fff; font: 800 24px system-ui; }
    #pista { position: fixed; left: 104px; right: 104px; top: 28px; z-index: 95; height: 64px; border-radius: 30px; overflow: hidden; background: #1a0e1c; box-shadow: 0 8px 30px #0006; }
    #avance { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 30px; background: #ffffff2e; }
    .marca { position: absolute; top: 6px; bottom: 6px; width: 9px; margin-left: -4px; border-radius: 4px; background: #ff4d6d; }
    .creada { outline: 4px solid ${color} !important; outline-offset: -4px; background: color-mix(in srgb, ${color} 26%, white) !important; }
    #voz { position: fixed; left: 50%; top: 34px; transform: translateX(-50%); z-index: 96; width: 78vw; padding: 16px 24px; border-radius: 18px; background: #fff; color: #1a0e1c; border: 5px solid ${color}; font: 800 36px/1.15 system-ui; text-align: center; }
    #voz small { display: block; font: 700 22px system-ui; color: #5b4b5e; }
    :focus { outline: 5px solid ${color} !important; outline-offset: 2px; }`;
  document.head.append(css);
  const rotulo = document.createElement('div');
  rotulo.id = 'rotulo';
  rotulo.hidden = true;
  document.body.append(rotulo);
  let s = 1, tx = 0, ty = 0;
  window.__rotulo = (t) => { rotulo.textContent = t; rotulo.hidden = !t; };
  window.__zoom = (sel, S, dy = 0) => {
    const r = document.querySelector(sel).getBoundingClientRect();
    const ux = (r.left - tx) / s, uy = (r.top - ty) / s, uw = r.width / s, uh = r.height / s;
    s = S;
    tx = Math.min(0, Math.max(innerWidth - document.documentElement.clientWidth * S, innerWidth / 2 - (ux + uw / 2) * S));
    ty = Math.min(0, innerHeight / 2 + dy - (uy + uh / 2) * S);
    zw.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
  };
}

const esperar = (page, ms) => page.waitForTimeout(ms);
const rotulo = (page, t) => page.evaluate((x) => window.__rotulo(x), t);
const zoom = (page, sel, s, dy = 0) => page.evaluate(([a, b, c]) => window.__zoom(a, b, c), [sel, s, dy]);
const generar = async (page) => {
  await page.evaluate(() => document.querySelector('[data-testid="generar"]').click());
  await page.waitForFunction(listo, null, { timeout: 90000 });
  await esperar(page, 500);
};
const enfocar = (page, sel) => page.evaluate((s) => document.querySelector(s).focus({ preventScroll: true }), sel);
const refinar = (page) => page.evaluate(() => document.querySelector('[data-testid="refinar"]').click());
const refinado = (page) => page.waitForFunction(() => document.querySelectorAll('[data-testid="lista"] [data-id]').length >= 43 && /Compra temprano/.test(document.querySelector('#consejo')?.textContent ?? ''), null, { timeout: 90000 });

/** Cada escena devuelve el tramo del video que importa, en ms desde el inicio de la grabación. */
const ESCENAS = {
  async renderizado(page, v, reloj) {
    await page.evaluate((nombre) => {
      const mensaje = nombre === 'antes' ? 'El consejo llegó y empujó la lista' : 'El consejo llegó y nada se movió';
      new MutationObserver(() => { if (document.querySelector('#consejo aside, #consejo .consejo')) window.__rotulo(mensaje); }).observe(document.querySelector('#consejo'), { childList: true, subtree: true });
    }, v.nombre);
    await page.evaluate(() => document.querySelector('[data-testid="generar"]').click());
    await page.waitForSelector('#lista [data-id]', { timeout: 30000 });
    await esperar(page, 250);
    await zoom(page, '#lista [data-id]', 1.5, 40);
    await esperar(page, 900);
    await page.evaluate(() => {
      const y = document.querySelector('#lista [data-id]').getBoundingClientRect().top;
      const g = document.createElement('div');
      g.id = 'guia';
      g.style.top = `${y}px`;
      g.innerHTML = '<span>La lista empezaba aquí</span>';
      document.body.append(g);
      window.__rotulo('La IA sigue enviando la respuesta…');
    });
    await page.waitForFunction(listo, null, { timeout: 90000 });
    const t = reloj();
    await esperar(page, 3200);
    return [t - 3000, t + 3000];
  },
  async streaming(page, v, reloj) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
    await page.evaluate(() => {
      const pista = document.createElement('div');
      pista.id = 'pista';
      pista.innerHTML = '<div id="avance"></div>';
      document.body.append(pista);
      window.__marcas = 0;
      window.__rotulo('Cada marca: la web se congeló más de 50 ms');
    });
    await esperar(page, 900);
    const a = reloj();
    await page.evaluate(() => {
      const pista = document.querySelector('#pista');
      const avance = pista.querySelector('#avance');
      const ini = performance.now();
      const TOTAL = 11000;
      const x = (t) => Math.min(100, ((t - ini) / TOTAL) * 100);
      new PerformanceObserver((lista) => {
        for (const e of lista.getEntries()) {
          if (e.startTime < ini) continue;
          window.__marcas++;
          const m = document.createElement('i');
          m.className = 'marca';
          m.style.left = `${x(e.startTime)}%`;
          pista.append(m);
        }
      }).observe({ type: 'long-animation-frame', buffered: false });
      const mover = (t) => { avance.style.width = `${x(t)}%`; requestAnimationFrame(mover); };
      requestAnimationFrame(mover);
      document.querySelector('[data-testid="generar"]').click();
    });
    await page.waitForFunction(listo, null, { timeout: 90000 });
    const fin = reloj();
    await esperar(page, 1500);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    console.log('  marcas:', await page.evaluate(() => window.__marcas), 'duración', fin - a);
    return [a - 500, fin + 1400];
  },
  async dom(page, v, reloj) {
    await generar(page);
    await zoom(page, '#lista [data-id]', 1.25, 180);
    await rotulo(page, 'Pido un cambio: subir el presupuesto');
    await esperar(page, 1000);
    const a = reloj();
    await esperar(page, 1500);
    await page.evaluate((nombre) => {
      window.__rotulo(nombre === 'antes' ? 'En rojo: filas borradas y creadas otra vez' : 'Las filas existentes se quedan en su lugar');
      new MutationObserver((ms) => {
        for (const m of ms) for (const n of m.addedNodes) if (n.classList?.contains('fila')) { n.classList.add('creada'); setTimeout(() => n.classList.remove('creada'), 420); }
      }).observe(document.querySelector('#lista'), { childList: true });
    }, v.nombre);
    await refinar(page);
    await esperar(page, 6000);
    return [a, a + 7500];
  },
  async accesibilidad(page, v, reloj) {
    await generar(page);
    await zoom(page, fila, 1.22, 40);
    await esperar(page, 900);
    const cdp = await page.context().newCDPSession(page);
    const nombre = async (sel) => {
      const { root } = await cdp.send('DOM.getDocument');
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: sel });
      const { nodes } = await cdp.send('Accessibility.getPartialAXTree', { nodeId, fetchRelatives: false });
      return nodes[0]?.name?.value ?? '';
    };
    const decir = (texto) => page.evaluate((t) => {
      let el = document.querySelector('#voz');
      if (!el) { el = document.createElement('div'); el.id = 'voz'; document.body.append(el); }
      el.innerHTML = `<small>El lector de pantalla dice:</small>${t}`;
    }, texto);
    const a = reloj();
    await rotulo(page, 'Recorro la fila con el teclado');
    await enfocar(page, `${fila} input[type="checkbox"]`);
    const casilla = await nombre(`${fila} input[type="checkbox"]`);
    await decir(casilla ? `“${casilla}”` : '“Casilla”… sin nombre');
    await esperar(page, 3000);
    await enfocar(page, `${fila} input[type="text"]`);
    const nota = await nombre(`${fila} input[type="text"]`);
    await decir(`“${nota}”`);
    await rotulo(page, v.nombre === 'antes' ? '¿De qué producto? No lo dice' : 'Ahora sabe qué es y de qué producto');
    await esperar(page, 3400);
    console.log('  lector:', JSON.stringify({ casilla, nota }));
    return [a, a + 6400];
  },
  async estado(page, v, reloj) {
    await generar(page);
    await zoom(page, fila, 1.22, 20);
    await esperar(page, 900);
    const a = reloj();
    await rotulo(page, 'Marco la papa criolla y escribo una nota');
    await page.evaluate((s) => document.querySelector(s).click(), `${fila} input[type="checkbox"]`);
    await enfocar(page, `${fila} input[type="text"]`);
    await page.keyboard.type('bien grandes', { delay: 90 });
    await esperar(page, 900);
    await rotulo(page, 'Pido un cambio: subir el presupuesto');
    await esperar(page, 1300);
    await refinar(page);
    await refinado(page);
    await esperar(page, 300);
    await page.evaluate(() => document.activeElement?.blur());
    await zoom(page, fila, 1.22, 20);
    await rotulo(page, v.nombre === 'antes' ? 'Mi marca y mi nota desaparecieron' : 'Mi marca y mi nota siguen ahí');
    await esperar(page, 3000);
    return [a, reloj() - 100];
  },
};

const pedidas = process.argv.slice(2);
const nombres = pedidas.length ? pedidas : Object.keys(ESCENAS);
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
for (const v of VERSIONES) {
  const srv = spawn(join(ROOT, 'base/node_modules/.bin/vite'), [join(ROOT, v.dir), '--port', String(v.port), '--strictPort'], { stdio: 'ignore', detached: true });
  const url = `http://localhost:${v.port}`;
  for (let i = 0; i < 80 && !(await fetch(url).then(() => true).catch(() => false)); i++) await new Promise((r) => setTimeout(r, 200));
  for (const n of nombres) {
    rmSync(TMP, { recursive: true, force: true });
    const ctx = await browser.newContext({ viewport: SIZE, recordVideo: { dir: TMP, size: SIZE } });
    const page = await ctx.newPage();
    const t0 = Date.now();
    await page.goto(url, { waitUntil: 'load' });
    await page.evaluate(capa, v.color);
    const reloj = () => Date.now() - t0;
    const [a, b] = await ESCENAS[n](page, v, reloj);
    const video = page.video();
    await ctx.close();
    const entrada = await video.path();
    const salida = join(OUT, `r-${n}-${v.nombre}`);
    const inicio = String(Math.max(0, a) / 1000), fin = String(b / 1000);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', inicio, '-to', fin, '-i', entrada, '-an', '-vf', 'crop=1125:633:77:0,scale=1280:720', '-c:v', 'libvpx-vp9', '-crf', '33', '-b:v', '0', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '3', `${salida}.webm`]);
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-sseof', '-0.4', '-i', `${salida}.webm`, '-frames:v', '1', '-q:v', '4', `${salida}.jpg`]);
    console.log(n, v.nombre, `${((b - a) / 1000).toFixed(1)} s`);
  }
  try { process.kill(-srv.pid); } catch { /* el servidor ya terminó */ }
}
await browser.close();
rmSync(TMP, { recursive: true, force: true });
