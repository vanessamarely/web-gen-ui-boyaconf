// Un solo estado para la persona y el agente.
//  · Los botones de la UI y las tools de WebMCP llaman ESTAS funciones (no hay dos verdades).
//  · Cada ítem distingue lo GENERADO (cantidad y razón del agente) de lo DE LA PERSONA
//    (comprado, nota, cantidad editada a mano). Una regeneración nunca pisa lo de la persona.
//  · `version` sube con cada cambio: una tool con una versión vieja responde "vuelve a leer".
//  · Suscripciones finas: 'item:<id>', 'puesto:<id>', 'resumen', 'plan', 'lista'.
import { BY_ID, PUESTOS, type Puesto } from './catalog';
import type { Linea } from './genui/planner';

export type Actor = 'persona' | 'agente';

export interface Item {
  id: string;
  puesto: Puesto;
  cantidad: number;
  razon: string;
  comprado: boolean;
  nota: string;
  /** la persona cambió la cantidad a mano: el agente ya no la toca */
  cantidadPersona: boolean;
  /** el agente propuso otra cantidad que no se aplicó (para mostrarlo) */
  propuesta?: number;
}

export interface Cambio {
  op: 'plan' | 'add' | 'replace' | 'remove' | 'done' | 'consejo';
  puesto?: Puesto;
  plan?: { puesto: Puesto; items: number }[];
  item?: Linea;
  id?: string;
  cantidad?: number;
  razon?: string;
  texto?: string;
}

interface Snapshot {
  items: [string, Item][];
  orden: Record<Puesto, string[]>;
  presupuesto: number;
  personas: number;
}

export interface Accion {
  id: number;
  label: string;
  actor: Actor;
  at: number;
  snap: Snapshot;
}

type Listener = () => void;
const emptyOrden = (): Record<Puesto, string[]> => ({ frutas: [], tuberculos: [], verduras: [], granos: [], lacteos: [] });

class Mercado {
  version = 0;
  personas = 4;
  presupuesto = 120000;
  plato = 'cuchuco';
  consejo = '';
  items = new Map<string, Item>();
  orden = emptyOrden();
  plan: { puesto: Puesto; items: number }[] = [];
  busy = new Set<Puesto>();
  historial: Accion[] = [];
  private seq = 0;
  private listeners = new Map<string, Set<Listener>>();
  private pending = new Set<string>();
  private raf = 0;

  suscribir(key: string, fn: Listener) {
    if (!this.listeners.has(key)) this.listeners.set(key, new Set());
    this.listeners.get(key)!.add(fn);
    return () => this.listeners.get(key)?.delete(fn);
  }

  /** Avisos agrupados: como mucho una notificación por clave y por frame. */
  private touch(...keys: string[]) {
    // El historial no es un cambio de la lista: no sube la versión.
    if (!(keys.length === 1 && keys[0] === 'historial')) this.version++;
    keys.push('resumen', 'any');
    keys.forEach((k) => this.pending.add(k));
    if (!this.raf) this.raf = requestAnimationFrame(() => this.flush());
  }
  /** Para el modo ingenuo (y los tests): avisa YA, sin esperar el frame. */
  flushNow() {
    cancelAnimationFrame(this.raf);
    this.flush();
  }
  private flush() {
    this.raf = 0;
    const keys = [...this.pending];
    this.pending.clear();
    for (const k of keys) this.listeners.get(k)?.forEach((fn) => fn());
  }

  get total() {
    let t = 0;
    for (const it of this.items.values()) t += BY_ID.get(it.id)!.precio * it.cantidad;
    return t;
  }
  get comprados() {
    return [...this.items.values()].filter((i) => i.comprado).length;
  }
  /** Lo que todavía falta por pagar (derivado en código, no por el modelo). */
  get faltaPorPagar() {
    let t = 0;
    for (const it of this.items.values()) if (!it.comprado) t += BY_ID.get(it.id)!.precio * it.cantidad;
    return t;
  }

  // ── Historial (deshacer) ───────────────────────────────────────────
  snapshot(): Snapshot {
    return { items: [...this.items].map(([k, v]) => [k, { ...v }]), orden: JSON.parse(JSON.stringify(this.orden)), presupuesto: this.presupuesto, personas: this.personas };
  }
  /** Guarda en el historial una foto tomada ANTES del cambio (para deshacer). */
  registrar(label: string, actor: Actor, snap: Snapshot = this.snapshot()) {
    const a = { id: ++this.seq, label, actor, at: Date.now(), snap };
    this.historial.unshift(a);
    this.historial.length = Math.min(this.historial.length, 12);
    this.touch('historial');
    return a.id;
  }
  deshacer(id: number) {
    const i = this.historial.findIndex((a) => a.id === id);
    if (i < 0) return false;
    const { snap } = this.historial[i];
    this.historial.splice(0, i + 1);
    const before = new Set(this.items.keys());
    this.items = new Map(snap.items.map(([k, v]) => [k, { ...v }]));
    this.orden = snap.orden;
    this.presupuesto = snap.presupuesto;
    this.personas = snap.personas;
    const keys = new Set([...before, ...this.items.keys()].map((k) => `item:${k}`));
    this.touch(...keys, ...PUESTOS.map((p) => `puesto:${p.id}`), 'lista', 'historial');
    return true;
  }

