// Crea tu tejedor: avatar inspirado en las tejedoras y tejedores de Boyacá (Nobsa, Cucunubá…)
// que hacen ruanas de lana en telar. Una ruana se teje hilo a hilo sobre una urdimbre fija:
// la mejor metáfora de una UI generativa sin fricción (estructura estable + hilos que llegan).
//
// Todo se dibuja en el dispositivo con SVG (y canvas para el PNG): sin red, sin fotos.
// Al muro solo viajan las opciones (pocos bytes); el deck vuelve a dibujar el SVG.
import { EVENT, SPEAKER, SPEAKER_HANDLE, TALK_TITLE } from './config';

export interface TejedorOptions {
  ruana: number;
  patron: number;
  sombrero: number;
  piel: number;
  accesorio: number;
  expresion: number;
  /** 0 mujer, 1 hombre, 2 sin especificar (los tejedores anteriores quedan así) */
  genero?: number;
}

export const DEFAULT_TEJEDOR: TejedorOptions = { ruana: 0, patron: 0, sombrero: 0, piel: 2, accesorio: 1, expresion: 0, genero: 2 };

/** Paletas de la ruana: [base, acento, acento 2, borde] — lana teñida con nombres de Boyacá. */
export const RUANAS = [
  { label: 'Nobsa', c: ['#6b4a35', '#f3e6cf', '#b8402e', '#2a211b'] },
  { label: 'Lago de Tota', c: ['#2f4b8f', '#9fb7ea', '#fffdf8', '#c98a12'] },
  { label: 'Páramo', c: ['#2f7a4a', '#9fd4a8', '#f3c94f', '#2a211b'] },
  { label: 'Ráquira', c: ['#b8402e', '#f3c94f', '#2f4b8f', '#fffdf8'] },
  { label: 'Villa de Leyva', c: ['#e9dcc4', '#6b4a35', '#2f7a4a', '#b8402e'] },
  { label: 'Sol de Sogamoso', c: ['#c98a12', '#fbefcf', '#b8402e', '#2a211b'] },
] as const;

/** Patrones tejidos en la ruana. */
export const PATRONES = ['Listas', 'Rombos', 'Cuadros', 'Grecas', 'Lisa'] as const;
export const SOMBREROS = ['Sombrero de paja', 'Sombrero de fieltro', 'Gorro tejido', 'Pañoleta', 'Trenzas', 'Corto'] as const;
export const PIELES = ['#f6d3b3', '#e8b48a', '#c98b5e', '#9a6440', '#6b4329'] as const;
export const ACCESORIOS = ['Ninguno', 'Madeja de lana', 'Tiple', 'Tejo', 'Laptop', 'Frailejón', 'Almojábana'] as const;
export const EXPRESIONES = ['Sonrisa', 'Guiño', 'Sorpresa', 'Concentrado'] as const;
export const GENEROS = ['Mujer', 'Hombre', 'Prefiero no decir'] as const;

/** El hilo que teje tu tejedor: la práctica que te llevas (lista cerrada: nada de texto libre llega al proyector). */
export const HILOS = [
  'La IA arma la pantalla, yo pongo las reglas',
  'Lo que dice la IA se muestra como texto',
  'Redibujo cada 100 ms, no con cada pedacito',
  'Mis listas usan el id como clave',
  'Lo que cambia la persona no se pierde',
  'Aviso al empezar y al terminar',
  'Ya tengo mi AGENTS.md',
  'Mido en un navegador real',
  'Core Web Vitals en verde',
  'Mi agente no entrega en rojo',
  'También mido la accesibilidad',
  'Mañana empiezo con una regla',
] as const;

export const LEYENDA =
  'Las ruanas de Boyacá se tejen a mano, hilo a hilo. Tu tejedor lleva el hilo que te llevas de esta charla.';

const INK = '#2a211b';
const HAIR = '#2b2118';
let seq = 0;

const clampIdx = (n: number, len: number) => (Number.isInteger(n) && n >= 0 && n < len ? n : 0);

