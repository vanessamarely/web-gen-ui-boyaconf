// Controlador del deck: pie de página, tema, contraste, proporción de pantalla, menú,
// decoraciones (tejedores, checklist, código) y la conexión en vivo con el público y la consola.
import {
  Bot,
  Camera,
  CirclePlay,
  GitBranch,
  Globe,
  BookOpen,
  Check,
  Eye,
  Gauge,
  RefreshCw,
  Trophy,
  Users,
  ArrowRight,
  ArrowUpRight,
  createIcons,
  MessageSquare,
} from 'lucide';
import { CHECKLIST, SLIDE_BY_ID } from '../shared/content';
import { RONDAS, SALIDA_FINAL, SALIDA_INICIAL, type FilaSalida } from '../shared/rondas';
import { DEMO_URL, NS, PUBLIC_DEMO_URL, REPO_URL, isPublicView, prettyUrl, publicLiveUrl, withSessionParams } from '../shared/config';
import { tejedorSVG, type TejedorOptions } from '../shared/tejedor';
import { QUESTIONS, type QuestionId } from '../shared/questions';
import { esc } from '../shared/esc';
import { mountSkin } from './skin';
import { initLive } from './live';
import { MODES, RATIOS, initRatio, type RatioMode } from './ratio';
import { initCodeFocus } from './code-focus';
import { highlight } from './highlight';
import { LANDMARKS } from './landmarks';

type DeckStage = HTMLElement & { goTo(i: number): void; next(): void; prev(): void };


const stage = document.querySelector('deck-stage') as DeckStage;
// En los slides publicados solo queda el contenido: nada de QR para unirse, preguntas, muro ni podio.
const publico = isPublicView();
const SOLO_EN_VIVO = new Set(['unete', 'vecino', 'q1', 'q2', 'q3', 'muro', 'podio']);
if (publico) {
  document.documentElement.dataset.publico = '';
  // Sin miniaturas ni botón de reinicio: son herramientas de quien presenta.
  postMessage({ type: '__deck_rail_visible', on: false }, location.origin);
  stage.shadowRoot?.querySelector<HTMLElement>('.reset')?.style.setProperty('display', 'none');
  stage.querySelectorAll<HTMLElement>(':scope > section').forEach((s) => SOLO_EN_VIVO.has(s.dataset.id ?? '') && s.remove());
}
// Los controles flotantes del deck van por encima del pie: nunca tapan las redes.
stage.shadowRoot?.append(Object.assign(document.createElement('style'), { textContent: '.overlay { bottom: 64px !important; }' }));
const sections = [...stage.querySelectorAll<HTMLElement>(':scope > section')];
const total = sections.length;
const pad = (n: number) => String(n).padStart(2, '0');
const save = (k: string, v: string) => {
  try {
    localStorage.setItem(`${NS}.deck.${k}`, v);
  } catch {
    /* noop */
  }
};

// Cada slide del HTML debe existir en content.ts (fuente del celular, la consola y la memoria).
sections.forEach((s) => {
  if (!SLIDE_BY_ID.has(s.dataset.id ?? '')) console.warn('[deck] slide sin contenido en content.ts:', s.dataset.id);
});

// ── Pie de página con contador ───────────────────────────────────────
sections.forEach((s, i) => {
  s.insertAdjacentHTML(
    'beforeend',
    `<div class="footer"><span class="handles"><b class="foot-web">vanessamarely.dev</b><span>Instagram <b>@vanessamarelycode</b></span><span>GitHub <b>vanessamarely</b></span></span><span class="foot-num">${pad(i + 1)} / ${total}</span></div>`,
  );
});

mountSkin(sections);

