import { describe, expect, it } from 'vitest';
import { normalizar } from './esquema';
import { parsearParcial } from './parcial';
import { interpretar, mencionado } from './agente';

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

describe('agente sin Nano', () => {
  it.each([
    ['Agrega 2 kg de papa criolla', 'agregar_producto', 'papa-criolla', 2],
    ['Cambia la arracacha a 3 kg', 'cambiar_cantidad', 'arracacha', 3],
    ['Quita las habas', 'quitar_producto', 'habas', 1],
  ])('%s', (t, tool, id, cantidad) => expect(interpretar(t)).toEqual({ tool, args: { id, cantidad } }));
});

describe('el agente no cambia un producto por otro', () => {
  it('mango no es durazno', () => expect(mencionado('Agrega 1 kg de mango', 'durazno')).toBe(false));
  it('reconoce papa criolla', () => expect(mencionado('Quita la papa criolla', 'papa-criolla')).toBe(true));
  it('reconoce habas', () => expect(mencionado('quita las habas', 'habas')).toBe(true));
});
