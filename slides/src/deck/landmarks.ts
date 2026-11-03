// Paisajes de Boyacá detrás de los tejedores (capítulos, portada y cierre).
// Ilustración plana con el trazo del deck (tinta #2a211b) y la paleta del telar.
// Lienzo 520×720 (proporción del panel en 16:9); el dibujo vive en x 60–460 y los fondos se
// extienden a los lados, así en 4:3 solo se recortan los costados (nunca el cielo ni los picos).
const INK = '#2a211b';
const S = `stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
// Cielo de atardecer: ciruela de BoyaConf arriba, cálido en el horizonte (funde con el fondo del deck).
const SKY = 'url(#lm-atardecer)';
const DEFS = `<defs><linearGradient id="lm-atardecer" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1a0e1c"/><stop offset=".45" stop-color="#4a2440"/><stop offset=".8" stop-color="#b8506a"/><stop offset="1" stop-color="#f3a35c"/></linearGradient></defs>`;

const svg = (body: string, label: string) =>
  `<svg class="landmark-svg" viewBox="0 0 520 720" preserveAspectRatio="xMidYMax slice" role="img" aria-label="${label}"><title>${label}</title>${DEFS}<g transform="translate(60 0)">${body}</g></svg>`;

const cloud = (x: number, y: number, s = 1) =>
  `<g class="lm-cloud" transform="translate(${x} ${y}) scale(${s})"><path d="M0 30 C0 14 16 8 26 14 C30 0 52 -2 60 12 C72 6 88 14 86 30 Z" fill="#f6c6c9" opacity=".75" ${S}/></g>`;

/** Sol con rayos que giran despacio (opcionalmente con cara, para el efecto de ❤️). */
const sol = (x: number, y: number, r: number, face = false) => {
  const rays = Array.from({ length: 16 }, (_, i) => {
    const a = (i * Math.PI) / 8;
    const r1 = r + 8;
    const r2 = r + (i % 2 ? 20 : 32);
    const w = 0.12;
    const p = (rr: number, aa: number) => `${(Math.cos(aa) * rr).toFixed(1)} ${(Math.sin(aa) * rr).toFixed(1)}`;
    return `<path d="M${p(r1, a - w)} L${p(r2, a)} L${p(r1, a + w)} Z" fill="#c98a12" ${S}/>`;
  }).join('');
  const f = face
    ? `<circle cx="${-r * 0.32}" cy="${-r * 0.12}" r="${r * 0.09}" fill="${INK}"/><circle cx="${r * 0.32}" cy="${-r * 0.12}" r="${r * 0.09}" fill="${INK}"/>
       <path d="M${-r * 0.36} ${r * 0.28} Q0 ${r * 0.52} ${r * 0.36} ${r * 0.28}" fill="none" ${S}/>`
    : '';
  return `<g transform="translate(${x} ${y})"><g class="lm-rays">${rays}</g><circle r="${r}" fill="#f3c94f" ${S}/>${f}</g>`;
};

/** Cóndor andino planeando (alas largas, collar blanco). */
const condor = (x: number, y: number, s = 1) =>
  `<g class="lm-condor" transform="translate(${x} ${y}) scale(${s})">
    <path d="M0 0 C-30 -14 -62 -12 -96 4 C-70 2 -52 8 -36 14 L-12 8 Z" fill="${INK}"/>
    <path d="M0 0 C30 -14 62 -12 96 4 C70 2 52 8 36 14 L12 8 Z" fill="${INK}"/>
    <path d="M-90 4 l-8 6 M-82 6 l-6 8 M90 4 l8 6 M82 6 l6 8" stroke="${INK}" stroke-width="3"/>
    <ellipse cx="0" cy="8" rx="13" ry="9" fill="${INK}"/><path d="M-9 1 Q0 -4 9 1" stroke="#fffdf8" stroke-width="4" fill="none"/>
    <circle cx="0" cy="-5" r="5" fill="#b8402e"/></g>`;