// ── QR pequeño para unirse en cada slide (para quien llega tarde) ─────
// Esquina inferior izquierda, con aire alrededor. No va donde ya hay un QR grande.
// Tecla J: mostrar / ocultar (se recuerda en este navegador).
const NO_JOIN_QR = new Set(['portada', 'bio', 'unete', 'gracias']);
sections.forEach((s) => {
  if (publico || NO_JOIN_QR.has(s.dataset.id ?? '')) return;
  s.insertAdjacentHTML('beforeend', '<div class="join-notch" aria-hidden="true"><div class="join-qr" data-qr="live"></div><span>Únete</span></div>');
});
try {
  if (localStorage.getItem(`${NS}.deck.joinqr`) === '0') document.documentElement.dataset.joinqr = 'off';
} catch {
  /* noop */
}
const toggleJoinQr = () => {
  const off = document.documentElement.dataset.joinqr !== 'off';
  if (off) document.documentElement.dataset.joinqr = 'off';
  else delete document.documentElement.dataset.joinqr;
  save('joinqr', off ? '0' : '1');
};

// ── Reglas: una sola fuente para deck, celular y memoria ──
document.querySelectorAll<HTMLElement>('[data-ronda]').forEach((sec) => {
  const d = RONDAS.find((x) => x.id === sec.dataset.ronda);
  if (!d) return;
  const video = (v: string, texto: string) => `<video muted loop playsinline preload="none" data-src="/clips/g-${d.id}-${v}.webm" poster="/clips/g-${d.id}-${v}.jpg" aria-label="${esc(d.problema)}: ${texto}"></video>`;
  sec.querySelector('.card-frame')!.innerHTML = `
    <p class="eyebrow">Regla ${d.n} de ${RONDAS.length} · ${esc(d.tema)}</p>
    <h2 class="title">${esc(d.problema)}</h2>
    <p class="pasaba"><b>Ya sabíamos</b> ${esc(d.yaSabiamos)} <b>Ahora</b> ${esc(d.ahora)}</p>
    <div class="ronda-videos">
      <figure class="rojo"><figcaption><span>Sin preparar</span><b>${esc(d.antes)}</b></figcaption>${video('antes', 'versión sin preparar')}</figure>
      <figure class="verde"><figcaption><span>Preparada</span><b>${esc(d.despues)}</b></figcaption>${video('despues', 'versión preparada')}</figure>
    </div>
    <p class="medida"><b>${esc(d.mide)}</b> · ${esc(d.limite)}${d.ejemplo ? ` <code>${esc(d.ejemplo)}</code>` : ''}</p>`;
});
document.querySelectorAll<HTMLElement>('[data-codigo]').forEach((sec) => {
  const d = RONDAS.find((x) => x.id === sec.dataset.codigo);
  if (!d) return;
  const celda = (c: string) => `<pre>${highlight(c, 'js')}</pre>`;
  sec.querySelector('.card-frame')!.innerHTML = `
    <p class="eyebrow">Regla ${d.n} de ${RONDAS.length} · Cómo se implementa</p>
    <h2 class="title">${esc(d.correccion)}</h2>
    <p class="pasaba idea">${esc(d.idea)}</p>
    ${d.comun ? `<div class="code sm comun">${celda(d.comun)}</div>` : ''}
    ${d.diagrama ? `<div class="diagrama" aria-hidden="true"><div class="dg"><span class="mal">Cada pedacito</span><span class="marcas muchas"></span><b>204 redibujos</b></div><div class="dg"><span class="bien">Cada 100 ms</span><span class="marcas pocas"></span><b>51 redibujos</b></div></div>` : ''}
    <table class="matriz">
      <thead><tr><th scope="col">Framework</th><th scope="col" class="mal">✗ Evita: ${esc(d.evitaTitulo)}</th><th scope="col" class="bien">✓ Usa: ${esc(d.usaTitulo)}</th></tr></thead>
      <tbody>${d.frameworks.map((f) => `<tr><th scope="row">${esc(f.nombre)}</th><td class="mal">${celda(f.evita)}</td><td class="bien">${celda(f.usa)}</td></tr>`).join('')}</tbody>
    </table>
    ${d.porque ? `<p class="porque">${esc(d.porque)}</p>` : ''}`;
});
const salida = (filas: FilaSalida[]) => `<div class="t-fila t-cab"><b></b><span>Regla</span><code>Lo que pasó en la demo</code></div>` + filas.map((f) => `<div class="t-fila ${f.ok ? 'ok' : 'mal'}"><b>${f.ok ? '✓' : '✗'}</b><span>${esc(f.nombre)}</span><code>${esc(f.valor)}</code></div>`).join('') + `<p class="t-total">${filas.filter((f) => f.ok).length} de ${filas.length} reglas cumplidas</p>`;
document.querySelectorAll<HTMLElement>('[data-salida]').forEach((el) => (el.innerHTML = salida(el.dataset.salida === 'final' ? SALIDA_FINAL : SALIDA_INICIAL)));

