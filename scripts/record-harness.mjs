// Video guía del harness de la demo: instrucciones, una prueba y el resultado real de ejecutarlas.
//   node scripts/record-harness.mjs   (necesita Chrome; ejecuta las pruebas de demo/ en las dos versiones)
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, rmSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const DEMO = join(ROOT, 'demo');
const OUT = join(ROOT, 'slides/public/clips/g-harness');
const TMP = join(ROOT, '.clips-tmp');
const esc = (s) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

const correr = (modo) => {
  const r = spawnSync('npx', ['playwright', 'test', '--reporter=list'], { cwd: DEMO, env: { ...process.env, MODO: modo, FORCE_COLOR: '0' }, encoding: 'utf8' });
  return (r.stdout + r.stderr).split('\n').filter((l) => /[✓✘]|passed|failed/.test(l) && !/Error|expect\(/.test(l)).map((l) => l.replace(/\s+\(\d+(\.\d+)?s\)$/, '').replace(/tests\/reglas\.spec\.ts:\d+:\d+ › /, '').trim()).slice(0, 7);
};
console.log('ejecutando pruebas…');
const mal = correr('directo');
const bien = correr('preparada');
const agents = readFileSync(join(DEMO, 'AGENTS.md'), 'utf8').trim();
const spec = readFileSync(join(DEMO, 'tests/reglas.spec.ts'), 'utf8');
const prueba = spec.slice(spec.indexOf("test('estado"), spec.indexOf("test('accesibilidad")).trim();

const linea = (l, clase = '') => `<div class="l ${clase}">${esc(l) || '&nbsp;'}</div>`;
const html = `<!doctype html><meta charset="utf-8"><style>
body{margin:0;width:1280px;height:720px;overflow:hidden;background:#1a0e1c;font-family:system-ui;color:#fff}
.escena{position:absolute;inset:0;opacity:0;transition:opacity .5s}
.escena.on{opacity:1}
.marco{position:absolute;left:60px;right:60px;top:110px;bottom:100px;border-radius:18px;background:#fffdf8;color:#2a211b;overflow:hidden;transform-origin:var(--o,50% 30%);transition:transform 1.4s cubic-bezier(.3,.9,.3,1)}
.marco.zoom{transform:scale(var(--z,1.6))}
.barra{display:flex;gap:10px;align-items:center;padding:12px 18px;background:#eee6d8;font:700 18px ui-monospace,monospace}
.barra i{width:13px;height:13px;border-radius:50%;background:#e5294f;display:inline-block}.barra i:nth-child(2){background:#f3c94f}.barra i:nth-child(3){background:#22c68d}
pre{margin:0;padding:18px 26px;font:500 21px/1.5 ui-monospace,monospace;white-space:pre-wrap}
.l.h{background:#fff3c4;box-shadow:inset 5px 0 0 #f3c94f}
.term{background:#140b16;color:#e8e0ea}.term .barra{background:#2a1c2d;color:#fff}
.l.ok{color:#5fe0b0}.l.mal{color:#ff8fa3}.l.c{color:#ffe08a}
h1{position:absolute;top:26px;left:0;right:0;margin:0;text-align:center;font-size:38px}
h1 span{color:#22c68d}
.paso{position:absolute;left:50%;bottom:28px;transform:translateX(-50%);padding:12px 26px;border-radius:999px;background:#ffe08a;color:#2a211b;font:800 24px system-ui;white-space:nowrap}
</style>
<section class="escena" id="e1"><h1><span>1.</span> Instrucciones para el agente</h1>
<div class="marco" style="--o:0% 62%;--z:1.3"><div class="barra"><i></i><i></i><i></i> demo/AGENTS.md</div><pre>${agents.split('\n').map((l) => linea(l, /^\d\./.test(l) ? 'h' : '')).join('')}</pre></div>
<p class="paso">AGENTS.md: las 5 reglas que el agente debe cumplir</p></section>
<section class="escena" id="e2"><h1><span>2.</span> Una prueba por cada regla</h1>
<div class="marco" style="--o:0% 20%;--z:1.25"><div class="barra"><i></i><i></i><i></i> demo/tests/reglas.spec.ts</div><pre>${prueba.split('\n').map((l) => linea(l, /expect/.test(l) ? 'h' : '')).join('')}</pre></div>
<p class="paso">Playwright usa la web y revisa que la regla se cumpla</p></section>
<section class="escena" id="e3"><h1><span>3.</span> Se comprueba en un navegador real</h1>
<div class="marco term" style="--o:0% 0%;--z:1.35"><div class="barra"><i></i><i></i><i></i> Terminal</div><pre id="t"></pre></div>
<p class="paso" id="p3">npx playwright test</p></section>
<script>
const mal=${JSON.stringify(mal)}, bien=${JSON.stringify(bien)};
window.escribir=(lineas,titulo)=>{const t=document.getElementById('t');t.innerHTML='<div class="l c">$ npx playwright test   # '+titulo+'</div>';lineas.forEach((l,i)=>setTimeout(()=>{const d=document.createElement('div');d.className='l '+(/✓|passed/.test(l)?'ok':/✘|failed/.test(l)?'mal':'');d.textContent=l;t.append(d)},350*(i+1)))};
</script>`;
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });
writeFileSync(join(TMP, 'guia.html'), html);
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: TMP, size: { width: 1280, height: 720 } } });
const page = await ctx.newPage();
await page.goto('file://' + join(TMP, 'guia.html'));
const t0 = Date.now();
const ver = (id) => page.evaluate((x) => document.querySelectorAll('.escena').forEach((e) => e.classList.toggle('on', e.id === x)), id);
const zoom = (id) => page.evaluate((x) => document.querySelector(`#${x} .marco`).classList.add('zoom'), id);
const inicio = (Date.now() - t0) / 1000 + 0.3;
await ver('e1'); await page.waitForTimeout(1600); await zoom('e1'); await page.waitForTimeout(3400);
await ver('e2'); await page.waitForTimeout(1500); await zoom('e2'); await page.waitForTimeout(3600);
await ver('e3'); await page.waitForTimeout(500); await zoom('e3'); await page.waitForTimeout(900);
await page.evaluate((x) => { document.getElementById('p3').textContent = 'Sin preparar: las 5 reglas fallan'; window.escribir(x, 'versión sin preparar'); }, mal);
await page.waitForTimeout(400 * (mal.length + 1) + 1800);
await page.evaluate((x) => { document.getElementById('p3').textContent = 'Preparada: las 5 reglas pasan'; window.escribir(x, 'versión preparada'); }, bien);
await page.waitForTimeout(400 * (bien.length + 1) + 2800);
const fin = (Date.now() - t0) / 1000;
const video = page.video();
await ctx.close(); await browser.close();
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(inicio), '-to', String(fin), '-i', await video.path(), '-an', '-c:v', 'libvpx-vp9', '-crf', '32', '-b:v', '0', `${OUT}.webm`]);
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '6', '-i', `${OUT}.webm`, '-frames:v', '1', '-q:v', '4', `${OUT}.jpg`]);
rmSync(TMP, { recursive: true, force: true });
console.log('grabado', (fin - inicio).toFixed(1), 's', mal.length, bien.length);
