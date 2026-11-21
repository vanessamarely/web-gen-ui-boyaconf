// Graba la demo real (demo/ui) para los slides: antes y después de cada regla.
//   npm run build -w demo && node scripts/record-demo.mjs
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const DIST = join(ROOT, 'demo/dist');
const OUT = join(ROOT, 'slides/public/clips');
const TMP = join(ROOT, '.clips-tmp');
const SIZE = { width: 1280, height: 720 };
const PEDIDO = 'Arma un mercado para 4 personas con 120 mil';
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const srv = createServer((q, r) => { let u = normalize(q.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html'; try { const b = readFileSync(join(DIST, u)); r.writeHead(200, { 'content-type': TIPOS[extname(u)] ?? 'application/octet-stream' }); r.end(b); } catch { r.writeHead(404); r.end(); } }).listen(5383);

// Cada escena es una lista de pasos: el rótulo cambia en el momento en que pasa cada cosa.
const ESCENAS = {
  renderizado: {
    marcador: (m) => [['Script en la respuesta', m.xss ? 'se ejecutó' : 'no se ejecutó']],
    pasos: { inicio: '1. La IA responde por partes, en JSON', resaltarTicker: /<img[^>]*>/, medio: '2. Dentro del consejo llega este HTML: <img onerror=…>', antes: '3. La web lo inserta como HTML: el script se ejecuta', despues: '3. La web lo muestra como texto: no se ejecuta' },
  },
  streaming: {
    marcador: (m) => [['Veces que se redibujó la pantalla', m.pintadas]],
    pasos: { inicio: '1. La IA responde en cientos de pedacitos', medio: '2. Mira el contador mientras llegan', antes: '3. Redibujó la pantalla con cada pedacito', despues: '3. Redibujó solo cada 100 ms' },
  },
  dom: {
    marcador: (m) => [['Elementos creados', m.nodos.toLocaleString('es-CO')]],
    resaltar: true,
    pasos: { inicio: '1. La IA responde por partes', medio: '2. Lo que se pinta de rojo se crea de nuevo', antes: '3. Reconstruyó toda la lista una y otra vez', despues: '3. Solo creó lo que faltaba' },
  },
  estado: {
    marcador: (_, v) => [['Papa pastusa', `${v} kg`]],
    editar: true,
    pasos: { inicio: '1. La IA envía la lista por partes, en JSON', editar: '2. Mientras responde, cambio la papa a 5 kg', llega: '3. Llega la siguiente parte: "cantidad": 2', antes: '4. La web la devolvió a 2 kg', despues: '4. La web respetó mi cambio: 5 kg' },
  },
  accesibilidad: {
    marcador: (m, _, s) => [['Avisos al lector de pantalla', m.anuncios], ['Campos sin nombre', s]],
    pasos: { inicio: '1. La IA responde por partes', medio: '2. Mira los avisos que recibe el lector de pantalla', antes: '3. Un aviso con cada pedacito', despues: '3. Un aviso al empezar y otro al terminar' },
  },
};

const capa = () => {
  const s = document.createElement('style');
  s.textContent = `.cabeza,.pedido,.medidas,.estado,.explica,.prueba,.progreso,.cwv,.agente,.ui-titulo{display:none!important}
  body{max-width:none;margin:0;padding:78px 420px 70px 28px;zoom:1}
  .superficie{zoom:1.32;transform-origin:top left}
  #m-tablero{position:fixed;z-index:9;top:0;left:0;right:0;display:flex;justify-content:center;gap:48px;padding:10px;background:#1a0e1c;color:#fff;font:600 21px system-ui}
  #m-tablero b{margin-left:10px;color:#ffe08a;font-size:30px}
  #m-json{position:fixed;z-index:8;top:72px;right:16px;bottom:84px;width:384px;margin:0;padding:12px 14px;border-radius:14px;background:#1a0e1c;color:#cfe8d8;font:600 21px/1.4 ui-monospace,monospace;white-space:pre-wrap;word-break:break-all;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end}
  #m-json b{display:block;margin-bottom:8px;color:#ffe08a;font:800 18px system-ui;letter-spacing:.04em;text-transform:uppercase}
  #m-json mark{background:#e5294f;color:#fff;border-radius:4px;padding:0 2px}
  #m-rotulo{position:fixed;z-index:9;left:28px;right:420px;bottom:16px;padding:12px 22px;border-radius:999px;background:#1a0e1c;color:#fff;font:700 24px system-ui;text-align:center}
  .m-nuevo{animation:m-flash .55s ease-out} @keyframes m-flash{from{box-shadow:0 0 0 3px #e5294f;background:#ffd9df}to{box-shadow:0 0 0 3px transparent}}
  .m-foco{outline:5px solid #e5294f!important;outline-offset:2px;border-radius:6px}
  .m-ok{outline:5px solid #12a673!important;outline-offset:2px;border-radius:6px}`;
  document.head.append(s);
  document.body.insertAdjacentHTML('beforeend', '<div id="m-tablero"></div><pre id="m-json"><b>Lo que llega de la IA</b><span></span></pre><div id="m-rotulo"></div>');
  let todo = '';
  window.__resaltar = null;
  window.__trozo = (t) => {
    todo += t;
    const cola = todo.slice(-230);
    const esc = (x) => x.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
    let html = esc(cola);
    if (window.__resaltar) html = html.replace(new RegExp(esc(window.__resaltar).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), (m) => `<mark>${m}</mark>`);
    document.querySelector('#m-json span').innerHTML = html;
  };
};

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });

async function grabar(nombre, url, escena) {
  rmSync(TMP, { recursive: true, force: true });
  const ctx = await browser.newContext({ viewport: SIZE, recordVideo: { dir: TMP, size: SIZE } });
  const t0 = Date.now();
  const page = await ctx.newPage();
  await page.goto(url);
  await page.waitForFunction(() => document.body.dataset.motor);
  await page.evaluate(capa);
  const inicio = (Date.now() - t0) / 1000;
  await escena(page);
  const fin = (Date.now() - t0) / 1000;
  const video = page.video();
  await ctx.close();
  const salida = join(OUT, nombre);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(inicio), '-to', String(fin), '-i', await video.path(), '-an', '-c:v', 'libvpx-vp9', '-crf', '34', '-b:v', '0', `${salida}.webm`]);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-sseof', '-0.4', '-i', `${salida}.webm`, '-frames:v', '1', '-q:v', '4', `${salida}.jpg`]);
}