// ── Preguntas: texto en el deck (las respuestas NO están en el bundle) ──
document.querySelectorAll<HTMLElement>('[data-q-text]').forEach((el) => (el.textContent = QUESTIONS[el.dataset.qText as QuestionId].text));

// ── Decoraciones: tejedores de ejemplo y checklist ────────────────────
// Semilla fija por posición: los mismos tejedores en cada ensayo (y en las miniaturas).
const DECOR: TejedorOptions[] = [
  { ruana: 0, patron: 0, sombrero: 0, piel: 2, accesorio: 1, expresion: 0 },
  { ruana: 2, patron: 1, sombrero: 1, piel: 3, accesorio: 3, expresion: 1 },
  { ruana: 3, patron: 3, sombrero: 3, piel: 1, accesorio: 5, expresion: 0 },
  { ruana: 1, patron: 2, sombrero: 2, piel: 4, accesorio: 2, expresion: 2 },
  { ruana: 4, patron: 4, sombrero: 4, piel: 0, accesorio: 4, expresion: 3 },
  { ruana: 5, patron: 1, sombrero: 5, piel: 2, accesorio: 6, expresion: 1 },
];
// Paisajes de Boyacá detrás de los tejedores (capítulos, portada y cierre).
document.querySelectorAll<HTMLElement>('[data-landmark]').forEach((el) => {
  el.innerHTML = LANDMARKS[el.dataset.landmark!]?.() ?? '';
});
// Tejedores que llegan por el camino en cada capítulo, en la receta y sobre el tejido.
document.querySelectorAll<HTMLElement>('[data-runner]').forEach((el) => {
  el.innerHTML = tejedorSVG(DECOR[Number(el.dataset.runner) % DECOR.length], 'Tejedor');
});
document.querySelectorAll<HTMLElement>('[data-tejedores]').forEach((el, k) => {
  const n = Number(el.dataset.tejedores) || 3;
  el.innerHTML = Array.from({ length: n }, (_, i) => tejedorSVG(DECOR[(i + k * 3) % DECOR.length], 'Tejedor').replace('<svg ', `<svg style="--i:${i}" `)).join('');
});
const checklist = document.querySelector('[data-checklist]');
if (checklist) checklist.innerHTML = CHECKLIST.map(([h, p]) => `<li><span><b>${esc(h)}:</b> ${esc(p)}</span></li>`).join('');

// ── Enlaces a la demo ────────────────────────────────────────────────
document.querySelectorAll<HTMLAnchorElement>('[data-demo-link]').forEach((a) => (a.href = new URL(a.dataset.demoLink!, DEMO_URL).toString()));
// El QR y el texto de la demo apuntan SIEMPRE a la versión publicada (los asistentes no pueden abrir localhost).
document.querySelectorAll('[data-demo-url]').forEach((el) => (el.textContent = prettyUrl(PUBLIC_DEMO_URL)));

// ── Tema (claro / oscuro) y alto contraste ───────────────────────────
const isDark = () => document.documentElement.dataset.theme === 'dark';
function setTheme(dark: boolean) {
  if (dark) document.documentElement.dataset.theme = 'dark';
  else delete document.documentElement.dataset.theme;
  save('theme', dark ? 'dark' : 'light');
  dispatchEvent(new Event('tweakchange')); // deck-stage re-sincroniza las miniaturas
}
function toggleContrast() {
  const on = document.documentElement.dataset.contrast !== 'high';
  if (on) document.documentElement.dataset.contrast = 'high';
  else delete document.documentElement.dataset.contrast;
  save('contrast', on ? '1' : '0');
  dispatchEvent(new Event('tweakchange'));
}
document.fonts?.ready.then(() => dispatchEvent(new Event('tweakchange')));