export function normalizeTejedor(o: Partial<TejedorOptions> | null | undefined): TejedorOptions {
  return {
    ruana: clampIdx(o?.ruana ?? 0, RUANAS.length),
    patron: clampIdx(o?.patron ?? 0, PATRONES.length),
    sombrero: clampIdx(o?.sombrero ?? 0, SOMBREROS.length),
    piel: clampIdx(o?.piel ?? 2, PIELES.length),
    accesorio: clampIdx(o?.accesorio ?? 0, ACCESORIOS.length),
    expresion: clampIdx(o?.expresion ?? 0, EXPRESIONES.length),
    genero: clampIdx(o?.genero ?? 2, GENEROS.length),
  };
}

export function randomTejedor(r: () => number = Math.random): TejedorOptions {
  const n = (len: number) => Math.floor(r() * len);
  return { ruana: n(RUANAS.length), patron: n(PATRONES.length), sombrero: n(SOMBREROS.length), piel: n(PIELES.length), accesorio: n(ACCESORIOS.length), expresion: n(EXPRESIONES.length), genero: n(GENEROS.length) };
}

/** Patrón de la ruana como <pattern> con id único por dibujo. */
function patronDef(id: string, kind: number, [base, a1, a2]: readonly string[]): string {
  switch (kind) {
    case 1: // rombos tejidos
      return `<pattern id="${id}" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="${base}"/><path d="M8 1 L15 8 L8 15 L1 8 Z" fill="none" stroke="${a1}" stroke-width="2"/><path d="M8 6 L10 8 L8 10 L6 8 Z" fill="${a2}"/></pattern>`;
    case 2: // cuadros (escocés campesino)
      return `<pattern id="${id}" width="18" height="18" patternUnits="userSpaceOnUse"><rect width="18" height="18" fill="${base}"/><rect x="0" y="6" width="18" height="4" fill="${a1}" opacity=".65"/><rect x="6" y="0" width="4" height="18" fill="${a1}" opacity=".65"/><rect x="14" y="0" width="1.5" height="18" fill="${a2}"/><rect x="0" y="14" width="18" height="1.5" fill="${a2}"/></pattern>`;
    case 3: // grecas escalonadas
      return `<pattern id="${id}" width="20" height="12" patternUnits="userSpaceOnUse"><rect width="20" height="12" fill="${base}"/><path d="M0 9 H5 V5 H10 V1 H15 V5 H20" fill="none" stroke="${a1}" stroke-width="2.2"/><rect y="10.5" width="20" height="1.5" fill="${a2}"/></pattern>`;
    case 4: // lisa (lana cruda con jaspe)
      return `<pattern id="${id}" width="10" height="10" patternUnits="userSpaceOnUse"><rect width="10" height="10" fill="${base}"/><path d="M1 2h2M6 7h2M4 4h1" stroke="${a1}" stroke-width="1" opacity=".5"/></pattern>`;
    default: // listas verticales, como las ruanas de Nobsa
      return `<pattern id="${id}" width="24" height="10" patternUnits="userSpaceOnUse"><rect width="24" height="10" fill="${base}"/><rect x="3" width="4" height="10" fill="${a1}"/><rect x="9" width="1.6" height="10" fill="${a2}"/><rect x="15" width="4" height="10" fill="${a1}"/></pattern>`;
  }
}

const S = `stroke="${INK}" stroke-width="2" stroke-linejoin="round"`;
const CAP = `<path d="M68 96 C66 52 94 38 120 38 C146 38 174 52 172 96 C160 72 140 64 120 66 C100 64 80 72 68 96 Z" fill="${HAIR}" ${S}/><path d="M86 62 C96 50 112 45 128 45" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="4" stroke-linecap="round"/>`;

function sombreroBack(t: number, [, a1, a2]: readonly string[]): string {
  if (t === 4)
    // Trenzas largas con cintas de colores
    return `<g stroke="${INK}" stroke-width="2">
      <path d="M72 96 C60 140 64 170 70 200" fill="none" stroke="${HAIR}" stroke-width="16" stroke-linecap="round"/>
      <path d="M168 96 C180 140 176 170 170 200" fill="none" stroke="${HAIR}" stroke-width="16" stroke-linecap="round"/>
      <rect x="62" y="198" width="16" height="8" rx="3" fill="${a1}"/><rect x="162" y="198" width="16" height="8" rx="3" fill="${a2}"/></g>`;
  if (t === 3)
    // Pañoleta: la tela cae detrás de la cabeza
    return `<path d="M64 100 C60 140 70 168 92 178 L148 178 C170 168 180 140 176 100 Z" fill="${a1}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`;
  return '';
}