const resultados = {};
const rotulo = (page, t) => page.evaluate((x) => { document.querySelector('#m-rotulo').textContent = x; }, t);
for (const [id, e] of Object.entries(ESCENAS).filter(([k]) => !process.env.SOLO || process.env.SOLO === k)) for (const [version, modo] of [['antes', 'directo'], ['despues', 'preparada']]) {
  await grabar(`g-${id}-${version}`, `http://localhost:5383/ui/?modo=${modo}&motor=grabacion${id === 'renderizado' ? '&inyectar=1' : ''}`, async (page) => {
    const P = e.pasos;
    await rotulo(page, P.inicio);
    if (e.resaltar) await page.evaluate(() => new MutationObserver((l) => { for (const r of l) for (const n of r.addedNodes) if (n.classList?.contains('fila') || n.classList?.contains('bloque')) n.classList.add('m-nuevo'); }).observe(document.querySelector('[data-superficie]'), { childList: true, subtree: true }));
    if (id === 'renderizado') await page.evaluate(() => { window.__resaltar = "<img src=x onerror='window.__xss=(window.__xss||0)+1'>"; });
    const tablero = async () => page.evaluate((f) => {
      const m = window.uiDemo.medidas();
      const v = document.querySelector('[data-cantidad="papa-pastusa"]')?.value ?? '–';
      const s = [...document.querySelectorAll('[data-superficie] input')].filter((i) => !i.getAttribute('aria-label')).length;
      document.querySelector('#m-tablero').innerHTML = new Function('m', 'v', 's', `return (${f})(m, v, s)`)(m, v, s).map(([k, x]) => `<span>${k}<b>${x}</b></span>`).join('');
    }, e.marcador.toString());
    let vivo = true;
    const ciclo = (async () => { while (vivo) { await tablero().catch(() => {}); await page.waitForTimeout(120); } })();
    await page.waitForTimeout(900);
    const fin = page.evaluate((p) => window.uiDemo.pedir(p), PEDIDO);
    if (e.editar) {
      // Se detiene la respuesta para que se vea cada paso.
      await page.waitForSelector('[data-cantidad="cubio"]');
      await page.evaluate(() => window.uiDemo.pausar(true));
      await page.waitForTimeout(700);
      await rotulo(page, P.editar);
      await page.evaluate(() => document.querySelector('[data-cantidad="papa-pastusa"]').closest('.fila').classList.add('m-foco'));
      await page.waitForTimeout(600);
      await page.evaluate(() => { const i = document.querySelector('[data-cantidad="papa-pastusa"]'); i.value = '5'; i.dispatchEvent(new Event('input', { bubbles: true })); });
      await page.waitForTimeout(1800);
      await rotulo(page, P.llega);
      await page.evaluate(() => { window.__resaltar = '"id": "papa-pastusa", "cantidad": 2'; });
      await page.evaluate(() => window.uiDemo.pausar(false));
      await page.waitForTimeout(1600);
      await rotulo(page, P[version]);
      await page.evaluate((ok) => { const f = document.querySelector('[data-cantidad="papa-pastusa"]').closest('.fila'); f.classList.remove('m-foco'); f.classList.add(ok ? 'm-ok' : 'm-foco'); }, version === 'despues');
    } else {
      await page.waitForTimeout(2600);
      await rotulo(page, P.medio);
    }
    await fin;
    vivo = false; await ciclo; await tablero();
    if (!e.editar) await rotulo(page, P[version]);
    resultados[`${id}-${version}`] = await page.evaluate(() => ({ ...window.uiDemo.medidas(), papa: document.querySelector('[data-cantidad="papa-pastusa"]')?.value }));
    await page.waitForTimeout(3000);
  });
  console.log(id, version, JSON.stringify(resultados[`${id}-${version}`]));
}

// La misma web, tres interfaces distintas.
if (!process.env.SOLO) await grabar('g-tres', 'http://localhost:5383/ui/?modo=preparada&motor=grabacion', async (page) => {
  await page.evaluate(() => document.querySelector('#m-tablero').remove());
  for (const p of [PEDIDO, '¿Dónde está más barata la papa?', '¿Qué cocino con papa, habas y cubios?']) {
    await page.evaluate((t) => { document.querySelector('#m-rotulo').textContent = `“${t}”`; scrollTo(0, 0); }, p);
    await page.evaluate((x) => window.uiDemo.pedir(x), p);
    await page.waitForTimeout(1800);
  }
});
await browser.close(); srv.close();
rmSync(TMP, { recursive: true, force: true });
