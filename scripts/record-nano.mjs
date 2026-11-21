// Graba la demo con Gemini Nano real (necesita Chrome con el modelo instalado en este computador).
//   npm run build -w demo && PERFIL=/ruta/perfil-chrome node scripts/record-nano.mjs
// Salida: slides/public/clips/g-tres.{webm,jpg}
import { execFileSync, spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const DIST = join(ROOT, 'demo/dist');
const ESCENA = process.env.ESCENA || 'tres';
const OUT = join(ROOT, `slides/public/clips/g-${ESCENA}`);
const TMP = join(ROOT, '.clips-tmp');
const PERFIL = process.env.PERFIL;
if (!PERFIL) throw new Error('Falta PERFIL: un perfil de Chrome con Gemini Nano disponible');
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const srv = createServer((q, r) => { let u = normalize(q.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html'; try { r.writeHead(200, { 'content-type': TIPOS[extname(u)] ?? 'application/octet-stream' }); r.end(readFileSync(join(DIST, u))); } catch { r.writeHead(404); r.end(); } }).listen(5375);
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [`--user-data-dir=${PERFIL}`, '--remote-debugging-port=9334', '--no-first-run', '--no-default-browser-check', '--window-size=1300,860', 'about:blank'], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 6000));
const browser = await chromium.connectOverCDP('http://127.0.0.1:9334');
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP);
// Gemini Nano solo está en el perfil normal: se graba esa misma pestaña con el screencast de Chrome.
const ctx = browser.contexts()[0];
const page = ctx.pages()[0] ?? (await ctx.newPage());
await page.setViewportSize({ width: 1280, height: 720 });
const cdp = await ctx.newCDPSession(page);
const cuadros = [];
let grabando = false;
cdp.on('Page.screencastFrame', async ({ data, metadata, sessionId }) => {
  if (grabando) { const f = join(TMP, `c${String(cuadros.length).padStart(5, '0')}.jpg`); writeFileSync(f, Buffer.from(data, 'base64')); cuadros.push([f, metadata.timestamp]); }
  await cdp.send('Page.screencastFrameAck', { sessionId }).catch(() => {});
});
const IDIOMA = { expectedInputs: [{ type: 'text', languages: ['es'] }], expectedOutputs: [{ type: 'text', languages: ['es'] }] };
// Al abrir Chrome, el modelo puede tardar unos segundos en quedar disponible.
let listo = false;
for (let i = 0; i < 10 && !listo; i++) {
  await page.goto('http://localhost:5375/ui/?modo=preparada');
  await page.waitForFunction(() => document.body.dataset.motor, null, { timeout: 60000 });
  listo = (await page.evaluate(() => document.body.dataset.motor)) === 'nano';
  if (!listo) {
    // Si Chrome lo marca como descargable, crear una sesión con un clic real lo activa.
    await page.locator('h1').click();
    await page.evaluate((o) => LanguageModel.create(o).then((s) => s.destroy()), IDIOMA).catch(() => {});
    await page.waitForTimeout(5000);
  }
}
if (!listo) throw new Error('Gemini Nano no está disponible en este perfil');
await page.addStyleTag({ content: `.pedido,.medidas,.explica,.prueba,.modo,.cwv{display:none!important} body{max-width:1120px;padding:16px 24px 40px} ${ESCENA === 'tres' ? '.agente{display:none!important}' : '.agente .chips{display:none}'}` });
await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 85, maxWidth: 1280, maxHeight: 720 });
if (ESCENA === 'tres') {
  grabando = true;
  for (const p of ['Arma un mercado para 4 personas con 120 mil', '¿Dónde está más barata la papa?', '¿Qué cocino con papa, habas y cubios?']) {
    await page.evaluate(() => scrollTo(0, 0));
    await page.evaluate((x) => window.uiDemo.pedir(x), p);
    // Deja visible el resultado y el aviso de que lo generó Nano.
    await page.evaluate((x) => { const e = document.querySelector('[data-progreso]'); e.textContent = `“${x}” · generado por Gemini Nano en este navegador`; e.hidden = false; }, p);
    await page.waitForTimeout(3200);
  }
} else {
  // Primero la IA arma la lista (sin grabar). Luego el agente la usa con una acción, paso a paso.
  await page.evaluate(() => window.uiDemo.pedir('Arma un mercado para 4 personas con 120 mil'));
  await page.addStyleTag({ content: `.cabeza,.pedido,.medidas,.explica,.prueba,.modo,.cwv,.progreso,.ui-titulo,.b-consejo,[data-estado],.agente .chips,.agente-nota small,.aviso-agente{display:none!important}
    body{max-width:none;margin:0;padding:22px 24px 90px;display:grid;grid-template-columns:540px 1fr;gap:24px;align-items:start}
    .agente{margin:0;font-size:18px} .agente h2{font-size:20px} .agente .pedido-fila input{font-size:20px}
    .registro{font-size:19px} .registro code{font-size:17px}
    .superficie{zoom:1.12}
    .m-foco{outline:5px solid #e5294f!important;outline-offset:2px;border-radius:6px}
    .registro li.m-foco{outline-offset:0}
    #m-rotulo{position:fixed;z-index:9;left:50%;bottom:18px;transform:translateX(-50%);padding:12px 28px;border-radius:999px;background:#1a0e1c;color:#fff;font:700 24px system-ui;white-space:nowrap}` });
  await page.evaluate(() => { Element.prototype.scrollIntoView = () => {}; scrollTo(0, 0); document.body.insertAdjacentHTML('beforeend', '<div id="m-rotulo"></div>'); });
  const rotulo = (t) => page.evaluate((x) => { document.querySelector('#m-rotulo').textContent = x; }, t);
  grabando = true;
  await rotulo('1. Le pido al agente: “Quita las habas”');
  await page.waitForTimeout(700);
  await page.type('#qa', 'Quita las habas', { delay: 70 });
  await page.waitForTimeout(700);
  await rotulo('2. Gemini Nano elige una acción de la página…');
  const hecho = page.evaluate(() => window.uiDemo.usarAgente('Quita las habas'));
  // Se resalta la fila apenas Nano decide, antes de que salga de la lista.
  await page.waitForFunction(() => /quitar_producto/.test(document.querySelector('[data-registro] li')?.textContent ?? ''), null, { timeout: 60000 });
  await page.evaluate(() => document.querySelector('[data-registro] li')?.classList.add('m-foco'));
  await rotulo('2. Gemini Nano eligió quitar_producto({ id: "habas" })');
  await hecho;
  await page.waitForTimeout(1800);
  await rotulo('3. La página la ejecuta: las habas salen de la lista');
  await page.waitForTimeout(3200);
  console.log(await page.locator('[data-registro]').innerText());
}
grabando = false;
await cdp.send('Page.stopScreencast');
// Cada cuadro dura hasta el siguiente: el video conserva el ritmo real de Nano.
const lista = cuadros.map(([f, t], i) => `file '${f}'\nduration ${((cuadros[i + 1]?.[1] ?? t + 1.5) - t).toFixed(3)}`).join('\n') + `\nfile '${cuadros.at(-1)[0]}'\n`;
writeFileSync(join(TMP, 'lista.txt'), lista);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', join(TMP, 'lista.txt'), '-vf', 'fps=25,scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2:color=0xf7f5f0', '-c:v', 'libvpx-vp9', '-crf', '34', '-b:v', '0', `${OUT}.webm`]);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-sseof', '-0.4', '-i', `${OUT}.webm`, '-frames:v', '1', '-q:v', '4', `${OUT}.jpg`]);
const duracion = cuadros.at(-1)[1] - cuadros[0][1];
await browser.close().catch(() => {});
chrome.kill();
srv.close();
rmSync(TMP, { recursive: true, force: true });
console.log('grabado', duracion.toFixed(1), 's ·', cuadros.length, 'cuadros');