// ── Pantalla completa / panel lateral ────────────────────────────────
const toggleFullscreen = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => undefined);
let railOn = true;
try {
  railOn = localStorage.getItem('deck-stage.railVisible') !== '0';
} catch {
  /* noop */
}
const toggleRail = () => {
  railOn = !railOn;
  postMessage({ type: '__deck_rail_visible', on: railOn }, location.origin);
};

// ── Menú hamburguesa (siempre arriba a la derecha) ───────────────────
const menuBtn = document.querySelector<HTMLButtonElement>('.deck-menu-btn')!;
const menu = document.querySelector<HTMLElement>('.deck-menu-panel')!;
let current = Math.max(0, sections.findIndex((s) => s.hasAttribute('data-deck-active')));

const ratioLabel = (m: RatioMode) => (m === 'auto' ? ['Auto', 'según la ventana'] : m === 'event' ? ['Extendida', '1680×672 · bandas'] : [RATIOS[m].label, RATIOS[m].hint]);
menu.innerHTML = publico ? `
  <div class="group">Enlaces</div>
  <a href="${REPO_URL}" target="_blank" rel="noreferrer">Repositorio <i data-lucide="arrow-up-right"></i></a>
  <div class="group">Vista</div>
  <button type="button" data-act="theme">Modo claro / oscuro</button>
  <button type="button" data-act="fs">Pantalla completa</button>
  <div class="group">Ir a</div>
  <div class="slides-list"></div>` : `
  <div class="group">Enlaces</div>
  <a href="${withSessionParams('/presenter/')}" target="_blank" rel="noreferrer">Consola de la presentadora <kbd>P</kbd></a>
  <a href="${publicLiveUrl()}" target="_blank" rel="noreferrer">App de asistentes <i data-lucide="arrow-up-right"></i></a>
  <a href="${DEMO_URL}" target="_blank" rel="noreferrer">Demo <i data-lucide="arrow-up-right"></i></a>
  <a href="${REPO_URL}" target="_blank" rel="noreferrer">Repositorio <i data-lucide="arrow-up-right"></i></a>
  <div class="group">Proporción de pantalla <kbd><span data-ratio-state></span> · A</kbd></div>
  <div class="ratio-row">${MODES.map((m) => {
    const [l, h] = ratioLabel(m);
    return `<button type="button" data-ratio-pick="${m}">${l}<small>${h}</small></button>`;
  }).join('')}</div>
  <div class="group">Vista</div>
  <button type="button" data-act="theme">Modo claro / oscuro <kbd>L</kbd></button>
  <button type="button" data-act="contrast">Alto contraste (proyector) <kbd>H</kbd></button>
  <button type="button" data-act="fs">Pantalla completa <kbd>F</kbd></button>
  <button type="button" data-act="rail">Panel de miniaturas <kbd>S</kbd></button>
  <button type="button" data-act="joinqr">QR para unirse en cada slide <kbd>J</kbd></button>
  <button type="button" data-act="present" data-presenter-only>Presentar en vivo (GitHub)</button>
  <button type="button" data-act="answers" data-presenter-ui hidden>Cargar respuestas del podio… <kbd data-answers-status></kbd></button>
  <button type="button" data-act="questions" data-presenter-ui hidden>Preguntas del público <kbd><span data-q-count>0</span> · Q</kbd></button>
  <button type="button" data-act="wipe" data-presenter-ui hidden>Vaciar sesión en vivo…</button>
  <div class="group">Ir a</div>
  <div class="slides-list"></div>`;