/** Cerros con la colcha de retazos: parcelas de colores sobre la ladera. */
function colcha(seedStart: number, top: number, bottom = 600): string {
  let seed = seedStart;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const colors = ['#9fd4a8', '#f3c94f', '#e2f0e2', '#2f7a4a', '#fbefcf', '#c9a65a'];
  let out = `<path d="M-80 ${top + 60} C40 ${top - 30} 140 ${top + 20} 220 ${top - 10} C300 ${top - 40} 400 ${top + 10} 480 ${top - 20} L480 ${bottom} L-80 ${bottom} Z" fill="#9fd4a8" ${S}/>`;
  for (let row = 0; row < 4; row++) {
    const y = top + 20 + row * ((bottom - top - 20) / 4);
    let x = -80;
    while (x < 480) {
      const w = 60 + rnd() * 80;
      const h = (bottom - top - 20) / 4;
      out += `<path d="M${x.toFixed(0)} ${(y + 6).toFixed(0)} L${(x + w).toFixed(0)} ${(y - 4).toFixed(0)} L${(x + w + 6).toFixed(0)} ${(y + h).toFixed(0)} L${(x - 4).toFixed(0)} ${(y + h + 4).toFixed(0)} Z" fill="${colors[Math.floor(rnd() * colors.length)]}" ${S} stroke-width="2"/>`;
      x += w;
    }
  }
  return out;
}

/** Frailejón: tronco de hojas secas y roseta plateada con flor amarilla. */
const frailejon = (x: number, y: number, s = 1) =>
  `<g transform="translate(${x} ${y}) scale(${s})">
    <path d="M-9 0 C-11 -40 -10 -80 -6 -110 L6 -110 C10 -80 11 -40 9 0 Z" fill="#8b6a46" ${S}/>
    <path d="M-9 -20 h18 M-10 -45 h20 M-9 -70 h18 M-7 -95 h14" stroke="#6b4f33" stroke-width="2"/>
    ${[-75, -50, -25, 0, 25, 50, 75].map((r) => `<path d="M0 -110 C-6 -128 -6 -146 0 -160 C6 -146 6 -128 0 -110 Z" fill="#b9c9b0" ${S} stroke-width="2" transform="rotate(${r} 0 -110)"/>`).join('')}
    <circle cx="0" cy="-114" r="6" fill="#f3c94f" ${S} stroke-width="2"/></g>`;

/** 01 · El telar: la ruana se teje sobre una urdimbre fija mientras la trama llega. */
export function telar(): string {
  const warp = Array.from({ length: 15 }, (_, i) => `<path d="M${70 + i * 18} 170 V560" stroke="#fffdf8" stroke-width="3"/>`).join('');
  const colors = ['#b8402e', '#f3c94f', '#2f4b8f', '#2a211b', '#2f7a4a', '#f3c94f', '#b8402e', '#2f4b8f'];
  const woven = colors.map((c, i) => `<rect x="62" y="${420 + i * 17}" width="268" height="14" fill="${c}" ${S} stroke-width="1.5"/>`).join('');
  return svg(
    `<rect x="-80" width="680" height="720" fill="${SKY}"/>
     ${sol(320, 100, 30)}${cloud(20, 70, 0.8)}
     ${colcha(11, 470, 720)}
     <rect x="40" y="140" width="22" height="470" fill="#8b5a2b" ${S}/><rect x="330" y="140" width="22" height="470" fill="#8b5a2b" ${S}/>
     <rect x="24" y="140" width="344" height="30" rx="6" fill="#6b4329" ${S}/>
     <rect x="24" y="560" width="344" height="30" rx="6" fill="#6b4329" ${S}/>
     <rect x="62" y="170" width="268" height="390" fill="#e9dcc4" ${S}/>
     ${warp}
     ${woven}
     <path d="M62 404 h268" stroke="${INK}" stroke-width="5"/>
     <g class="lm-shuttle"><path d="M110 392 L230 392 L246 400 L230 408 L110 408 L94 400 Z" fill="#c98a12" ${S}/><path d="M150 400 C190 380 250 380 300 404" fill="none" stroke="#b8402e" stroke-width="3"/></g>`,
    'Un telar de ruanas: la urdimbre fija y la trama de colores',
  );
}

