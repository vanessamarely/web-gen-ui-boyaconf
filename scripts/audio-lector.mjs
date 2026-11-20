// Agrega a los videos de accesibilidad una voz sintética que lee los avisos que la demo envía al lector de pantalla.
// No es un lector de pantalla real: simula lo que se anuncia con la voz del sistema (macOS `say`).
//   npm run build -w demo && node scripts/audio-lector.mjs
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const DIST = join(ROOT, 'demo/dist');
const CLIPS = join(ROOT, 'slides/public/clips');
const TMP = join(ROOT, '.audio-tmp');
const VOZ = process.env.VOZ || 'Paulina';
const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const srv = createServer((q, r) => { let u = normalize(q.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html'; try { r.writeHead(200, { 'content-type': TIPOS[extname(u)] ?? 'application/octet-stream' }); r.end(readFileSync(join(DIST, u))); } catch { r.writeHead(404); r.end(); } }).listen(5379);
rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP);

/** Lo que la página anuncia, con su tiempo: región viva (sin preparar) o mensaje de estado (preparada). */
async function avisos(modo) {
  const b = await chromium.launch({ channel: 'chrome', headless: true });
  const p = await b.newPage();
  await p.goto(`http://localhost:5379/ui/?modo=${modo}&motor=grabacion`);
  await p.waitForFunction(() => document.body.dataset.motor);
  const lista = await p.evaluate(async () => {
    const out = [];
    const t0 = performance.now();
    const viva = document.querySelector('[data-superficie]');
    const estado = document.querySelector('[data-estado]');
    let previo = '';
    new MutationObserver(() => {
      if (!viva.hasAttribute('aria-live')) return;
      const texto = viva.innerText.replace(/\s+/g, ' ').trim();
      let i = 0;
      while (i < previo.length && previo[i] === texto[i]) i++;
      const nuevo = texto.slice(i).trim();
      previo = texto;
      if (nuevo) out.push([Math.round(performance.now() - t0), nuevo]);
    }).observe(viva, { childList: true, subtree: true, characterData: true });
    new MutationObserver(() => estado.textContent && out.push([Math.round(performance.now() - t0), estado.textContent])).observe(estado, { childList: true, characterData: true, subtree: true });
    await window.uiDemo.pedir('Arma un mercado para 4 personas con 120 mil');
    return out;
  });
  await b.close();
  return lista;
}

function pista(nombre, segmentos, duracion) {
  const entradas = [];
  const filtros = [];
  segmentos.forEach(([ms, texto, corte], i) => {
    const archivo = join(TMP, `${nombre}-${i}.aiff`);
    execFileSync('say', ['-v', VOZ, '-r', '210', '-o', archivo, texto]);
    entradas.push('-i', archivo);
    filtros.push(`[${i}:a]${corte ? `atrim=0:${corte},afade=t=out:st=${Math.max(0, corte - 0.05)}:d=0.05,` : ''}adelay=${ms}|${ms}[a${i}]`);
  });
  const mezcla = `${filtros.join(';')};${segmentos.map((_, i) => `[a${i}]`).join('')}amix=inputs=${segmentos.length}:normalize=0,apad,atrim=0:${duracion}[m]`;
  const salida = join(TMP, `${nombre}.wav`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', ...entradas, '-filter_complex', mezcla, '-map', '[m]', '-ar', '48000', salida]);
  return salida;
}

const duracion = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString());
for (const [version, modo] of [['antes', 'directo'], ['despues', 'preparada']]) {
  const video = join(CLIPS, `g-accesibilidad-${version}.webm`);
  const dur = duracion(video);
  const lista = await avisos(modo);
  // Sin preparar: cada aviso nuevo interrumpe al anterior, como cuando la región se reemplaza con cada pedazo.
  const segmentos = modo === 'directo'
    ? lista.filter((_, i, a) => i === 0 || a[i][0] - a[i - 1][0] > 0).filter((x, i, a) => i === 0 || x[0] - a[i - 1][0] >= 280).map(([ms, t], i, a) => [ms, t.split(' ').slice(0, 6).join(' '), a[i + 1] ? Math.max(0.25, (a[i + 1][0] - ms) / 1000) : 2])
    : lista.map(([ms, t]) => [ms, t, 0]);
  console.log(version, segmentos.length, 'avisos ·', segmentos.slice(0, 5).map((s) => s[1]).join(' | '));
  const audio = pista(version, segmentos.filter((s) => s[0] / 1000 < dur - 0.3), dur);
  const temp = join(TMP, `video-${version}.webm`);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', video, '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'libopus', '-b:a', '64k', '-shortest', temp]);
  execFileSync('cp', [temp, video]);
}
srv.close();
rmSync(TMP, { recursive: true, force: true });