function sombreroFront(t: number, [base, a1, a2, borde]: readonly string[], pid: string): string {
  switch (t) {
    case 1: // Sombrero de fieltro campesino: copa alta con cinta y ala ancha
      return `${CAP}<g ${S}>
        <ellipse cx="120" cy="62" rx="84" ry="16" fill="#4a3628"/>
        <path d="M80 62 V30 C80 18 160 18 160 30 V62 Z" fill="#5d4433"/>
        <path d="M100 22 C112 28 128 28 140 22" fill="none" stroke="#3a2a1f" stroke-width="2"/>
        <rect x="80" y="46" width="80" height="10" fill="${borde === '#2a211b' ? a1 : borde}"/></g>`;
    case 2: // Gorro tejido de lana con orejeras y pompón
      return `<g ${S}>
        <path d="M66 100 C62 56 92 30 120 30 C148 30 178 56 174 100 C170 94 166 92 160 92 C150 82 136 78 120 78 C104 78 90 82 80 92 C74 92 70 94 66 100 Z" fill="url(#${pid})"/>
        <path d="M66 98 C64 112 66 124 72 132 C78 126 82 112 80 92 Z M174 98 C176 112 174 124 168 132 C162 126 158 112 160 92 Z" fill="${base}"/>
        <path d="M80 92 C96 80 144 80 160 92" fill="none" stroke="${a2}" stroke-width="5"/>
        <circle cx="120" cy="26" r="11" fill="${a1}"/></g>`;
    case 3: // Pañoleta anudada
      return `${CAP}<g ${S}>
        <path d="M64 92 C66 52 96 38 120 38 C144 38 174 52 176 92 C160 76 140 70 120 70 C100 70 80 76 64 92 Z" fill="${a1}"/>
        <path d="M70 84 C90 72 150 72 170 84" fill="none" stroke="${a2}" stroke-width="3" stroke-dasharray="2 6"/></g>`;
    case 4: // Trenzas: raya al medio
      return `${CAP}<path d="M120 40 L120 64" stroke="#4a3a2c" stroke-width="2"/>`;
    case 5: // Corto
      return `<path d="M68 94 C64 50 94 36 120 36 C150 36 176 50 172 94 C168 78 160 70 150 66 C142 76 124 80 104 76 C92 74 80 80 68 94 Z" fill="${HAIR}" ${S}/>`;
    default: // Sombrero de paja (jipa) con cinta tejida
      return `${CAP}<g ${S}>
        <ellipse cx="120" cy="62" rx="90" ry="18" fill="#e8c983"/>
        <path d="M82 62 V34 C82 22 158 22 158 34 V62 Z" fill="#f0d695"/>
        <path d="M88 30 h64 M86 40 h68" stroke="#c9a65a" stroke-width="1.4"/>
        <rect x="82" y="48" width="76" height="9" fill="url(#${pid})"/>
        <path d="M40 66 C70 80 170 80 200 66" fill="none" stroke="#c9a65a" stroke-width="1.6"/></g>`;
  }
}