  // ── Acciones de la persona y del agente (la MISMA lógica) ─────────
  /** Vacía la lista (el modo ingenuo lo hace en cada regeneración: así se pierde lo de la persona). */
  vaciar() {
    this.items.clear();
    this.orden = emptyOrden();
    this.plan = [];
    this.consejo = '';
    this.touch('lista', 'plan', ...PUESTOS.map((p) => `puesto:${p.id}`));
  }

  setPedido(p: { personas?: number; presupuesto?: number; plato?: string }) {
    Object.assign(this, Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)));
    this.touch('pedido');
  }

  /** Aplica un cambio que llega del stream del modelo. */
  aplicar(c: Cambio, opts: { respetarPersona: boolean }) {
    switch (c.op) {
      case 'plan':
        this.plan = c.plan ?? [];
        this.plan.forEach((p) => this.busy.add(p.puesto));
        return this.touch('plan', ...this.plan.map((p) => `puesto:${p.puesto}`));
      case 'consejo':
        this.consejo = c.texto ?? '';
        return this.touch('consejo');
      case 'done':
        if (c.puesto) this.busy.delete(c.puesto);
        else this.busy.clear();
        return this.touch(c.puesto ? `puesto:${c.puesto}` : 'plan', 'busy');
      case 'add':
      case 'replace': {
        const l = c.item ?? { id: c.id!, cantidad: c.cantidad!, razon: c.razon ?? '' };
        const p = BY_ID.get(l.id);
        if (!p) return;
        const cur = this.items.get(l.id);
        if (cur) {
          if (opts.respetarPersona && cur.cantidadPersona) cur.propuesta = l.cantidad !== cur.cantidad ? l.cantidad : undefined;
          else cur.cantidad = l.cantidad;
          if (l.razon) cur.razon = l.razon;
          return this.touch(`item:${l.id}`);
        }
        this.items.set(l.id, { id: l.id, puesto: p.puesto, cantidad: l.cantidad, razon: l.razon, comprado: false, nota: '', cantidadPersona: false });
        this.orden[p.puesto].push(l.id);
        return this.touch(`item:${l.id}`, `puesto:${p.puesto}`, 'lista');
      }
      case 'remove': {
        const cur = this.items.get(c.id!);
        if (!cur) return;
        // Lo de la persona gana: si ya lo compró, le escribió una nota o cambió la cantidad, se queda.
        if (opts.respetarPersona && (cur.comprado || cur.nota || cur.cantidadPersona)) {
          cur.razon = 'Lo conservé porque ya lo marcaste o editaste';
          return this.touch(`item:${cur.id}`);
        }
        this.quitarInterno(cur.id);
        return;
      }
    }
  }

  private quitarInterno(id: string) {
    const cur = this.items.get(id);
    if (!cur) return;
    this.items.delete(id);
    this.orden[cur.puesto] = this.orden[cur.puesto].filter((x) => x !== id);
    this.touch(`item:${id}`, `puesto:${cur.puesto}`, 'lista');
  }

  /** Reordena un puesto (p. ej. lo comprado al final). */
  ordenarPuesto(puesto: Puesto, ids: string[]) {
    this.orden[puesto] = ids;
    this.touch(`puesto:${puesto}`);
  }

  marcar(id: string, comprado: boolean) {
    const it = this.items.get(id);
    if (!it) return { ok: false as const, error: `No hay "${id}" en la lista.` };
    it.comprado = comprado;
    this.touch(`item:${id}`);
    return { ok: true as const, nombre: BY_ID.get(id)!.nombre };
  }

  setNota(id: string, nota: string) {
    const it = this.items.get(id);
    if (!it) return;
    it.nota = nota.slice(0, 80);
    this.touch(`item:${id}`);
  }

  setCantidad(id: string, cantidad: number, actor: Actor) {
    const it = this.items.get(id);
    if (!it) return { ok: false as const, error: `No hay "${id}" en la lista.` };
    if (actor === 'agente' && it.cantidadPersona) return { ok: false as const, error: `La persona fijó ${it.cantidad} a mano; no la cambio.` };
    it.cantidad = Math.max(0.5, Math.round(cantidad * 2) / 2);
    if (actor === 'persona') {
      it.cantidadPersona = true;
      it.propuesta = undefined;
    }
    this.touch(`item:${id}`);
    return { ok: true as const, nombre: BY_ID.get(id)!.nombre };
  }

  agregar(id: string, cantidad: number, razon = 'Lo pediste') {
    const p = BY_ID.get(id);
    if (!p) return { ok: false as const, error: `"${id}" no está en el catálogo. Usa buscar_productos.` };
    this.aplicar({ op: 'add', item: { id, cantidad, razon } }, { respetarPersona: true });
    return { ok: true as const, nombre: p.nombre };
  }

  quitar(id: string) {
    if (!this.items.has(id)) return { ok: false as const, error: `No hay "${id}" en la lista.` };
    this.quitarInterno(id);
    return { ok: true as const, nombre: BY_ID.get(id)!.nombre };
  }

  /** Lo que ve el agente: datos, no la pantalla. */
  resumenParaAgente() {
    return {
      version: this.version,
      personas: this.personas,
      presupuesto: this.presupuesto,
      total: Math.round(this.total),
      items: [...this.items.values()].map((i) => ({ id: i.id, cantidad: i.cantidad, comprado: i.comprado, editadoPorPersona: i.cantidadPersona, nota: i.nota || undefined })),
    };
  }
}

export const mercado = new Mercado();
export type { Mercado };
