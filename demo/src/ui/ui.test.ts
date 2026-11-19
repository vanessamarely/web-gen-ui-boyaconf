import { describe, expect, it } from 'vitest';
import { normalizar } from './esquema';
import { parsearParcial } from './parcial';

describe('respuesta que llega por partes', () => {
  it('lee un texto que aún no termina', () => expect(parsearParcial('{"titulo": "Merca')).toEqual({ titulo: 'Merca' }));
  it('ignora una clave incompleta', () => expect(parsearParcial('{"a": 1, "tit')).toEqual({ a: 1 }));
  it('cierra listas abiertas', () => expect(parsearParcial('{"b": [{"id": "papa"}, {"id"')).toEqual({ b: [{ id: 'papa' }, {}] }));
});
describe('validación de lo que genera la IA', () => {
  it('descarta componentes y productos que no existen', () => {
    const ui = normalizar({ titulo: 'x', bloques: [{ tipo: 'hack', titulo: '', productos: [] }, { tipo: 'lista', titulo: 'L', productos: [{ id: 'papa-pastusa', cantidad: 2 }, { id: 'no-existe', cantidad: 1 }], pasos: [], texto: '' }] });
    expect(ui.bloques).toHaveLength(1);
    expect(ui.bloques[0].productos.map((p) => p.id)).toEqual(['papa-pastusa']);
  });
});