function face(expresion: number): string {
  const cheeks = `<ellipse cx="92" cy="118" rx="8" ry="5" fill="#ff7daf" opacity=".5"/><ellipse cx="148" cy="118" rx="8" ry="5" fill="#ff7daf" opacity=".5"/>`;
  const line = `fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"`;
  const ojo = (x: number, r = 5.5) => `<circle cx="${x}" cy="101" r="${r}" fill="${INK}"/><circle cx="${x + 1.8}" cy="99" r="1.7" fill="#fff"/>`;
  const cejas = (dy = 0) => `<path d="M93 ${88 + dy} Q102 ${83 + dy} 110 ${88 + dy} M130 ${88 + dy} Q138 ${83 + dy} 147 ${88 + dy}" fill="none" stroke="${HAIR}" stroke-width="3.4" stroke-linecap="round"/>`;
  const nariz = `<path d="M120 106 Q116 113 122 114" fill="none" stroke="${INK}" stroke-opacity=".5" stroke-width="2.2" stroke-linecap="round"/>`;
  const risa = `<path d="M106 120 Q120 138 134 120 Z" fill="#7a2730" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/><path d="M112 127 Q120 132 128 127" fill="none" stroke="#ff8a8a" stroke-width="3" stroke-linecap="round"/>`;
  switch (expresion) {
    case 1: // guiño
      return `${cejas()}${ojo(102)}<path d="M131 101 Q138 95 145 101" ${line}/>${nariz}${cheeks}${risa}`;
    case 2: // sorpresa
      return `${cejas(-4)}${ojo(102, 6.5)}${ojo(138, 6.5)}${nariz}${cheeks}<ellipse cx="120" cy="127" rx="7" ry="9" fill="#7a2730" stroke="${INK}" stroke-width="2.4"/>`;
    case 3: // concentrado
      return `<path d="M93 90 Q102 86 110 91 M147 90 Q138 86 130 91" fill="none" stroke="${HAIR}" stroke-width="3.4" stroke-linecap="round"/>${ojo(102, 4.8)}${ojo(138, 4.8)}${nariz}${cheeks}<path d="M110 124 Q120 129 130 124" ${line}/>`;
    default: // sonrisa
      return `${cejas()}${ojo(102)}${ojo(138)}${nariz}${cheeks}${risa}`;
  }
}

/** Rasgos según el género elegido: pestañas, labios y aretes; o barba corta y cejas más gruesas. */
function rasgos(genero: number, a1: string): { atras: string; frente: string } {
  if (genero === 0)
    return {
      atras: `<path d="M70 96 C62 130 64 156 74 176 L90 170 C82 150 80 126 84 104 Z M170 96 C178 130 176 156 166 176 L150 170 C158 150 160 126 156 104 Z" fill="${HAIR}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>`,
      frente: `<path d="M95 95 l-4 -4 M98 93 l-2 -5 M145 95 l4 -4 M142 93 l2 -5" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>
        <g stroke="${INK}" stroke-width="2"><circle cx="69" cy="114" r="4.5" fill="${a1}"/><circle cx="171" cy="114" r="4.5" fill="${a1}"/></g>`,
    };
  if (genero === 1)
    return {
      atras: '',
      frente: `<path d="M92 86 Q102 80 111 86 M129 86 Q138 80 148 86" fill="none" stroke="${HAIR}" stroke-width="5" stroke-linecap="round"/>
        <path d="M82 116 C86 140 100 150 120 150 C140 150 154 140 158 116 C150 130 138 136 120 136 C102 136 90 130 82 116 Z" fill="${HAIR}" opacity=".85"/>`,
    };
  return { atras: '', frente: '' };
}

/** Manos por defecto (a los lados del ruana). */
const hands = (skin: string, l = true, r = true) =>
  `${l ? `<circle cx="64" cy="232" r="8" fill="${skin}" ${S}/>` : ''}${r ? `<circle cx="176" cy="232" r="8" fill="${skin}" ${S}/>` : ''}`;

