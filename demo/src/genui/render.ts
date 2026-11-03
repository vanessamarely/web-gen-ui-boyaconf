// Dos maneras de pintar el MISMO estado.
//
// INGENUA · VistaIngenua: root.innerHTML = plantilla(todo) en cada cambio. Recrea cientos de nodos,
//   se pierde el foco (y lo que estabas escribiendo), y lo que entra arriba empuja lo demás.
// SIN FRICCIÓN · VistaFluida: el plan reserva cada puesto con su altura final; cada fila es un nodo
//   por id que se crea UNA vez, se parcha por suscripción ('item:<id>') y se mueve con moveBefore()
//   (conserva foco y estado; insertBefore como respaldo).
import { BY_ID, PUESTOS, fmtCOP, fmtCant, type Puesto } from '../catalog';
import { mercado, type Item } from '../store';
import { metrics } from '../lab/metrics';
import { trackSpan } from '../lab/perf-tracks';
import { esc } from '../esc';

export interface Vista {
  montar(root: HTMLElement): void;
  desmontar(): void;
}

const ROW_H = 64; // altura fija de una fila (también en CSS)
const PASO = (u: string) => (u === 'und' || u === 'atado' || u === 'docena' ? 1 : 0.5);

function filaInterior(it: Item) {
  const p = BY_ID.get(it.id)!;
  return `<input type="checkbox" class="chk" data-act="comprado" aria-label="Comprado: ${esc(p.nombre)}" ${it.comprado ? 'checked' : ''} />
    <span class="emoji" aria-hidden="true">${p.emoji}</span>
    <div class="info"><b>${esc(p.nombre)}</b><small class="razon">${esc(it.razon)}</small></div>
    <div class="qty"><button type="button" data-act="menos" aria-label="Menos ${esc(p.nombre)}">−</button><output class="cant">${fmtCant(it.cantidad, p.unidad)}</output><button type="button" data-act="mas" aria-label="Más ${esc(p.nombre)}">+</button></div>
    <span class="precio">${fmtCOP(p.precio * it.cantidad)}</span>
    <input class="nota" data-act="nota" maxlength="80" placeholder="Nota para el puesto…" aria-label="Nota para ${esc(p.nombre)}" value="${esc(it.nota)}" />
    <span class="propuesta" ${it.propuesta ? '' : 'hidden'}>El agente sugiere ${it.propuesta ? fmtCant(it.propuesta, p.unidad) : ''} · dejé la tuya</span>`;
}

function filaClase(it: Item) {
  return `fila${it.comprado ? ' comprado' : ''}${it.cantidadPersona ? ' editado' : ''}`;
}

function cabecera(puesto: Puesto) {
  const p = PUESTOS.find((x) => x.id === puesto)!;
  return `<header><span class="p-emoji" aria-hidden="true">${p.emoji}</span><div><h2 id="h-${puesto}">${p.nombre}</h2><small>${p.vendedor}</small></div><span class="subtotal" data-subtotal></span></header>`;
}

const subtotal = (puesto: Puesto) => mercado.orden[puesto].reduce((a, id) => a + BY_ID.get(id)!.precio * (mercado.items.get(id)?.cantidad ?? 0), 0);

/** Eventos de la persona (delegación: sobrevive a innerHTML). Mismas funciones que usan las tools. */
function eventosPersona(root: HTMLElement, ac: AbortController) {
  root.addEventListener(
    'click',
    (e) => {
      const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button[data-act]');
      const fila = b?.closest<HTMLElement>('[data-id]');
      if (!b || !fila) return;
      const it = mercado.items.get(fila.dataset.id!);
      if (!it) return;
      const paso = PASO(BY_ID.get(it.id)!.unidad);
      mercado.setCantidad(it.id, it.cantidad + (b.dataset.act === 'mas' ? paso : -paso), 'persona');
    },
    { signal: ac.signal },
  );
  root.addEventListener(
    'change',
    (e) => {
      const el = e.target as HTMLInputElement;
      const fila = el.closest<HTMLElement>('[data-id]');
      if (el.dataset.act !== 'comprado' || !fila) return;
      const id = fila.dataset.id!;
      mercado.marcar(id, el.checked);
      // Lo comprado baja al final de su puesto (en la vista fluida, moveBefore conserva el foco).
      setTimeout(() => {
        const it = mercado.items.get(id);
        if (!it) return;
        const ids = mercado.orden[it.puesto];
        mercado.ordenarPuesto(it.puesto, [...ids.filter((x) => !mercado.items.get(x)?.comprado), ...ids.filter((x) => mercado.items.get(x)?.comprado)]);
      }, 450);
    },
    { signal: ac.signal },
  );
  root.addEventListener(
    'input',
    (e) => {
      const el = e.target as HTMLInputElement;
      const fila = el.closest<HTMLElement>('[data-id]');
      if (el.dataset.act === 'nota' && fila) mercado.setNota(fila.dataset.id!, el.value);
    },
    { signal: ac.signal },
  );
}