/** 02 · Puente de Boyacá: el puente de piedra de un arco sobre el río Teatinos. */
export function puente(): string {
  return svg(
    `<rect x="-80" width="680" height="720" fill="${SKY}"/>
     ${sol(330, 110, 28)}${cloud(30, 90, 0.9)}${cloud(220, 180, 0.6)}
     ${condor(120, 230, 0.5)}
     ${colcha(5, 300, 520)}
     <path d="M-80 540 C60 520 140 560 220 540 C300 520 380 560 480 540 L480 640 L-80 640 Z" fill="#9fb7ea" ${S}/>
     <path d="M-20 580 c20 -6 40 6 60 0 M200 600 c20 -6 40 6 60 0 M330 570 c20 -6 40 6 60 0" fill="none" stroke="#fffdf8" stroke-width="3"/>
     <path d="M20 520 L380 520 L380 548 L320 548 C300 470 160 470 140 548 L20 548 Z" fill="#d8cdb8" ${S}/>
     <path d="M20 506 h360 v14 h-360 Z" fill="#c9bfb2" ${S}/>
     ${[40, 80, 120, 280, 320, 360].map((x) => `<path d="M${x} 520 v28" stroke="${INK}" stroke-width="1.5"/>`).join('')}
     <path d="M150 548 C168 490 292 490 310 548" fill="none" stroke="${INK}" stroke-width="2" stroke-dasharray="8 6"/>
     <rect x="-80" y="636" width="680" height="100" fill="#2f7a4a" ${S}/>`,
    'El Puente de Boyacá sobre el río',
  );
}

/** 03 · Lago de Tota: el lago con la isla, los cultivos de cebolla y la playa blanca. */
export function tota(): string {
  const onions = Array.from({ length: 12 }, (_, i) => `<path d="M${-40 + i * 40} 640 v-34 M${-46 + i * 40} 640 l-8 -28 M${-34 + i * 40} 640 l8 -28" stroke="#2f7a4a" stroke-width="4" stroke-linecap="round"/>`).join('');
  return svg(
    `<rect x="-80" width="680" height="720" fill="${SKY}"/>
     ${sol(90, 110, 30)}${cloud(220, 80, 0.8)}
     ${colcha(23, 260, 420)}
     <path d="M-80 400 C40 380 360 380 480 400 L480 580 L-80 580 Z" fill="#2f4b8f" ${S}/>
     <g class="lm-waves">${[430, 470, 510, 550].map((y, i) => `<path d="M${-60 + i * 30} ${y} c20 -8 40 8 60 0 c20 -8 40 8 60 0 M${200 - i * 20} ${y + 10} c20 -8 40 8 60 0" fill="none" stroke="#9fb7ea" stroke-width="3"/>`).join('')}</g>
     <path d="M220 440 C240 418 300 416 320 440 Z" fill="#9fd4a8" ${S}/>
     <path d="M-80 560 C80 548 200 570 480 556 L480 600 L-80 600 Z" fill="#fbefcf" ${S}/>
     <rect x="-80" y="596" width="680" height="140" fill="#6b4a35" ${S}/>
     ${onions}`,
    'El Lago de Tota con su isla y los cultivos de cebolla',
  );
}

/** 04 · Villa de Leyva: casas blancas de teja, la iglesia y la plaza empedrada. */
export function leyva(): string {
  const house = (x: number, y: number, w: number) =>
    `<g transform="translate(${x} ${y})"><rect x="0" y="-70" width="${w}" height="70" fill="#fffdf8" ${S}/>
      <path d="M-10 -70 L${w / 2} -104 L${w + 10} -70 Z" fill="#b8402e" ${S}/>
      <rect x="${w / 2 - 12}" y="-40" width="24" height="40" fill="#2f7a4a" ${S}/>
      <rect x="10" y="-58" width="16" height="16" fill="#2f4b8f" ${S} stroke-width="2"/><rect x="${w - 26}" y="-58" width="16" height="16" fill="#2f4b8f" ${S} stroke-width="2"/></g>`;
  const stones = Array.from({ length: 40 }, (_, i) => `<ellipse cx="${-60 + (i % 10) * 56 + (Math.floor(i / 10) % 2) * 28}" cy="${600 + Math.floor(i / 10) * 30}" rx="22" ry="10" fill="#d8cdb8" ${S} stroke-width="2"/>`).join('');
  return svg(
    `<rect x="-80" width="680" height="720" fill="${SKY}"/>
     ${sol(320, 100, 26)}${cloud(40, 110, 0.8)}
     ${colcha(31, 260, 470)}
     <g transform="translate(150 470)"><rect x="0" y="-150" width="100" height="150" fill="#fffdf8" ${S}/>
       <rect x="30" y="-230" width="40" height="80" fill="#fffdf8" ${S}/><path d="M24 -230 L50 -270 L76 -230 Z" fill="#b8402e" ${S}/>
       <path d="M50 -270 v-22 M40 -284 h20" stroke="${INK}" stroke-width="3"/>
       <path d="M30 0 V-50 C30 -76 70 -76 70 -50 V0 Z" fill="#6b4329" ${S}/><circle cx="50" cy="-110" r="12" fill="#f3c94f" ${S}/></g>
     ${house(-40, 470, 120)}${house(290, 470, 120)}
     <rect x="-80" y="466" width="680" height="270" fill="#e9dcc4" ${S}/>
     ${stones}`,
    'La plaza de Villa de Leyva con sus casas blancas',
  );
}