function accessory(n: number, skin: string, [, a1, a2]: readonly string[]): { back: string; front: string } {
  switch (n) {
    case 1: // Madeja (ovillo) de lana con dos agujas y la hebra que cuelga
      return {
        back: '',
        front: `<g ${S}>
          <circle cx="176" cy="214" r="24" fill="${a1}"/>
          <path d="M156 204 C166 196 188 196 198 206 M154 216 C168 206 190 208 200 220 M160 230 C170 220 188 222 194 232" fill="none" stroke="${a2}" stroke-width="2.2"/>
          <path d="M150 190 L204 236 M158 184 L196 244" stroke="#8b5a2b" stroke-width="3.5" stroke-linecap="round"/>
          <circle cx="150" cy="190" r="3.5" fill="${a2}"/><circle cx="158" cy="184" r="3.5" fill="${a2}"/>
          <path d="M176 238 C172 256 186 262 180 280" fill="none" stroke="${a1}" stroke-width="2.4"/></g>${hands(skin, true, false)}<circle cx="160" cy="226" r="8" fill="${skin}" ${S}/>`,
      };
    case 2: // Tiple: la guitarra de 12 cuerdas de Chiquinquirá
      return {
        back: '',
        front: `<g ${S}>
          <path d="M150 186 L208 132" stroke="#6b4329" stroke-width="8" stroke-linecap="round"/>
          <rect x="200" y="118" width="18" height="20" rx="3" fill="#4a3628" transform="rotate(-42 209 128)"/>
          <path d="M120 196 C120 176 142 168 154 180 C164 172 182 180 176 198 C186 212 170 234 150 228 C132 240 112 222 120 196 Z" fill="#d9a35b"/>
          <circle cx="150" cy="202" r="7" fill="${INK}"/>
          <path d="M134 214 L206 136 M137 217 L208 139" stroke="#fffdf8" stroke-width="0.8"/></g>
          <circle cx="128" cy="214" r="8" fill="${skin}" ${S}/><circle cx="182" cy="160" r="8" fill="${skin}" ${S}/>${hands(skin, true, false)}`,
      };
    case 3: // Tejo: el disco de metal del deporte nacional, listo para reventar la mecha
      return {
        back: '',
        front: `<g ${S}>
          <ellipse cx="176" cy="210" rx="22" ry="16" fill="#8a8f96"/>
          <ellipse cx="176" cy="204" rx="22" ry="14" fill="#b6bcc4"/>
          <path d="M162 200 C170 196 182 196 190 200" fill="none" stroke="#fffdf8" stroke-width="2"/>
          <path d="M196 180 l8 -8 M204 186 l10 -4 M198 172 l2 -10" stroke="${a1}" stroke-width="3" stroke-linecap="round"/></g>
          <circle cx="160" cy="220" r="8" fill="${skin}" ${S}/>${hands(skin, true, false)}`,
      };
    case 4: // Laptop
      return {
        back: '',
        front: `<g ${S}>
          <rect x="84" y="196" width="72" height="44" rx="5" fill="#f3ede2"/>
          <path d="M76 240 H164 L158 250 H82 Z" fill="#c9bfb2"/>
          <rect x="91" y="203" width="58" height="30" rx="2" fill="#2a211b"/>
          <path d="M98 212 l6 4 -6 4 M108 222 h12" fill="none" stroke="#9fd4a8" stroke-width="2.4" stroke-linecap="round"/>
          <circle cx="78" cy="236" r="8" fill="${skin}"/><circle cx="162" cy="236" r="8" fill="${skin}"/></g>`,
      };
    case 5: // Frailejón del páramo: tronco cubierto de hojas secas y roseta plateada
      return {
        back: `<g ${S}>
          <path d="M190 292 C186 252 186 214 192 186 L210 186 C214 214 214 252 210 292 Z" fill="#8b6a46"/>
          <path d="M192 200 h18 M191 216 h20 M190 232 h22 M190 248 h22 M190 264 h22" stroke="#6b4f33" stroke-width="2"/>
          ${[-70, -45, -20, 0, 20, 45, 70].map((r) => `<path d="M201 186 C196 168 196 152 201 140 C206 152 206 168 201 186 Z" fill="#b9c9b0" transform="rotate(${r} 201 186)"/>`).join('')}
          <circle cx="201" cy="180" r="6" fill="${a2 === '#fffdf8' ? '#f3c94f' : '#f3c94f'}"/></g>`,
        front: hands(skin),
      };
    case 6: // Almojábana recién horneada
      return {
        back: '',
        front: `<g ${S}>
          <ellipse cx="178" cy="214" rx="26" ry="20" fill="#e3b36a"/>
          <ellipse cx="174" cy="208" rx="16" ry="10" fill="#f0cf8d" stroke="none"/>
          <path d="M160 222 C170 228 186 228 196 222" fill="none" stroke="#b9853f" stroke-width="2"/>
          <path d="M170 186 c-2 -6 2 -8 0 -14 M182 186 c-2 -6 2 -8 0 -14" fill="none" stroke="#c9bfb2" stroke-width="2" stroke-linecap="round"/></g>
          ${hands(skin, true, false)}<circle cx="156" cy="226" r="8" fill="${skin}" ${S}/>`,
      };
    default:
      return { back: '', front: hands(skin) };
  }
}

