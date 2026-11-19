// Versión sin preparar: el patrón que Chrome marca como "no recomendado" para respuestas por partes.
// En cada pedazo vuelve a leer toda la respuesta y reemplaza toda la interfaz con innerHTML.
import { BY_ID, fmtCOP } from '../catalog';
import { normalizar, puestosDe, type Bloque } from './esquema';
import { parsearParcial } from './parcial';
import { conteo } from './conteo';

function bloque(b: Bloque) {
  if (b.tipo === 'comparador') return `<section class="bloque"><h2>${b.titulo}</h2>${b.productos.map((l) => `<div class="comp"><h3>${BY_ID.get(l.id)!.nombre}</h3>${puestosDe(l.id).map((p) => `<p class="comp-f"><span>${p.nombre}</span><b>${fmtCOP(p.precio)}</b></p>`).join('')}</div>`).join('')}</section>`;
  const filas = b.productos.map((l) => { const p = BY_ID.get(l.id)!; return `<div class="fila"><span>${p.emoji} ${p.nombre}</span><input type="number" min="0.5" step="0.5" value="${l.cantidad}" data-cantidad="${l.id}" /><small>${p.unidad}</small><b>${fmtCOP(p.precio * l.cantidad)}</b></div>`; }).join('');
  return `<section class="bloque"><h2>${b.titulo}</h2>${filas}${b.pasos.length ? `<ol class="pasos">${b.pasos.map((x) => `<li>${x}</li>`).join('')}</ol>` : ''}</section>`;
}

export class VistaDirecta {
  private texto = '';
  constructor(private raiz: HTMLElement) { raiz.setAttribute('aria-live', 'polite'); raiz.removeAttribute('aria-busy'); }
  empezar() { this.texto = ''; this.raiz.innerHTML = ''; }
  recibir(trozo: string) {
    this.texto += trozo;
    conteo.pintadas++;
    const ui = normalizar(parsearParcial(this.texto));
    const consejo = ui.bloques.find((b) => b.texto)?.texto;
    this.raiz.innerHTML = `<h2 class="ui-titulo">${ui.titulo}</h2>${consejo ? `<aside class="b-consejo"><b>Consejo</b><p>${consejo}</p></aside>` : ''}${ui.bloques.map(bloque).join('')}`;
  }
  terminar() {}
}
