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

const ESCENAS = {
  renderizado: { marcador: (m) => [['Script en la respuesta', m.xss ? 'se ejecutó' : 'no se ejecutó']], antes: 'La web ejecuta el script que traía la respuesta', despues: 'La web lo muestra como texto y no se ejecuta' },
  streaming: { marcador: (m) => [['Actualizaciones de pantalla', m.pintadas]], antes: 'Actualiza la pantalla con cada pedazo', despues: 'Actualiza la pantalla cada 100 ms' },
  dom: { marcador: (m) => [['Elementos creados', m.nodos.toLocaleString('es-CO')]], antes: 'Reconstruye toda la interfaz', despues: 'Reutiliza lo que ya está en pantalla', resaltar: true },
  estado: { marcador: (_, v) => [['Papa pastusa', `${v} kg`]], antes: 'Cambié la papa a 5 kg y la IA la devolvió a 2 kg', despues: 'Cambié la papa a 5 kg y mi cambio se queda', editar: true },
  accesibilidad: { marcador: (m, _, s) => [['Avisos al lector de pantalla', m.anuncios], ['Campos sin nombre', s]], antes: 'El lector de pantalla recibe un aviso tras otro', despues: 'Avisa al empezar y al terminar' },
};

const capa = () => {
  const s = document.createElement('style');
  s.textContent = `.cabeza,.pedido,.medidas,.estado{display:none!important} body{max-width:1120px;padding:92px 24px 90px;zoom:1}
  #m-tablero{position:fixed;z-index:9;top:0;left:0;right:0;display:flex;justify-content:center;gap:48px;padding:12px;background:#1a0e1c;color:#fff;font:600 21px system-ui}
  #m-tablero b{margin-left:10px;color:#ffe08a;font-size:30px}
  #m-rotulo{position:fixed;z-index:9;left:50%;bottom:20px;transform:translateX(-50%);padding:12px 26px;border-radius:999px;background:#1a0e1c;color:#fff;font:700 25px system-ui;white-space:nowrap}
  .m-nuevo{animation:m-flash .55s ease-out} @keyframes m-flash{from{box-shadow:0 0 0 3px #e5294f;background:#ffd9df}to{box-shadow:0 0 0 3px transparent}}
  .m-foco{outline:5px solid #e5294f!important;outline-offset:2px}`;
  document.head.append(s);
  document.body.insertAdjacentHTML('beforeend', '<div id="m-tablero"></div><div id="m-rotulo"></div>');
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
for (const [id, e] of Object.entries(ESCENAS).filter(([k]) => !process.env.SOLO || process.env.SOLO === k)) for (const [version, modo] of [['antes', 'directo'], ['despues', 'preparada']]) {
  await grabar(`g-${id}-${version}`, `http://localhost:5383/ui/?modo=${modo}&motor=grabacion${id === 'renderizado' ? '&inyectar=1' : ''}`, async (page) => {
    await page.evaluate((t) => { document.querySelector('#m-rotulo').textContent = t; }, e[version]);
    if (e.resaltar) await page.evaluate(() => new MutationObserver((l) => { for (const r of l) for (const n of r.addedNodes) if (n.classList?.contains('fila') || n.classList?.contains('bloque')) n.classList.add('m-nuevo'); }).observe(document.querySelector('[data-superficie]'), { childList: true, subtree: true }));
    const tablero = async () => page.evaluate((f) => {
      const m = window.uiDemo.medidas();
      const v = document.querySelector('[data-cantidad="papa-pastusa"]')?.value ?? '–';
      const s = [...document.querySelectorAll('[data-superficie] input')].filter((i) => !i.getAttribute('aria-label')).length;
      document.querySelector('#m-tablero').innerHTML = new Function('m', 'v', 's', `return (${f})(m, v, s)`)(m, v, s).map(([k, x]) => `<span>${k}<b>${x}</b></span>`).join('');
    }, e.marcador.toString());
    let vivo = true;
    const ciclo = (async () => { while (vivo) { await tablero().catch(() => {}); await page.waitForTimeout(120); } })();
    const fin = page.evaluate((p) => window.uiDemo.pedir(p), PEDIDO);
    if (e.editar) {
      await page.waitForSelector('[data-cantidad="papa-pastusa"]');
      await page.waitForTimeout(900);
      await page.evaluate(() => { const i = document.querySelector('[data-cantidad="papa-pastusa"]'); i.value = '5'; i.dispatchEvent(new Event('input', { bubbles: true })); });
    }
    await fin;
    vivo = false; await ciclo; await tablero();
    if (e.editar) await page.evaluate(() => document.querySelector('[data-cantidad="papa-pastusa"]').closest('.fila').classList.add('m-foco'));
    resultados[`${id}-${version}`] = await page.evaluate(() => ({ ...window.uiDemo.medidas(), papa: document.querySelector('[data-cantidad="papa-pastusa"]').value }));
    await page.waitForTimeout(2600);
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