/** SVG del tejedor (viewBox 240×344). `title` da nombre accesible. */
export function tejedorSVG(opts: TejedorOptions, title = 'Tejedor'): string {
  const o = normalizeTejedor(opts);
  const colors = RUANAS[o.ruana].c;
  const [base, a1, , borde] = colors;
  const skin = PIELES[o.piel];
  const id = `cq${++seq}`;
  const patron = `${id}-p`;
  const band = `${id}-b`;
  const acc = accessory(o.accesorio, skin, colors);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -24 240 344" role="img" aria-label="${escapeXml(title)}">
  <title>${escapeXml(title)}</title>
  <defs>
    ${patronDef(patron, o.patron, colors)}
 <radialGradient id="${id}-sk" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".7" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></radialGradient>
    <linearGradient id="${id}-sh" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset=".65" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".2"/></linearGradient>
    <pattern id="${band}" width="12" height="12" patternUnits="userSpaceOnUse"><rect width="12" height="12" fill="${borde}"/><path d="M0 6 L6 0 L12 6 L6 12 Z" fill="${a1}"/></pattern>
  </defs>
  <ellipse cx="120" cy="300" rx="78" ry="9" fill="#000" opacity=".13"/>
  ${acc.back}
  ${sombreroBack(o.sombrero, colors)}
  ${rasgos(o.genero ?? 2, a1).atras}
  <!-- Piernas y ojotas -->
  <g ${S}>
    <rect x="94" y="236" width="20" height="50" rx="6" fill="#3c3c3c"/>
    <rect x="126" y="236" width="20" height="50" rx="6" fill="#3c3c3c"/>
    <rect x="94" y="270" width="20" height="12" fill="${skin}"/><rect x="126" y="270" width="20" height="12" fill="${skin}"/>
    <path d="M86 286 h30 a7 7 0 0 1 0 14 h-30 a7 7 0 0 1 0 -14 z M124 286 h30 a7 7 0 0 1 0 14 h-30 a7 7 0 0 1 0 -14 z" fill="#fffdf8"/>
    <path d="M90 288 Q102 280 114 288 M128 288 Q140 280 152 288" fill="none" stroke="${a1}" stroke-width="4" stroke-linecap="round"/>
    <path d="M88 297 h28 M126 297 h28" stroke="#c9bfb2" stroke-width="2"/>
  </g>
  <!-- Ruana con patron y borde tejido -->
  <g ${S}>
    <path d="M80 146 C100 136 140 136 160 146 L186 236 C150 248 90 248 54 236 Z" fill="${base}"/>
    <path d="M96 152 C110 146 130 146 144 152 L156 232 C132 238 108 238 84 232 Z" fill="url(#${patron})"/>
    <path d="M54 236 C90 248 150 248 186 236 L184 244 C150 256 90 256 56 244 Z" fill="url(#${band})"/>
    <path d="M60 248 v8 M72 250 v8 M84 252 v8 M96 253 v8 M108 254 v8 M120 254 v8 M132 254 v8 M144 253 v8 M156 252 v8 M168 250 v8 M180 248 v8" stroke="${borde}" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M106 142 Q120 154 134 142" fill="none"/>
  </g>
  <path d="M80 146 C100 136 140 136 160 146 L186 236 C150 248 90 248 54 236 Z" fill="url(#${id}-sh)"/>
  <!-- Cabeza -->
  <rect x="110" y="132" width="20" height="14" fill="${skin}" ${S}/>
  <circle cx="69" cy="102" r="9" fill="${skin}" ${S}/><circle cx="171" cy="102" r="9" fill="${skin}" ${S}/>
  <circle cx="120" cy="96" r="52" fill="${skin}" ${S}/>
  <circle cx="120" cy="96" r="51" fill="url(#${id}-sk)"/>
  ${sombreroFront(o.sombrero, colors, patron)}
  ${face(o.expresion)}
  ${rasgos(o.genero ?? 2, a1).frente}
  ${acc.front}
</svg>`;
}

export function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeXml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[c]!);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

export interface TejedorCard {
  name: string;
  hilo: number;
  opts: TejedorOptions;
}

/** Franja de ruana (listas + rombos) para el PNG. */
function textileBand(ctx: CanvasRenderingContext2D, x0: number, y0: number, w: number, [base, a1, a2, borde]: readonly string[]) {
  ctx.fillStyle = base;
  ctx.fillRect(x0, y0, w, 64);
  for (let x = x0; x < x0 + w; x += 64) {
    ctx.fillStyle = a1;
    ctx.beginPath();
    ctx.moveTo(x + 32, y0 + 6);
    ctx.lineTo(x + 58, y0 + 32);
    ctx.lineTo(x + 32, y0 + 58);
    ctx.lineTo(x + 6, y0 + 32);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = a2;
    // listas finas de la ruana
    ctx.fillRect(x + 30, y0, 4, 64);
  }
  ctx.fillStyle = borde;
  ctx.fillRect(x0, y0 + 64, w, 10);
}

/** PNG 1080×1350 para compartir: el tejedor, su nombre, su hilo y la leyenda. */
export async function tejedorPNG(card: TejedorCard): Promise<Blob> {
  await document.fonts?.ready;
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const o = normalizeTejedor(card.opts);
  const colors = RUANAS[o.ruana].c;
  const sans = "'Manrope', system-ui, sans-serif";
  const mono = "'JetBrains Mono', ui-monospace, monospace";

  // Noche ciruela de BoyaConf con un brillo detrás del tejedor
  ctx.fillStyle = '#1a0e1c';
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W / 2, 560, 40, W / 2, 560, 520);
  glow.addColorStop(0, 'rgba(34, 198, 141, 0.32)');
  glow.addColorStop(1, 'rgba(34, 198, 141, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  // Hilos de luz (verde, mostaza, rojo, añil) en una franja SIN texto: entre la leyenda y el pie
  ['#22c68d', '#f3c94f', '#f43f5e', '#8fa9ec'].forEach((c, i) => {
    ctx.beginPath();
    ctx.moveTo(-20, 1196 + i * 7);
    ctx.bezierCurveTo(300, 1180 + i * 9, 700, 1222 - i * 6, W + 20, 1192 + i * 8);
    ctx.strokeStyle = c;
    ctx.lineWidth = 4;
    ctx.globalAlpha = 0.85 - i * 0.12;
    ctx.shadowColor = c;
    ctx.shadowBlur = 18;
    ctx.stroke();
  });
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
  // Franja de la ruana arriba, con los colores que eligió la persona
  textileBand(ctx, 0, 0, W, colors);

  ctx.fillStyle = '#22c68d';
  ctx.font = `600 28px ${mono}`;
  ctx.fillText('MI TEJEDOR · ' + EVENT.toUpperCase(), 80, 150);

  const img = await loadImage(svgDataUrl(tejedorSVG(o, card.name)));
  ctx.drawImage(img, W / 2 - 220, 190, 440, 631); // viewBox 240×344

  ctx.fillStyle = '#f8eff7';
  ctx.textAlign = 'center';
  ctx.font = `800 80px ${sans}`;
  ctx.fillText(card.name || 'Mi tejedor', W / 2, 910, W - 160);
  const hilo = HILOS[clampIdx(card.hilo, HILOS.length)];
  ctx.font = `700 38px ${sans}`;
  const text = `Mi hilo: “${hilo}”`;
  const pw = Math.min(ctx.measureText(text).width + 64, W - 120);
  ctx.beginPath();
  ctx.roundRect(W / 2 - pw / 2, 945, pw, 76, 38);
  ctx.fillStyle = '#22c68d';
  ctx.fill();
  ctx.fillStyle = '#10070f';
  ctx.fillText(text, W / 2, 996, W - 160);
  ctx.font = `500 25px ${sans}`;
  ctx.fillStyle = '#dccbd9';
  wrap(ctx, LEYENDA, W - 200).forEach((l, i) => ctx.fillText(l, W / 2, 1066 + i * 33));
  ctx.textAlign = 'left';
  ctx.font = `700 26px ${sans}`;
  ctx.fillStyle = '#f8eff7';
  ctx.fillText(TALK_TITLE, 80, H - 86, W - 420);
  ctx.font = `500 22px ${mono}`;
  ctx.fillStyle = '#dccbd9';
  ctx.fillText(`${SPEAKER} · ${SPEAKER_HANDLE}`, 80, H - 52);
  // Logo oficial del evento (isotipo + ‹BoyaConf›)
  try {
    const logo = await loadImage('/brand/boyaconf-isotipo.svg');
    ctx.drawImage(logo, W - 330, H - 120, 54, 54);
  } catch {
    /* sin logo si no carga */
  }
  ctx.font = `700 32px ${sans}`;
  const x0 = W - 266;
  ctx.fillStyle = '#22c68d';
  ctx.fillText('‹', x0, H - 80);
  ctx.fillStyle = '#f8eff7';
  ctx.fillText('BoyaConf', x0 + 16, H - 80);
  ctx.fillStyle = '#f43f5e';
  ctx.fillText('›', x0 + 16 + ctx.measureText('BoyaConf').width, H - 80);

  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/png'));
}

/** Data URL PNG pequeña para incrustar en la memoria PDF. */
export async function tejedorPNGDataUrl(opts: TejedorOptions, size = 360): Promise<string> {
  const img = await loadImage(svgDataUrl(tejedorSVG(opts)));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round((size * 240) / 344);
  canvas.height = size;
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

/** Silueta para quien no publicó su tejedor (podio). */
export function tejedorSilhouette(title = 'Sin tejedor'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -24 240 344" role="img" aria-label="${escapeXml(title)}"><title>${escapeXml(title)}</title>
  <g fill="#c4c7c5" stroke="#8a8d8b" stroke-width="3" stroke-linejoin="round">
    <path d="M80 146 C100 136 140 136 160 146 L186 236 C150 248 90 248 54 236 Z"/>
    <rect x="94" y="236" width="20" height="50" rx="6"/><rect x="126" y="236" width="20" height="50" rx="6"/>
    <circle cx="120" cy="96" r="52"/>
  </g>
  <text x="120" y="116" text-anchor="middle" font-family="system-ui, sans-serif" font-size="56" font-weight="700" fill="#8a8d8b">?</text></svg>`;
}

