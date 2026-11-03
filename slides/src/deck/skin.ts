// Piel "Telar de luz" + "la charla se genera en vivo":
//  · hilos de luz (SVG) que atraviesan cada slide, con colores de BoyaConf y del telar;
//  · un estado por slide que pasa de "generando…" a "listo" mientras los bloques aparecen
//    como UI generativa (esqueleto → contenido): la charla demuestra su propio tema;
//  · el logo oficial de BoyaConf en el pie (pequeño, sin tapar contenido).
const COLORS = ['#22c68d', '#f43f5e', '#f3c94f', '#8fa9ec'];

/** Generador determinista (mismos hilos en cada ensayo y en las miniaturas). */
function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
}

/**
 * Los hilos viven SOLO en una franja delgada del borde inferior (debajo del pie), donde nunca
 * hay texto: decoran sin cruzar el contenido. En portada y capítulos la franja es un poco más alta.
 */
function hilos(i: number, fuerte: boolean): string {
  const r = rng(i * 97 + 13);
  const n = fuerte ? 4 : 3;
  const top = fuerte ? 660 : 694; // y mínima de la franja (lienzo de 720 de alto)
  const span = 720 - top;
  const y = () => (top + 4 + r() * (span - 6)).toFixed(0);
  const paths = Array.from({ length: n }, (_, k) => {
    const c = COLORS[(i + k) % COLORS.length];
    const dash = k % 2 ? ' class="flujo"' : '';
    return `<path${dash} d="M-40 ${y()} C 260 ${y()}, 520 ${y()}, 760 ${y()} S 1160 ${y()}, 1720 ${y()}" stroke="${c}" style="--c:${c}" opacity="${(fuerte ? 0.9 : 0.7) - k * 0.1}"/>`;
  }).join('');
  return `<svg class="hilos" viewBox="0 0 1680 720" preserveAspectRatio="none" aria-hidden="true">${paths}</svg>`;
}

export function mountSkin(sections: HTMLElement[]) {
  sections.forEach((s, i) => {
    const portada = s.classList.contains('cover') || s.classList.contains('section-slide');
    s.insertAdjacentHTML('afterbegin', hilos(i, portada));
    if (portada) return;
    const n = s.querySelectorAll('.reveal > *').length;
    s.style.setProperty('--n', String(n));
    s.insertAdjacentHTML('beforeend', `<div class="gen-status" aria-hidden="true"><span class="g1"><i></i> generando</span><span class="g2">✓ listo · 0 saltos</span></div>`);
  });
  document.querySelectorAll('.footer').forEach((f) =>
    f.insertAdjacentHTML('afterbegin', `<span class="foot-logo"><img src="/brand/boyaconf-isotipo.svg" alt="" width="18" height="18" /><span class="lt">‹</span>BoyaConf<span class="gt">›</span> 2026</span>`),
  );
}