// ═════════════════════════════════════════════════════════════════════
export class VistaIngenua implements Vista {
  private root!: HTMLElement;
  private ac = new AbortController();
  private off: (() => void)[] = [];

  montar(root: HTMLElement) {
    this.root = root;
    root.dataset.vista = 'ingenua';
    eventosPersona(root, this.ac);
    this.off.push(mercado.suscribir('any', () => this.pintar()));
    this.pintar();
  }
  desmontar() {
    this.ac.abort();
    this.off.forEach((f) => f());
  }

  /**
   * Como muchas apps reales: los contenedores (consejo y un <section> por puesto) son estables,
   * pero su CONTENIDO se reemplaza con innerHTML en cada cambio. Por eso, cuando el consejo llega
   * tarde ARRIBA o un puesto crece, todo lo de abajo salta y el CLS lo registra.
   * (Si se recreara TODA la vista, el CLS ni lo vería porque los nodos son nuevos; la persona sí.)
   */
  private pintar() {
    const t0 = performance.now();
    const activo = document.activeElement;
    const enFoco = activo && this.root.contains(activo) && activo instanceof HTMLInputElement ? activo : null;
    if (!this.root.querySelector('[data-n-consejo]')) this.root.innerHTML = '<div data-n-consejo></div><div class="puestos" data-n-puestos></div>';
    this.root.querySelector('[data-n-consejo]')!.innerHTML = mercado.consejo ? `<aside class="consejo"><b>Consejo del agente</b><p>${esc(mercado.consejo)}</p></aside>` : '';
    const cont = this.root.querySelector<HTMLElement>('[data-n-puestos]')!;
    const con = PUESTOS.filter((p) => mercado.orden[p.id].length);
    if (!con.length) cont.innerHTML = vacio();
    else cont.querySelector('.vacio')?.remove();
    for (const p of PUESTOS) {
      let sec = cont.querySelector<HTMLElement>(`[data-n-puesto="${p.id}"]`);
      if (!mercado.orden[p.id].length) {
        sec?.remove();
        continue;
      }
      if (!sec) {
        sec = document.createElement('section');
        sec.className = 'puesto';
        sec.dataset.nPuesto = p.id;
        sec.setAttribute('aria-labelledby', `h-${p.id}`);
        const despues = PUESTOS.slice(PUESTOS.indexOf(p) + 1).map((x) => cont.querySelector(`[data-n-puesto="${x.id}"]`)).find(Boolean) ?? null;
        cont.insertBefore(sec, despues);
      }
      sec.innerHTML = `${cabecera(p.id).replace('<span class="subtotal" data-subtotal></span>', `<span class="subtotal">${fmtCOP(subtotal(p.id))}</span>`)}<ul class="filas">${mercado.orden[p.id]
        .map((id) => mercado.items.get(id))
        .filter((x): x is Item => !!x)
        .map((it) => `<li class="${filaClase(it)}" data-id="${it.id}">${filaInterior(it)}</li>`)
        .join('')}</ul>`;
    }
    if (enFoco) metrics.focoPerdido++;
    metrics.renders++;
    trackSpan('Render', 'innerHTML de cada puesto', t0, performance.now(), 'error');
  }
}

