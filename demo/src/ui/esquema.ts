// El contrato entre la IA y la web: la IA elige componentes y productos; el código pone precios y reglas.
import { BY_ID, CATALOGO } from '../catalog';

export const TIPOS = ['lista', 'comparador', 'receta'] as const;
export type Tipo = (typeof TIPOS)[number];
export interface LineaUI { id: string; cantidad: number }
export interface Bloque { tipo: Tipo; titulo: string; productos: LineaUI[]; pasos: string[]; texto: string }
export interface Interfaz { titulo: string; bloques: Bloque[] }

export const ESQUEMA = {
  type: 'object',
  properties: {
    titulo: { type: 'string' },
    bloques: {
      type: 'array',
      minItems: 1,
      maxItems: 3,
      items: {
        type: 'object',
        properties: {
          tipo: { type: 'string', enum: TIPOS },
          titulo: { type: 'string' },
          productos: { type: 'array', maxItems: 8, items: { type: 'object', properties: { id: { type: 'string', enum: CATALOGO.map((p) => p.id) }, cantidad: { type: 'number' } }, required: ['id', 'cantidad'] } },
          pasos: { type: 'array', maxItems: 4, items: { type: 'string' } },
          texto: { type: 'string' },
        },
        required: ['tipo', 'titulo', 'productos', 'pasos', 'texto'],
      },
    },
  },
  required: ['titulo', 'bloques'],
};

export const instrucciones = (pedido: string) => `Eres el asistente de una plaza de mercado en Tunja, Colombia. Decide qué interfaz mostrar para el pedido.
Componentes disponibles:
- lista: productos para comprar, con cantidades.
- comparador: compara el precio de uno o dos productos.
- receta: un plato con sus ingredientes y hasta 4 pasos cortos.
Reglas:
- Si pide armar un mercado, usa lista.
- Si pregunta dónde está más barato o cuánto vale algo, usa comparador.
- Si pregunta qué cocinar, usa receta.
- En "texto" escribe un consejo de una frase.
- Usa solo estos productos: ${CATALOGO.map((p) => `${p.id} (${p.nombre})`).join(', ')}.
- Escribe en español de Colombia. No escribas precios: los pone la web.
Pedido: "${pedido}"`;

/** Lo que llegue del modelo se valida en código antes de mostrarlo. */
export function normalizar(dato: unknown): Interfaz {
  const d = (dato ?? {}) as Partial<Interfaz>;
  const texto = (v: unknown) => (typeof v === 'string' ? v : '');
  const bloques = (Array.isArray(d.bloques) ? d.bloques : []).flatMap((b): Bloque[] => {
    if (!b || !TIPOS.includes(b.tipo)) return [];
    const vistos = new Set<string>();
    const productos = (Array.isArray(b.productos) ? b.productos : []).filter((l) => l && BY_ID.has(l.id) && !vistos.has(l.id) && vistos.add(l.id)).map((l) => ({ id: l.id, cantidad: Math.min(20, Math.max(0.5, Number(l.cantidad) || 1)) }));
    return [{ tipo: b.tipo, titulo: texto(b.titulo), productos, pasos: (Array.isArray(b.pasos) ? b.pasos : []).map(texto).filter(Boolean).slice(0, 4), texto: texto(b.texto) }];
  });
  return { titulo: texto(d.titulo), bloques };
}

/** Precios de ejemplo por puesto para el comparador (ficticios). */
export const puestosDe = (id: string) => {
  const base = BY_ID.get(id)!.precio;
  return [['Don Aurelio', 1], ['Doña Rosa', 0.92], ['Granero La Esperanza', 1.08]].map(([nombre, f]) => ({ nombre: nombre as string, precio: Math.round((base * (f as number)) / 50) * 50 }));
};