function renderMenuList() {
  const list = menu.querySelector('.slides-list')!;
  if (!list.childElementCount) {
    sections.forEach((s, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = `${pad(i + 1)} · ${s.dataset.label ?? 'Slide'}`;
      b.addEventListener('click', () => {
        stage.goTo(i);
        closeMenu();
      });
      list.append(b);
    });
  }
  [...list.children].forEach((b, i) => (i === current ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current')));
}

const openMenu = () => {
  menu.hidden = false;
  menuBtn.setAttribute('aria-expanded', 'true');
  menuBtn.setAttribute('aria-label', 'Cerrar menú');
  // Abre en el slide actual: al final de la charla no obliga a recorrer toda la lista.
  const actual = menu.querySelector<HTMLElement>('.slides-list [aria-current]') ?? menu.querySelector<HTMLElement>('a, button');
  actual?.focus({ preventScroll: true });
  if (actual) menu.scrollTop += actual.getBoundingClientRect().top - menu.getBoundingClientRect().top - (menu.clientHeight - actual.offsetHeight) / 2;
};
const closeMenu = () => {
  menu.hidden = true;
  menuBtn.setAttribute('aria-expanded', 'false');
  menuBtn.setAttribute('aria-label', 'Abrir menú');
};
menuBtn.addEventListener('click', () => (menu.hidden ? openMenu() : closeMenu()));
let cerradoPorFuera = false;
addEventListener('pointerdown', (e) => {
  if (menu.hidden || menu.contains(e.target as Node) || menuBtn.contains(e.target as Node)) return;
  closeMenu();
  cerradoPorFuera = true;
});
// Tocar fuera solo cierra el menú: ese toque no debe cambiar de slide.
addEventListener('click', (e) => {
  if (!cerradoPorFuera) return;
  cerradoPorFuera = false;
  e.stopPropagation();
  e.preventDefault();
}, true);
addEventListener('pointercancel', () => (cerradoPorFuera = false));
menu.addEventListener('click', (e) => {
  const t = e.target as HTMLElement;
  const pickRatio = t.closest<HTMLElement>('[data-ratio-pick]')?.dataset.ratioPick as RatioMode | undefined;
  if (pickRatio) return ratio.set(pickRatio);
  const act = t.closest<HTMLElement>('[data-act]')?.dataset.act;
  if (act === 'theme') setTheme(!isDark());
  if (act === 'contrast') toggleContrast();
  if (act === 'fs') toggleFullscreen();
  if (act === 'rail') toggleRail();
  if (act === 'joinqr') toggleJoinQr();
  if (act === 'present') document.dispatchEvent(new CustomEvent('deck:present'));
  if (act === 'answers') document.dispatchEvent(new CustomEvent('deck:answers'));
  if (act === 'wipe') {
    closeMenu();
    document.dispatchEvent(new CustomEvent('deck:wipe'));
  }
  if (act === 'questions') {
    closeMenu();
    document.dispatchEvent(new CustomEvent('deck:questions'));
  }
});

// ── Clips de la demo: se cargan perezosamente y solo se reproducen en el slide activo ──
function playClips(slide: HTMLElement) {
  document.querySelectorAll<HTMLVideoElement>('video[data-src]').forEach((v) => {
    if (slide.contains(v)) {
      if (!v.src) v.src = v.dataset.src!;
      v.currentTime = 0;
      v.play().catch(() => undefined);
    } else v.pause();
  });
}
// La presentadora descarga los videos al abrir: si la señal se cae, siguen funcionando.
async function guardarVideos() {
  for (const v of document.querySelectorAll<HTMLVideoElement>('video[data-src]')) {
    try {
      const copia = async (url: string) => URL.createObjectURL(await (await fetch(url)).blob());
      if (v.getAttribute('poster')) v.poster = await copia(v.getAttribute('poster')!);
      v.src = await copia(v.dataset.src!);
      if (v.closest('[data-deck-active]')) v.play().catch(() => undefined);
    } catch {
      /* Sin copia: el video se pide al llegar a su slide. */
    }
  }
}
if (!publico) void guardarVideos();

// Antes de cada pregunta se avisa, y al mostrarla corre un tiempo visible para responder.
const SEGUNDOS_PREGUNTA = 20;
if (!publico) {
  sections.forEach((s, i) => {
    if (sections[i + 1]?.dataset.q) s.insertAdjacentHTML('beforeend', '<p class="aviso-pregunta"><b>Sigue una pregunta:</b> abre la app o prepárate para levantar la mano</p>');
    if (s.dataset.q) s.querySelector('.poll-foot')?.insertAdjacentHTML('afterbegin', `<span class="pill poll-tiempo" data-tiempo>${SEGUNDOS_PREGUNTA} s</span>`);
  });
}
let relojPregunta = 0;
function iniciarTiempo(slide: HTMLElement) {
  clearInterval(relojPregunta);
  const el = slide.querySelector<HTMLElement>('[data-tiempo]');
  if (!el) return;
  let queda = SEGUNDOS_PREGUNTA;
  el.textContent = `${queda} s`;
  el.classList.remove('fin');
  relojPregunta = window.setInterval(() => {
    queda -= 1;
    el.textContent = queda > 0 ? `${queda} s` : '¡Tiempo!';
    if (queda > 0) return;
    el.classList.add('fin');
    clearInterval(relojPregunta);
  }, 1000);
}

stage.addEventListener('slidechange', (e) => {
  const { index, slide } = (e as CustomEvent).detail as { index: number; slide: HTMLElement };
  iniciarTiempo(slide);
  current = index;
  renderMenuList();
  playClips(slide);
});
setTimeout(() => {
  const first = sections.find((s) => s.hasAttribute('data-deck-active'));
  if (first) playClips(first);
});
renderMenuList();

createIcons({
  icons: { MessageSquare, Bot, Camera, CirclePlay, GitBranch, Globe, BookOpen, Check, Eye, Gauge, RefreshCw, Trophy, Users, ArrowRight, ArrowUpRight },
  attrs: { 'stroke-width': 1.75, 'aria-hidden': 'true' },
});
dispatchEvent(new Event('tweakchange'));

// ── Atajos (sin chocar con deck-stage: ←/→, espacio, R, números) ─────
addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.toLowerCase();
  if (k === 'escape' && !menu.hidden) closeMenu();
  if (k === 'l') setTheme(!isDark());
  if (k === 'f') toggleFullscreen();
  if (k === 'm') (menu.hidden ? openMenu : closeMenu)();
  if (publico) return;
  if (k === 'h') toggleContrast();
  if (k === 's') toggleRail();
  if (k === 'a') ratio.cycle();
  if (k === 'e') ratio.toggleEvent();
  if (k === 'j') toggleJoinQr();
  if (k === 'p') open(withSessionParams('/presenter/'), `${NS}-presenter`);
});