// ═════════════════════════════════════════════════════════════════════
export class VistaFluida implements Vista {
  private ac = new AbortController();
  private off: (() => void)[] = [];
  private secciones = new Map<Puesto, HTMLElement>();
  private filas = new Map<string, HTMLElement>();
  private consejo!: HTMLElement;
  private cont!: HTMLElement;

  montar(root: HTMLElement) {
    root.dataset.vista = 'fluida';
    root.innerHTML = `<aside class="consejo reservado" data-consejo aria-live="polite"></aside><div class="puestos" data-puestos></div>`;
    this.consejo = root.querySelector('[data-consejo]')!;
    this.cont = root.querySelector('[data-puestos]')!;
    eventosPersona(root, this.ac);
    this.off.push(
      mercado.suscribir('plan', () => this.plan()),
      mercado.suscribir('lista', () => this.lista()),
      mercado.suscribir('consejo', () => this.pintarConsejo()),
      mercado.suscribir('busy', () => this.secciones.forEach((el, p) => this.busy(p, el))),
      ...PUESTOS.map((p) => mercado.suscribir(`puesto:${p.id}`, () => this.puesto(p.id))),
    );
    // Si ya había lista (cambio de modo), se reconstruye una vez.
    this.plan();
    this.lista();
    this.pintarConsejo();
  }
  desmontar() {
    this.ac.abort();
    this.off.forEach((f) => f());
    this.filas.forEach((el) => (el as HTMLElement & { _off?: () => void })._off?.());
  }

  private pintarConsejo() {
    this.consejo.innerHTML = mercado.consejo ? `<b>Consejo del agente</b><p>${esc(mercado.consejo)}</p>` : '<span class="sk-line"></span><span class="sk-line short"></span>';
  }

  /** El plan llega primero: cada puesto se reserva con su altura final (esqueletos). */
  private plan() {
    const vivos = new Set([...mercado.plan.map((p) => p.puesto), ...PUESTOS.filter((p) => mercado.orden[p.id].length).map((p) => p.id)]);
    if (!vivos.size && !this.secciones.size) {
      this.cont.innerHTML = vacio();
      return;
    }
    this.cont.querySelector('.vacio')?.remove();
    for (const p of PUESTOS) {
      if (!vivos.has(p.id) || this.secciones.has(p.id)) continue;
      const sec = document.createElement('section');
      sec.className = 'puesto';
      sec.setAttribute('aria-labelledby', `h-${p.id}`);
      sec.innerHTML = `${cabecera(p.id)}<ul class="filas"></ul>`;
      // Insertar en el orden de PUESTOS
      const despues = PUESTOS.slice(PUESTOS.indexOf(p) + 1).map((x) => this.secciones.get(x.id)).find(Boolean) ?? null;
      this.cont.insertBefore(sec, despues);
      this.secciones.set(p.id, sec);
    }
    this.secciones.forEach((_, p) => this.puesto(p));
  }

  private lista() {
    // Puestos que aparecen sin plan (p. ej. una tool agregó un producto) y filas que ya no existen.
    if (PUESTOS.some((p) => mercado.orden[p.id].length && !this.secciones.has(p.id))) this.plan();
    for (const [id, el] of this.filas)
      if (!mercado.items.has(id)) {
        (el as HTMLElement & { _off?: () => void })._off?.();
        el.remove();
        this.filas.delete(id);
      }
    if (!mercado.items.size && !mercado.plan.length) {
      this.secciones.forEach((s) => s.remove());
      this.secciones.clear();
      this.plan();
    }
  }

  private busy(puesto: Puesto, sec: HTMLElement) {
    sec.setAttribute('aria-busy', String(mercado.busy.has(puesto)));
  }

