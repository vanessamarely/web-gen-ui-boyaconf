// "Modelo" simulado y determinista: decide la lista del mercado según personas, presupuesto y plato.
// Devuelve DATOS (ids del catálogo + cantidades), nunca HTML. Gemini Nano, si está disponible,
// produce la misma forma (ver engine.ts); este planificador es el plan B sin red.
import { BY_ID, PUESTOS, type Puesto } from '../catalog';

export interface Pedido {
  personas: number;
  presupuesto: number;
  plato: string;
}

export interface Linea {
  id: string;
  cantidad: number;
  razon: string;
}

export interface ListaGenerada {
  plan: { puesto: Puesto; items: number }[];
  lineas: Linea[];
  consejo: string;
}

export const PLATOS: Record<string, { nombre: string; base: [string, number, string][] }> = {
  cuchuco: {
    nombre: 'Cuchuco de trigo',
    base: [
      ['trigo', 0.5, 'la base del cuchuco'],
      ['papa-pastusa', 0.5, 'para el cuchuco y el almuerzo'],
      ['habas', 0.2, 'van en el cuchuco'],
      ['arveja', 0.15, 'van en el cuchuco'],
      ['cubio', 0.25, 'el toque boyacense del cuchuco'],
      ['cebolla-larga', 0.5, 'para el guiso'],
      ['cilantro', 0.25, 'para servir'],
      ['ajo', 0.5, 'para el guiso'],
    ],
  },
  mute: {
    nombre: 'Mute boyacense',
    base: [
      ['maiz-pelado', 0.5, 'la base del mute'],
      ['frijol', 0.25, 'va en el mute'],
      ['papa-pastusa', 0.5, 'para el mute'],
      ['arracacha', 0.25, 'le da cuerpo'],
      ['cebolla-larga', 0.5, 'para el guiso'],
      ['cilantro', 0.25, 'para servir'],
      ['repollo', 0.25, 'va en el mute'],
    ],
  },
  sopa: {
    nombre: 'Sopa de cebada',
    base: [
      ['cebada', 0.4, 'la base de la sopa'],
      ['papa-pastusa', 0.5, 'para la sopa'],
      ['zanahoria', 0.2, 'para la sopa'],
      ['arveja', 0.15, 'para la sopa'],
      ['cebolla-larga', 0.5, 'para el guiso'],
      ['cilantro', 0.25, 'para servir'],
    ],
  },
};

/** Lo de la semana además del plato (orden = prioridad si el presupuesto no alcanza). */
const SEMANA: [string, number, string][] = [
  ['huevos', 0.5, 'desayunos de la semana'],
  ['papa-criolla', 0.4, 'para acompañar'],
  ['arroz', 0.75, 'para los almuerzos'],
  ['queso-campesino', 0.25, 'desayunos con arepa'],
  ['leche', 1, 'una por persona'],
  ['uchuva', 0.25, 'fruta de temporada'],
  ['curuba', 0.25, 'para jugo'],
  ['zanahoria', 0.2, 'para ensalada'],
  ['almojabanas', 1, 'para las onces'],
  ['lenteja', 0.25, 'un almuerzo más'],
  ['mora', 0.25, 'para jugo'],
  ['feijoa', 0.25, 'fruta de temporada'],
  ['cuajada', 0.25, 'para el desayuno'],
  ['lulo', 0.25, 'para jugo'],
  ['hibia', 0.2, 'para variar la sopa'],
  ['durazno', 0.25, 'para el postre'],
  ['mantequilla', 0.25, 'para las arepas'],
  ['mazorca', 0.5, 'para asar el domingo'],
];

const UNITS_INT = new Set(['und', 'atado', 'docena']);

/** Cantidad redondeada a algo que se pide en la plaza (½ kg, 1 atado…). */
export function redondear(id: string, cant: number): number {
  const u = BY_ID.get(id)!.unidad;
  if (UNITS_INT.has(u)) return Math.max(1, Math.round(cant));
  return Math.max(0.5, Math.round(cant * 2) / 2);
}

export const costo = (lineas: Linea[]) => lineas.reduce((a, l) => a + BY_ID.get(l.id)!.precio * l.cantidad, 0);

export function detectarPlato(texto: string): string {
  const t = texto.toLowerCase();
  if (/mute/.test(t)) return 'mute';
  if (/cebada|sopa/.test(t)) return 'sopa';
  return 'cuchuco';
}

/** Arma la lista: primero el plato, luego lo de la semana mientras alcance el presupuesto. */
export function generarLista({ personas, presupuesto, plato }: Pedido): ListaGenerada {
  const p = Math.max(1, Math.min(12, Math.round(personas)));
  const receta = PLATOS[plato] ?? PLATOS.cuchuco;
  const lineas: Linea[] = [];
  const add = (id: string, porPersona: number, razon: string) => {
    if (lineas.some((l) => l.id === id)) return true;
    const linea = { id, cantidad: redondear(id, porPersona * p), razon };
    if (costo([...lineas, linea]) > presupuesto) return false;
    lineas.push(linea);
    return true;
  };
  for (const [id, c, r] of receta.base) add(id, c, `${r} (${receta.nombre.toLowerCase()})`);
  for (const [id, c, r] of SEMANA) add(id, c, r);
  const orden = PUESTOS.map((x) => x.id);
  lineas.sort((a, b) => orden.indexOf(BY_ID.get(a.id)!.puesto) - orden.indexOf(BY_ID.get(b.id)!.puesto));
  const plan = orden.map((puesto) => ({ puesto, items: lineas.filter((l) => BY_ID.get(l.id)!.puesto === puesto).length })).filter((x) => x.items > 0);
  const sobra = presupuesto - costo(lineas);
  const consejo =
    sobra > 15000
      ? `Te sobran ${Math.round(sobra / 1000)} mil: vale la pena llevar carne para el ${receta.nombre.toLowerCase()} en la galería.`
      : `Compra temprano: a las 6 a. m. la cebolla de Aquitania llega más fresca.`;
  return { plan, lineas, consejo };
}