/** Sticker 1080×1080 con fondo transparente y borde blanco: listo para historias y WhatsApp. */
export async function tejedorSticker(card: TejedorCard): Promise<Blob> {
  await document.fonts?.ready;
  const S = 1080;
  const svg = tejedorSVG(normalizeTejedor(card.opts), `Tejedor ${card.name}`);
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  const img = await new Promise<HTMLImageElement>((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = url; });
  URL.revokeObjectURL(url);
  const h = 760, w = Math.round((h * 240) / 344), x = (S - w) / 2, y = 40;
  // Silueta blanca: el borde recortado típico de un sticker
  const sil = document.createElement('canvas');
  sil.width = S; sil.height = S;
  const sc = sil.getContext('2d')!;
  sc.drawImage(img, x, y, w, h);
  sc.globalCompositeOperation = 'source-in';
  sc.fillStyle = '#fff';
  sc.fillRect(0, 0, S, S);
  const canvas = document.createElement('canvas');
  canvas.width = S; canvas.height = S;
  const ctx = canvas.getContext('2d')!;
  const borde = document.createElement('canvas');
  borde.width = S; borde.height = S;
  const bc = borde.getContext('2d')!;
  for (let a = 0; a < Math.PI * 2; a += Math.PI / 18) bc.drawImage(sil, Math.cos(a) * 18, Math.sin(a) * 18);
  ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowBlur = 22; ctx.shadowOffsetY = 8;
  ctx.drawImage(borde, 0, 0);
  ctx.shadowColor = 'transparent';
  ctx.drawImage(img, x, y, w, h);
  // Cinta con el evento y el nombre
  const sans = "'Manrope', system-ui, sans-serif";
  const cinta = (texto: string, cy: number, tam: number, fondo: string, color: string, rot: number) => {
    ctx.save();
    ctx.translate(S / 2, cy);
    ctx.rotate(rot);
    ctx.font = `800 ${tam}px ${sans}`;
    const tw = ctx.measureText(texto).width + tam * 1.4;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.roundRect(-tw / 2 - 10, -tam - 10, tw + 20, tam * 2 + 20, tam); ctx.fill();
    ctx.fillStyle = fondo;
    ctx.beginPath(); ctx.roundRect(-tw / 2, -tam, tw, tam * 2, tam); ctx.fill();
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(texto, 0, 2);
    ctx.restore();
  };
  cinta(card.name, 850, 46, '#1a0e1c', '#ffe08a', -0.04);
  cinta('BoyaConf 2026 · UI generativa', 970, 34, '#22c68d', '#1a0e1c', 0.03);
  return new Promise((ok, no) => canvas.toBlob((b) => (b ? ok(b) : no(new Error('toBlob'))), 'image/png'));
}
