// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from 'vitest';
import { BY_ID } from './catalog';
import { costo, generarLista } from './genui/planner';
import { cambiosPara } from './genui/stream';
import { mercado } from './store';
import { entender } from './agente/agente';

const reset = () => {
  mercado.vaciar();
  mercado.historial.length = 0;
  mercado.busy.clear();
  mercado.flushNow();
};
const cargar = (presupuesto = 120000) => {
  for (const c of cambiosPara(generarLista({ personas: 4, presupuesto, plato: 'cuchuco' }), 'fluido', false)) mercado.aplicar(c, { respetarPersona: true });
  mercado.flushNow();
};

describe('planificador (el "modelo" simulado)', () => {
  it('no se pasa del presupuesto y solo usa productos del catálogo', () => {
    for (const presupuesto of [40000, 120000, 300000]) {
      const l = generarLista({ personas: 4, presupuesto, plato: 'cuchuco' });
      expect(costo(l.lineas)).toBeLessThanOrEqual(presupuesto);
      for (const x of l.lineas) expect(BY_ID.has(x.id)).toBe(true);
      expect(l.plan.reduce((a, p) => a + p.items, 0)).toBe(l.lineas.length);
    }
  });
  it('incluye los ingredientes del plato', () => {
    expect(generarLista({ personas: 4, presupuesto: 120000, plato: 'cuchuco' }).lineas.map((l) => l.id)).toContain('trigo');
    expect(generarLista({ personas: 4, presupuesto: 120000, plato: 'mute' }).lineas.map((l) => l.id)).toContain('maiz-pelado');
  });
  it('más presupuesto = más productos', () => {
    expect(generarLista({ personas: 4, presupuesto: 160000, plato: 'cuchuco' }).lineas.length).toBeGreaterThan(generarLista({ personas: 4, presupuesto: 80000, plato: 'cuchuco' }).lineas.length);
  });
});

describe('streaming: primero el plan, luego cambios por id', () => {
  it('el primer cambio es el plan', () => {
    const c = cambiosPara(generarLista({ personas: 4, presupuesto: 120000, plato: 'cuchuco' }), 'fluido', false);
    expect(c[0].op).toBe('plan');
  });
  it('refinar envía solo lo que cambió (no la lista entera)', () => {
    reset();
    cargar(120000);
    const nueva = generarLista({ personas: 4, presupuesto: 160000, plato: 'cuchuco' });
    const cambios = cambiosPara(nueva, 'fluido', true).filter((c) => c.op === 'add' || c.op === 'replace' || c.op === 'remove');
    expect(cambios.length).toBeLessThan(nueva.lineas.length);
  });
});

describe('un solo estado: lo de la persona gana', () => {
  beforeEach(() => {
    reset();
    cargar(160000);
  });
  it('una regeneración no borra lo comprado ni lo que tiene nota', () => {
    mercado.marcar('uchuva', true);
    mercado.setNota('feijoa', 'bien maduras');
    for (const c of cambiosPara(generarLista({ personas: 4, presupuesto: 60000, plato: 'cuchuco' }), 'fluido', true)) mercado.aplicar(c, { respetarPersona: true });
    expect(mercado.items.get('uchuva')?.comprado).toBe(true);
    expect(mercado.items.get('feijoa')?.nota).toBe('bien maduras');
  });
  it('el agente no cambia una cantidad que la persona fijó (y deja su propuesta visible)', () => {
    mercado.setCantidad('papa-pastusa', 3, 'persona');
    expect(mercado.setCantidad('papa-pastusa', 1, 'agente').ok).toBe(false);
    mercado.aplicar({ op: 'replace', id: 'papa-pastusa', cantidad: 2 }, { respetarPersona: true });
    expect(mercado.items.get('papa-pastusa')?.cantidad).toBe(3);
    expect(mercado.items.get('papa-pastusa')?.propuesta).toBe(2);
  });
  it('el modo ingenuo sí lo pierde (por eso existe la charla)', () => {
    mercado.marcar('uchuva', true);
    mercado.vaciar();
    for (const c of cambiosPara(generarLista({ personas: 4, presupuesto: 160000, plato: 'cuchuco' }), 'ingenuo', true)) mercado.aplicar(c, { respetarPersona: false });
    expect(mercado.items.get('uchuva')?.comprado).toBe(false);
  });
  it('deshacer devuelve la lista a como estaba antes del cambio del agente', () => {
    const antes = mercado.items.size;
    const id = mercado.registrar('quitar producto', 'agente');
    mercado.quitar('uchuva');
    expect(mercado.items.size).toBe(antes - 1);
    mercado.deshacer(id);
    expect(mercado.items.size).toBe(antes);
  });
  it('la versión sube con cada cambio', () => {
    const v = mercado.version;
    mercado.marcar('uchuva', true);
    expect(mercado.version).toBeGreaterThan(v);
  });
});

describe('el agente entiende la petición', () => {
  it('personas, presupuesto y plato', () => {
    expect(entender('Mercado para 6 personas con 150 mil, para un mute')).toEqual({ personas: 6, presupuesto: 150000, plato: 'mute' });
    expect(entender('súbele el presupuesto a 160 mil').presupuesto).toBe(160000);
  });
});
