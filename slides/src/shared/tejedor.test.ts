// @vitest-environment happy-dom
import { describe, expect, it } from 'vitest';
import { ACCESORIOS, EXPRESIONES, PATRONES, PIELES, RUANAS, SOMBREROS, tejedorSVG, normalizeTejedor } from './tejedor';

describe('tejedor', () => {
  it('dibuja todas las combinaciones de sombrero y accesorio como SVG válido', () => {
    for (let t = 0; t < SOMBREROS.length; t++)
      for (let a = 0; a < ACCESORIOS.length; a++) {
        const svg = tejedorSVG({ ruana: t % RUANAS.length, patron: a % PATRONES.length, sombrero: t, piel: a % PIELES.length, accesorio: a, expresion: t % EXPRESIONES.length });
        const doc = new DOMParser().parseFromString(svg, 'image/svg+xml');
        expect(doc.querySelector('parsererror')).toBeNull();
        expect(svg).toContain('<title>');
      }
  });

  it('normaliza opciones fuera de rango (datos del muro)', () => {
    expect(normalizeTejedor({ ruana: 99, sombrero: -1, accesorio: 2.5 } as never)).toEqual({ ruana: 0, patron: 0, sombrero: 0, piel: 2, accesorio: 0, expresion: 0, genero: 2 });
  });

  it('escapa el título', () => {
    expect(tejedorSVG(normalizeTejedor({}), '<script>')).not.toContain('<script>');
  });
});

describe('silueta del podio', () => {
  it('es un SVG válido y escapa el título', async () => {
    const { tejedorSilhouette } = await import('./tejedor');
    const svg = tejedorSilhouette('<b>Ana</b> no publicó');
    expect(new DOMParser().parseFromString(svg, 'image/svg+xml').querySelector('parsererror')).toBeNull();
    expect(svg).not.toContain('<b>Ana</b>');
  });
});
