// Versión preparada: mismos datos del modelo, pero la web los aplica por partes y con reglas.
import { BY_ID, fmtCOP } from '../catalog';
import { normalizar, puestosDe, type Bloque, type Interfaz, type LineaUI } from './esquema';
import { parsearParcial } from './parcial';
import { conteo } from './conteo';

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, clase = '', texto = '') => { const n = document.createElement(tag); if (clase) n.className = clase; if (texto) n.textContent = texto; return n; };
const poner = (n: Element, t: string) => { if (n.textContent !== t) n.textContent = t; };

const TANDA_MS = 100;

interface Fila { raiz: HTMLElement; input: HTMLInputElement; total: HTMLElement; sugerencia: HTMLButtonElement; sugerido: number }

export class VistaPreparada {
  private texto = '';
  private cuadro = 0;
  private bloques = new Map<string, HTMLElement>();
  private filas = new Map<string, Fila>();
  /** Lo que cambió la persona: la respuesta de la IA nunca lo sobrescribe. */
  private dePersona = new Map<string, number>();
  private titulo = el('h2', 'ui-titulo');
  private consejo = el('aside', 'b-consejo reservado');
  private cuerpo = el('div', 'cuerpo');

  constructor(private raiz: HTMLElement, private anunciar: (t: string) => void) {
    raiz.removeAttribute('aria-live');
    raiz.addEventListener('input', (e) => {
      const i = e.target as HTMLInputElement;
      if (!i.dataset.cantidad) return;
      this.dePersona.set(i.dataset.cantidad, Number(i.value) || 0.5);
      this.actualizarFila(i.dataset.cantidad);
    });
  }
  empezar() {
    this.texto = '';
    this.bloques.clear();
    this.filas.clear();
    this.dePersona.clear();
    this.titulo.textContent = '';
    this.consejo.replaceChildren(el('b', '', 'Consejo'), el('p'));
    this.cuerpo.replaceChildren();
    this.raiz.replaceChildren(this.titulo, this.consejo, this.cuerpo);
    this.raiz.setAttribute('aria-busy', 'true');
    this.anunciar('La IA está armando tu respuesta.');
  }
  recibir(trozo: string) {
    this.texto += trozo; // Solo se guarda: la pantalla se actualiza por tandas.
    this.cuadro ||= window.setTimeout(() => requestAnimationFrame(() => this.pintar()), TANDA_MS);
  }
  terminar() {
    clearTimeout(this.cuadro);
    this.pintar();
    this.raiz.setAttribute('aria-busy', 'false');
    this.anunciar('Tu respuesta está lista.');
  }
  private pintar() {
    this.cuadro = 0;
    conteo.pintadas++;
    const ui: Interfaz = normalizar(parsearParcial(this.texto));
    poner(this.titulo, ui.titulo);
    ui.bloques.forEach((b, i) => this.pintarBloque(b, `${b.tipo}:${i}`));
    // textContent: el navegador nunca ejecuta como HTML lo que escribe el modelo.
    poner(this.consejo.children[1], ui.bloques.find((b) => b.texto)?.texto ?? '');
  }
  private pintarBloque(b: Bloque, clave: string) {
    let s = this.bloques.get(clave);
    if (!s) {
      s = el('section', `bloque reservado-${b.tipo}`);
      s.append(el('h2'), el('div', 'contenido'));
      if (b.tipo === 'receta') s.append(el('ol', 'pasos'));
      this.bloques.set(clave, s);
      this.cuerpo.append(s);
    }
    poner(s.children[0], b.titulo);
    const contenido = s.children[1] as HTMLElement;
    b.productos.forEach((l) => (b.tipo === 'comparador' ? this.pintarComparador(contenido, l) : this.pintarFila(contenido, l)));
    if (b.tipo === 'receta') {
      const ol = s.children[2];
      b.pasos.forEach((p, i) => { const li = ol.children[i] ?? ol.appendChild(el('li')); poner(li, p); });
    }
  }
  private pintarComparador(c: HTMLElement, l: LineaUI) {
    if (c.querySelector(`[data-comp="${l.id}"]`)) return;
    const d = el('div', 'comp');
    d.dataset.comp = l.id;
    d.append(el('h3', '', BY_ID.get(l.id)!.nombre));
    const precios = puestosDe(l.id);
    const menor = Math.min(...precios.map((p) => p.precio));
    precios.forEach((p) => { const f = el('p', `comp-f${p.precio === menor ? ' menor' : ''}`); f.append(el('span', '', p.nombre), el('b', '', fmtCOP(p.precio))); d.append(f); });
    c.append(d);
  }
  private pintarFila(c: HTMLElement, l: LineaUI) {
    let f = this.filas.get(l.id);
    if (!f) {
      const p = BY_ID.get(l.id)!;
      const raiz = el('div', 'fila');
      const input = el('input');
      Object.assign(input, { type: 'number', min: '0.5', step: '0.5', value: String(l.cantidad) });
      input.dataset.cantidad = l.id;
      input.setAttribute('aria-label', `Cantidad de ${p.nombre} en ${p.unidad}`);
      const total = el('b');
      const sugerencia = el('button', 'sugerencia');
      sugerencia.type = 'button';
      sugerencia.hidden = true;
      sugerencia.addEventListener('click', () => { this.dePersona.delete(l.id); input.value = String(this.filas.get(l.id)!.sugerido); this.actualizarFila(l.id); });
      raiz.append(el('span', '', `${p.emoji} ${p.nombre}`), input, el('small', '', p.unidad), total, sugerencia);
      f = { raiz, input, total, sugerencia, sugerido: l.cantidad };
      this.filas.set(l.id, f);
      c.append(raiz);
    }
    f.sugerido = l.cantidad;
    if (!this.dePersona.has(l.id) && document.activeElement !== f.input) f.input.value = String(l.cantidad);
    this.actualizarFila(l.id);
  }
  // ── Acciones que el agente puede usar (las mismas que haría la persona) ──
  private lista() {
    return [...this.bloques.entries()].find(([k]) => !k.startsWith('comparador'))?.[1].children[1] as HTMLElement | undefined;
  }
  private resaltar(id: string) {
    const f = this.filas.get(id)?.raiz;
    f?.classList.remove('por-agente');
    void f?.offsetWidth;
    f?.classList.add('por-agente');
    f?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
  agregar(id: string, cantidad: number) {
    const c = this.lista();
    if (!c) return 'Todavía no hay una lista. Primero pídele un mercado a la IA.';
    if (!this.filas.has(id)) this.pintarFila(c, { id, cantidad });
    this.cambiar(id, cantidad);
    return null;
  }
  cambiar(id: string, cantidad: number) {
    const f = this.filas.get(id);
    if (!f) return 'Ese producto no está en la lista.';
    this.dePersona.set(id, cantidad);
    f.input.value = String(cantidad);
    this.actualizarFila(id);
    this.resaltar(id);
    return null;
  }
  quitar(id: string) {
    const f = this.filas.get(id);
    if (!f) return 'Ese producto no está en la lista.';
    f.raiz.remove();
    this.filas.delete(id);
    this.dePersona.delete(id);
    return null;
  }
  productos() {
    return [...this.filas.keys()];
  }

  private actualizarFila(id: string) {
    const f = this.filas.get(id)!;
    const p = BY_ID.get(id)!;
    const mia = this.dePersona.get(id);
    poner(f.total, fmtCOP(p.precio * (mia ?? f.sugerido)));
    f.sugerencia.hidden = mia === undefined || mia === f.sugerido;
    poner(f.sugerencia, `La IA sugiere ${f.sugerido} ${p.unidad} · Usar`);
  }
}
