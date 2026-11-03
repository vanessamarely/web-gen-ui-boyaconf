// Apodos generados (sin texto libre: nada inapropiado llega al proyector).
//  · Sabor boyacense + vocabulario de la charla, con concordancia de género ("Ruana Paramuna", "Tiple Paramuno").
//  · 48 sustantivos × 36 adjetivos ≈ 1.700 combinaciones: de sobra para 300+ asistentes.
//  · Aun así, si dos personas eligen el mismo apodo, la segunda recibe una numeración
//    ("Cóndor Veloz 2"): ver claimUniqueName. Firestore (o el modo local) garantiza la reserva.

type G = 'm' | 'f';

/** [sustantivo, género] */
export const NOUNS: readonly (readonly [string, G])[] = [
  // Boyacá
  ['Cóndor', 'm'], ['Frailejón', 'm'], ['Telar', 'm'], ['Tejo', 'm'], ['Tiple', 'm'], ['Requinto', 'm'],
  ['Cuchuco', 'm'], ['Mute', 'm'], ['Sombrero', 'm'], ['Páramo', 'm'], ['Colibrí', 'm'], ['Venado', 'm'],
  ['Puente', 'm'], ['Fogón', 'm'], ['Guarapo', 'm'], ['Copetón', 'm'], ['Cubio', 'm'], ['Torbellino', 'm'],
  ['Ruana', 'f'], ['Arepa', 'f'], ['Almojábana', 'f'], ['Mazamorra', 'f'], ['Mochila', 'f'], ['Madeja', 'f'],
  ['Garza', 'f'], ['Laguna', 'f'], ['Mecha', 'f'], ['Carranga', 'f'], ['Totuma', 'f'], ['Cebolla', 'f'],
  // La charla
  ['Token', 'm'], ['Stream', 'm'], ['Frame', 'm'], ['Parser', 'm'], ['Render', 'm'], ['Nodo', 'm'],
  ['Hilo', 'm'], ['Signal', 'm'], ['Worker', 'm'], ['Schema', 'm'], ['Slot', 'm'], ['Pixel', 'm'],
  ['Trama', 'f'], ['Urdimbre', 'f'], ['Clave', 'f'], ['API', 'f'], ['Promesa', 'f'], ['Vista', 'f'],
];

/** [masculino, femenino] (iguales si el adjetivo no cambia) */
export const ADJS: readonly (readonly [string, string])[] = [
  ['Veloz', 'Veloz'], ['Paramuno', 'Paramuna'], ['Valiente', 'Valiente'], ['Curioso', 'Curiosa'], ['Brillante', 'Brillante'],
  ['Sereno', 'Serena'], ['Épico', 'Épica'], ['Ninja', 'Ninja'], ['Cósmico', 'Cósmica'], ['Ágil', 'Ágil'],
  ['Sabio', 'Sabia'], ['Audaz', 'Audaz'], ['Feliz', 'Feliz'], ['Turbo', 'Turbo'], ['Estelar', 'Estelar'],
  ['Asíncrono', 'Asíncrona'], ['Reactivo', 'Reactiva'], ['Eléctrico', 'Eléctrica'], ['Dorado', 'Dorada'], ['Zen', 'Zen'],
  ['Pro', 'Pro'], ['Galáctico', 'Galáctica'], ['Atómico', 'Atómica'], ['Legendario', 'Legendaria'], ['Imparable', 'Imparable'],
  ['Solar', 'Solar'], ['Boyacense', 'Boyacense'], ['Fluido', 'Fluida'], ['Incremental', 'Incremental'], ['Tejedor', 'Tejedora'],
  ['Estable', 'Estable'], ['Ligero', 'Ligera'], ['Abrigado', 'Abrigada'], ['Mágico', 'Mágica'], ['Fino', 'Fina'],
  ['Arcoíris', 'Arcoíris'],
];

export const TOTAL_COMBINATIONS = NOUNS.length * ADJS.length;

const pick = <T>(a: readonly T[], r = Math.random) => a[Math.floor(r() * a.length)];

export function randomName(r: () => number = Math.random): string {
  const [noun, g] = pick(NOUNS, r);
  const [m, f] = pick(ADJS, r);
  return `${noun} ${g === 'f' ? f : m}`;
}

/** Todas las combinaciones (para tests y para el contador de "apodos disponibles"). */
export function allNames(): string[] {
  return NOUNS.flatMap(([noun, g]) => ADJS.map(([m, f]) => `${noun} ${g === 'f' ? f : m}`));
}

const BANNED = /(put[ao]|mierd|cul[oa]|pend[ae]j|verga|coñ|carajo|fuck|shit|sex|nazi|cojud|huev[oó]n|\bhp\b|malpar)/i;
/** Limpia un nombre escrito a mano (avatar): si es ofensivo o está vacío, propone uno generado. */
export const cleanName = (s: string) => (BANNED.test(s) ? randomName() : s.trim().slice(0, 18)) || randomName();

/** Clave de un apodo: sin tildes ni mayúsculas ("Cóndor Ágil 2" → "condor-agil-2"). */
export const nameKey = (n: string) =>
  n
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);

/** "Cóndor Veloz" → "Cóndor Veloz", "Cóndor Veloz 2", "Cóndor Veloz 3"… */
export const numbered = (base: string, n: number) => (n <= 1 ? base : `${base} ${n}`);

/**
 * Reserva un apodo único. Intenta el apodo base y, si alguien ya lo tiene, le agrega una
 * numeración (2, 3, …). `tryReserve` debe ser atómico (Firestore: create sin overwrite).
 * Devuelve el apodo que quedó reservado para esta persona.
 */
export async function claimUniqueName(base: string, tryReserve: (name: string) => Promise<boolean>, max = 999): Promise<string> {
  for (let n = 1; n <= max; n++) {
    const candidate = numbered(base, n);
    if (await tryReserve(candidate)) return candidate;
  }
  throw new Error('No hay apodos libres');
}