  /** Reconciliar un puesto: reutilizar filas por id, crear solo lo nuevo y mover con moveBefore(). */
  private puesto(puesto: Puesto) {
    const sec = this.secciones.get(puesto);
    if (!sec) return;
    const t0 = performance.now();
    const ul = sec.querySelector<HTMLUListElement>('.filas')!;
    const ids = mercado.orden[puesto];
    ids.forEach((id, i) => {
      let el = this.filas.get(id);
      if (!el) {
        this.filas.set(id, (el = this.crearFila(id)));
        // La fila ocupa el lugar de un esqueleto (misma altura): nada se mueve.
        const sk = ul.querySelector('.fila.sk');
        if (sk) sk.replaceWith(el);
      }
      const ref = ul.children[i] ?? null;
      if (el === ref) return;
      const ulM = ul as HTMLUListElement & { moveBefore?: (n: Node, r: Node | null) => void };
      if (el.isConnected && el.parentNode === ul && ulM.moveBefore) ulM.moveBefore(el, ref);
      else ul.insertBefore(el, ref);
    });
    // Esqueletos: lo que el plan prometió y aún no llega (misma altura que una fila real).
    const plan = mercado.plan.find((p) => p.puesto === puesto)?.items ?? 0;
    const faltan = mercado.busy.has(puesto) ? Math.max(0, plan - ids.length) : 0;
    ul.querySelectorAll('.fila.sk').forEach((s, k) => k >= faltan && s.remove());
    for (let k = ul.querySelectorAll('.fila.sk').length; k < faltan; k++) ul.insertAdjacentHTML('beforeend', '<li class="fila sk" aria-hidden="true"><i></i><i></i><i></i></li>');
    ul.style.minHeight = `${Math.max(plan, ids.length) * ROW_H}px`;
    sec.querySelector('[data-subtotal]')!.textContent = ids.length ? fmtCOP(subtotal(puesto)) : '';
    this.busy(puesto, sec);
    if (!ids.length && !mercado.busy.has(puesto) && !mercado.plan.some((p) => p.puesto === puesto)) {
      sec.remove();
      this.secciones.delete(puesto);
    }
    metrics.renders++;
    trackSpan('Render', `reconciliar ${puesto}`, t0, performance.now(), 'secondary');
  }

  private crearFila(id: string) {
    const it = mercado.items.get(id)!;
    const li = document.createElement('li') as HTMLLIElement & { _off?: () => void };
    li.className = filaClase(it);
    li.dataset.id = id;
    li.innerHTML = filaInterior(it);
    li.classList.add('nuevo');
    setTimeout(() => li.classList.remove('nuevo'), 1200);
    // Suscripción fina: solo esta fila se entera de los cambios de este ítem.
    li._off = mercado.suscribir(`item:${id}`, () => this.parchar(li));
    return li;
  }

  /** Parchar solo lo que cambió: textContent y propiedades, nunca innerHTML. */
  private parchar(li: HTMLElement) {
    const it = mercado.items.get(li.dataset.id!);
    if (!it) return;
    const p = BY_ID.get(it.id)!;
    const set = (sel: string, txt: string) => {
      const el = li.querySelector<HTMLElement>(sel)!;
      if (el.textContent !== txt) {
        el.textContent = txt;
        return true;
      }
      return false;
    };
    let cambio = set('.cant', fmtCant(it.cantidad, p.unidad));
    set('.precio', fmtCOP(p.precio * it.cantidad));
    set('.razon', it.razon);
    const chk = li.querySelector<HTMLInputElement>('.chk')!;
    if (chk.checked !== it.comprado) chk.checked = it.comprado;
    const nota = li.querySelector<HTMLInputElement>('.nota')!;
    if (document.activeElement !== nota && nota.value !== it.nota) nota.value = it.nota;
    const prop = li.querySelector<HTMLElement>('.propuesta')!;
    prop.hidden = !it.propuesta;
    if (it.propuesta) cambio = set('.propuesta', `El agente sugiere ${fmtCant(it.propuesta, p.unidad)} · dejé la tuya`) || cambio;
    li.className = filaClase(it) + (li.classList.contains('nuevo') ? ' nuevo' : '');
    if (cambio) {
      li.classList.remove('cambio');
      void li.offsetWidth;
      li.classList.add('cambio');
    }
    const sec = this.secciones.get(it.puesto);
    if (sec) sec.querySelector('[data-subtotal]')!.textContent = fmtCOP(subtotal(it.puesto));
  }
}

function vacio() {
  return `<div class="vacio"><p class="v-emoji" aria-hidden="true">🧺</p><h2>Tu canasta está vacía</h2><p>Pídele al agente tu mercado de la semana o elige una sugerencia.</p></div>`;
}
