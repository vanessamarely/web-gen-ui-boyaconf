// Catálogo de la plaza de mercado (productos y precios FICTICIOS, en pesos colombianos).
// El modelo solo puede elegir ids de aquí: la UI generativa nunca inventa productos.
export type Puesto = 'frutas' | 'tuberculos' | 'verduras' | 'granos' | 'lacteos';

export interface Producto {
  id: string;
  nombre: string;
  puesto: Puesto;
  /** precio por unidad de venta */
  precio: number;
  unidad: 'kg' | 'lb' | 'und' | 'atado' | 'docena';
  emoji: string;
}

export const PUESTOS: { id: Puesto; nombre: string; vendedor: string; emoji: string }[] = [
  { id: 'tuberculos', nombre: 'Tubérculos', vendedor: 'Don Aurelio · Ventaquemada', emoji: '🥔' },
  { id: 'verduras', nombre: 'Verduras', vendedor: 'Doña Rosa · Aquitania', emoji: '🧅' },
  { id: 'granos', nombre: 'Granos', vendedor: 'Granero La Esperanza', emoji: '🌾' },
  { id: 'frutas', nombre: 'Frutas', vendedor: 'Doña Inés · Moniquirá', emoji: '🍊' },
  { id: 'lacteos', nombre: 'Lácteos y amasijos', vendedor: 'Lácteos El Páramo', emoji: '🧀' },
];

export const CATALOGO: Producto[] = [
  // Tubérculos
  { id: 'papa-pastusa', nombre: 'Papa pastusa', puesto: 'tuberculos', precio: 2600, unidad: 'kg', emoji: '🥔' },
  { id: 'papa-criolla', nombre: 'Papa criolla', puesto: 'tuberculos', precio: 3800, unidad: 'kg', emoji: '🥔' },
  { id: 'cubio', nombre: 'Cubios', puesto: 'tuberculos', precio: 4200, unidad: 'lb', emoji: '🟡' },
  { id: 'hibia', nombre: 'Hibias', puesto: 'tuberculos', precio: 4500, unidad: 'lb', emoji: '🟣' },
  { id: 'arracacha', nombre: 'Arracacha', puesto: 'tuberculos', precio: 3400, unidad: 'kg', emoji: '🥕' },
  { id: 'ruba', nombre: 'Rubas', puesto: 'tuberculos', precio: 4000, unidad: 'lb', emoji: '🔴' },
  // Verduras
  { id: 'cebolla-larga', nombre: 'Cebolla larga de Aquitania', puesto: 'verduras', precio: 3000, unidad: 'atado', emoji: '🧅' },
  { id: 'habas', nombre: 'Habas', puesto: 'verduras', precio: 5200, unidad: 'kg', emoji: '🫛' },
  { id: 'arveja', nombre: 'Arveja verde', puesto: 'verduras', precio: 6800, unidad: 'kg', emoji: '🫛' },
  { id: 'zanahoria', nombre: 'Zanahoria', puesto: 'verduras', precio: 2200, unidad: 'kg', emoji: '🥕' },
  { id: 'cilantro', nombre: 'Cilantro', puesto: 'verduras', precio: 1000, unidad: 'atado', emoji: '🌿' },
  { id: 'ajo', nombre: 'Ajo', puesto: 'verduras', precio: 1500, unidad: 'und', emoji: '🧄' },
  { id: 'repollo', nombre: 'Repollo', puesto: 'verduras', precio: 2500, unidad: 'und', emoji: '🥬' },
  { id: 'mazorca', nombre: 'Mazorca', puesto: 'verduras', precio: 1200, unidad: 'und', emoji: '🌽' },
  // Granos
  { id: 'trigo', nombre: 'Trigo para cuchuco', puesto: 'granos', precio: 4800, unidad: 'lb', emoji: '🌾' },
  { id: 'cebada', nombre: 'Cebada perlada', puesto: 'granos', precio: 4200, unidad: 'lb', emoji: '🌾' },
  { id: 'maiz-pelado', nombre: 'Maíz pelado (para mute)', puesto: 'granos', precio: 3900, unidad: 'lb', emoji: '🌽' },
  { id: 'frijol', nombre: 'Fríjol bola roja', puesto: 'granos', precio: 6500, unidad: 'lb', emoji: '🫘' },
  { id: 'lenteja', nombre: 'Lenteja', puesto: 'granos', precio: 3600, unidad: 'lb', emoji: '🟤' },
  { id: 'arroz', nombre: 'Arroz', puesto: 'granos', precio: 2900, unidad: 'lb', emoji: '🍚' },
  // Frutas
  { id: 'uchuva', nombre: 'Uchuvas', puesto: 'frutas', precio: 7000, unidad: 'lb', emoji: '🟠' },
  { id: 'curuba', nombre: 'Curuba', puesto: 'frutas', precio: 4000, unidad: 'kg', emoji: '🍈' },
  { id: 'feijoa', nombre: 'Feijoa', puesto: 'frutas', precio: 5500, unidad: 'kg', emoji: '🥝' },
  { id: 'mora', nombre: 'Mora de Castilla', puesto: 'frutas', precio: 6000, unidad: 'lb', emoji: '🫐' },
  { id: 'lulo', nombre: 'Lulo', puesto: 'frutas', precio: 5000, unidad: 'kg', emoji: '🍊' },
  { id: 'durazno', nombre: 'Durazno de Nuevo Colón', puesto: 'frutas', precio: 6500, unidad: 'kg', emoji: '🍑' },
  // Lácteos y amasijos
  { id: 'queso-campesino', nombre: 'Queso campesino', puesto: 'lacteos', precio: 9000, unidad: 'lb', emoji: '🧀' },
  { id: 'cuajada', nombre: 'Cuajada', puesto: 'lacteos', precio: 7000, unidad: 'und', emoji: '🧀' },
  { id: 'huevos', nombre: 'Huevos campesinos', puesto: 'lacteos', precio: 9600, unidad: 'docena', emoji: '🥚' },
  { id: 'leche', nombre: 'Leche', puesto: 'lacteos', precio: 3200, unidad: 'und', emoji: '🥛' },
  { id: 'almojabanas', nombre: 'Almojábanas', puesto: 'lacteos', precio: 1500, unidad: 'und', emoji: '🥯' },
  { id: 'mantequilla', nombre: 'Mantequilla', puesto: 'lacteos', precio: 6800, unidad: 'und', emoji: '🧈' },
];

export const BY_ID = new Map(CATALOGO.map((p) => [p.id, p]));

export const fmtCOP = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;
export const fmtCant = (n: number, u: Producto['unidad']) => `${Number.isInteger(n) ? n : n.toFixed(1).replace('.', ',')} ${u === 'und' ? (n === 1 ? 'und.' : 'und.') : u}`;

/** Búsqueda sin tildes por nombre o id. */
export function buscar(texto: string): Producto[] {
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const q = norm(texto).trim();
  if (!q) return [];
  return CATALOGO.filter((p) => norm(p.nombre).includes(q) || p.id.includes(q) || q.split(/\s+/).some((w) => w.length > 3 && norm(p.nombre).includes(w)));
}