// ── Proporción de pantalla (4:3 · 16:10 · 16:9 · 21:9 · extendida) ───
const ratio = initRatio(stage, sections);

// ── Modo foco en el código: una idea a la vez (↓/↑ o clic) ──
initCodeFocus(stage, sections);

// ── El código siempre cabe: ajusta el tamaño de letra al ancho Y al alto disponibles ──
// (en 4:3 la columna es más angosta; en 21:9 hay más espacio). Mínimo legible: 11 px.
function fitCode() {
  document.querySelectorAll<HTMLElement>('.code pre').forEach((pre) => {
    const frame = pre.closest<HTMLElement>('.card-frame');
    let size = 17;
    pre.style.fontSize = `${size}px`;
    const tooBig = () => pre.scrollWidth > pre.clientWidth + 1 || (frame ? frame.scrollHeight > frame.clientHeight + 1 : false);
    while (size > 11 && tooBig()) pre.style.fontSize = `${(size -= 0.5)}px`;
  });
}
let fitRaf = 0;
addEventListener('resize', () => {
  cancelAnimationFrame(fitRaf);
  fitRaf = requestAnimationFrame(fitCode);
});
document.fonts?.ready.then(fitCode);
fitCode();

initLive(stage, sections).catch((err) => console.error('[live]', err));