/** 05 · Páramo: frailejones junto a la laguna, entre la niebla. */
export function paramo(): string {
  return svg(
    `<rect x="-80" width="680" height="720" fill="${SKY}"/>
     ${cloud(10, 90, 1)}${cloud(230, 150, 0.8)}
     <path d="M-80 380 L40 250 L120 320 L220 200 L320 300 L420 230 L480 280 L480 520 L-80 520 Z" fill="#7d9a86" ${S}/>
     <path d="M-80 420 C60 400 340 410 480 430 L480 520 L-80 520 Z" fill="#9fb7ea" ${S}/>
     <path d="M-80 470 C100 440 300 470 480 450 L480 736 L-80 736 Z" fill="#a9c49a" ${S}/>
     <g class="lm-mist"><path d="M-80 360 C40 340 160 380 300 350 C380 336 440 350 480 346" fill="none" stroke="#fffdf8" stroke-width="10" opacity=".7"/></g>
     ${frailejon(40, 650, 1.1)}${frailejon(160, 600, 0.8)}${frailejon(260, 680, 1.25)}${frailejon(360, 590, 0.75)}`,
    'Páramo con frailejones y laguna',
  );
}

/** Portada y cierre: el cielo de Boyacá (sol, nubes y cóndor) sobre la colcha de retazos. */
export function coverSky(): string {
  return `<svg class="landmark-svg" viewBox="0 0 520 720" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g transform="translate(60 0)">
    ${sol(300, 130, 44)}
    ${cloud(40, 90, 0.9)}${cloud(170, 190, 0.6)}
    ${condor(120, 260, 0.7)}
  </g></svg>`;
}

export const LANDMARKS: Record<string, () => string> = { telar, puente, tota, leyva, paramo, cover: coverSky };

/** Piezas sueltas para los efectos de reacciones (SVG independientes). */
export const condorSVG = () => `<svg viewBox="-110 -30 220 60" aria-hidden="true">${condor(0, 0, 1)}</svg>`;
export const solSVG = () => `<svg viewBox="-110 -110 220 220" aria-hidden="true">${sol(0, 0, 62, true)}</svg>`;
/** Tejo: el disco de metal golpea la cancha de greda y revienta la mecha. */
export const tejoSVG = () => `<svg viewBox="-120 -110 240 220" aria-hidden="true">
  <ellipse cx="0" cy="60" rx="100" ry="34" fill="#9a6440" ${S}/>
  <ellipse cx="0" cy="56" rx="60" ry="18" fill="#c98b5e" ${S}/>
  <g class="tejo-boom">${Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6;
    return `<path d="M${(Math.cos(a) * 26).toFixed(1)} ${(Math.sin(a) * 18 + 30).toFixed(1)} L${(Math.cos(a) * 86).toFixed(1)} ${(Math.sin(a) * 60 + 20).toFixed(1)}" stroke="${i % 2 ? '#f3c94f' : '#b8402e'}" stroke-width="7" stroke-linecap="round"/>`;
  }).join('')}<circle cx="0" cy="30" r="24" fill="#f3c94f" ${S}/></g>
  <ellipse cx="0" cy="34" rx="30" ry="12" fill="#8a8f96" ${S}/><ellipse cx="0" cy="29" rx="30" ry="11" fill="#b6bcc4" ${S}/></svg>`;
