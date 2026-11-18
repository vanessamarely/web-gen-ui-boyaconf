// Primera versión generada con IA: se ve bien y "funciona".
import { pedirAlModelo, type Pedido } from './modelo';

interface Item {
  id: string;
  nombre: string;
  cantidad: number;
  unidad: string;
  razon: string;
}

const lista = document.querySelector<HTMLElement>('#lista')!;
const consejo = document.querySelector<HTMLElement>('#consejo')!;
const estado = document.querySelector<HTMLElement>('#estado')!;
let favoritos = 0;

interface Fila {
  el: HTMLLIElement;
  nombre: HTMLElement;
  razon: HTMLElement;
  cantidad: HTMLSelectElement;
  marca: HTMLInputElement;
  nota: HTMLInputElement;
  item: Item;
}

const CANTIDADES = 12;
const molde = document.createElement('template');
molde.innerHTML = `<li class="fila">
    <input type="checkbox" />
    <div><b></b><small></small></div>
    <label>Cantidad
      <select>${'<option></option>'.repeat(CANTIDADES)}</select>
    </label>
    <input type="text" placeholder="Nota para el puesto" />
  </li>`;

/** Lo que hizo la persona, por producto. El modelo nunca escribe aquí. */
interface DePersona {
  marcado?: boolean;
  nota?: string;
  cantidad?: number;
}
const dePersona = new Map<string, DePersona>();

/** Cada fila se identifica por el id del producto y vive mientras el producto siga en la lista. */
const filas = new Map<string, Fila>();

function crearFila(item: Item): Fila {
  const el = (molde.content.firstElementChild as HTMLLIElement).cloneNode(true) as HTMLLIElement;
  el.dataset.id = item.id;
  const nueva: Fila = { el, nombre: el.querySelector('b')!, razon: el.querySelector('small')!, cantidad: el.querySelector('select')!, marca: el.querySelector('input[type="checkbox"]')!, nota: el.querySelector('input[type="text"]')!, item };
  nueva.nombre.textContent = item.nombre;
  nombrarCampos(nueva, item.nombre);
  nueva.razon.textContent = item.razon;
  escribirUnidad(nueva.cantidad, item.unidad);
  // Un producto que vuelve a la lista recupera lo que la persona había hecho con él.
  const propio = dePersona.get(item.id);
  nueva.cantidad.selectedIndex = (propio?.cantidad ?? item.cantidad) - 1;
  nueva.marca.checked = propio?.marcado ?? false;
  nueva.nota.value = propio?.nota ?? '';
  return nueva;
}

/** Con 40 filas iguales, cada campo necesita decir de qué producto es. */
function nombrarCampos({ marca, cantidad, nota }: Fila, nombre: string) {
  marca.setAttribute('aria-label', `Marcar ${nombre} como comprado`);
  cantidad.setAttribute('aria-label', `Cantidad de ${nombre}`);
  nota.setAttribute('aria-label', `Nota para el puesto sobre ${nombre}`);
}

function escribirUnidad(select: HTMLSelectElement, unidad: string) {
  Array.from(select.options).forEach((opcion, n) => { opcion.textContent = `${n + 1} ${unidad}`; });
}

/** Escribe en el DOM solo los campos que cambiaron. */
function actualizarFila(actual: Fila, item: Item) {
  const antes = actual.item;
  if (item.nombre !== antes.nombre) {
    actual.nombre.textContent = item.nombre;
    nombrarCampos(actual, item.nombre);
  }
  if (item.razon !== antes.razon) actual.razon.textContent = item.razon;
  if (item.unidad !== antes.unidad) escribirUnidad(actual.cantidad, item.unidad);
  // La cantidad que eligió la persona manda sobre la que proponga el modelo.
  if (item.cantidad !== antes.cantidad && dePersona.get(item.id)?.cantidad === undefined) {
    actual.cantidad.selectedIndex = item.cantidad - 1;
  }
  actual.item = item;
}

// Lo que llegó del modelo y todavía no está en pantalla.
let filasPendientes: Item[] = [];
let avisoPendiente: string | null = null;
let finPendiente = false;
let frame = 0;
// Posición de la generación en curso dentro de la lista y productos que ya confirmó.
let cursor: Element | null = null;
let vistos = new Set<string>();
let generacion = 0;

function colocar(item: Item) {
  vistos.add(item.id);
  let actual = filas.get(item.id);
  if (actual) actualizarFila(actual, item);
  else filas.set(item.id, (actual = crearFila(item)));
  const { el } = actual;
  // Solo mueve la fila si no está en su lugar: mover un nodo le quita el foco.
  if (el === cursor) cursor = el.nextElementSibling;
  else lista.insertBefore(el, cursor);
}

function terminar(mensaje: string) {
  lista.setAttribute('aria-busy', 'false');
  estado.textContent = mensaje;
}

function pintar() {
  frame = 0;
  filasPendientes.forEach(colocar);
  filasPendientes = [];
  if (finPendiente) {
    // Lo que el modelo ya no propone sale de la lista al terminar, no antes.
    for (const [id, { el }] of filas) {
      if (!vistos.has(id)) { el.remove(); filas.delete(id); }
    }
    finPendiente = false;
    terminar(`Mercado listo: ${filas.size} productos.`);
  }
  if (avisoPendiente !== null) {
    consejo.replaceChildren();
    if (avisoPendiente) {
      const aside = document.createElement('aside');
      aside.className = 'consejo';
      aside.textContent = avisoPendiente;
      consejo.append(aside);
    }
    avisoPendiente = null;
  }
}

/** Pinta como máximo una vez por frame, sin importar cuántos pedazos lleguen. */
function pedirPintura() {
  if (!frame) frame = requestAnimationFrame(pintar);
}

function aplicar(linea: string) {
  if (!linea.trim()) return;
  const cambio = JSON.parse(linea);
  // El plan dice cuántas filas vienen: reserva su alto antes de que lleguen.
  if (cambio.op === 'plan') lista.style.setProperty('--filas', String(cambio.items));
  if (cambio.op === 'item') filasPendientes.push(cambio);
  if (cambio.op === 'consejo') avisoPendiente = cambio.texto;
  if (cambio.op === 'fin') finPendiente = true;
  pedirPintura();
}

async function generar(pedido: Pedido) {
  const esta = ++generacion; // una generación nueva reemplaza a la que esté en curso
  cancelAnimationFrame(frame);
  frame = 0;
  filasPendientes = [];
  finPendiente = false;
  avisoPendiente = '';
  cursor = lista.firstElementChild;
  vistos = new Set();
  lista.setAttribute('aria-busy', 'true');
  estado.textContent = 'Generando tu mercado…';
  pedirPintura();
  let resto = ''; // línea incompleta: se completa con el próximo pedazo
  try {
    for await (const pedazo of pedirAlModelo(pedido)) {
      if (esta !== generacion) return;
      const lineas = (resto + pedazo).split('\n');
      resto = lineas.pop()!;
      lineas.forEach(aplicar);
    }
    aplicar(resto);
  } catch {
    if (esta === generacion) terminar('No se pudo generar el mercado. Intenta de nuevo.');
  }
}

lista.addEventListener('input', (e) => {
  const campo = e.target as HTMLInputElement | HTMLSelectElement;
  const id = campo.closest<HTMLElement>('[data-id]')?.dataset.id;
  if (!id) return;
  const propio = dePersona.get(id) ?? {};
  if (campo instanceof HTMLSelectElement) propio.cantidad = campo.selectedIndex + 1;
  else if (campo.type === 'checkbox') propio.marcado = campo.checked;
  else propio.nota = campo.value;
  dePersona.set(id, propio);
});

document.querySelector('[data-testid="generar"]')!.addEventListener('click', () => void generar('inicial'));
document.querySelector('[data-testid="refinar"]')!.addEventListener('click', () => void generar('refinado'));
document.querySelector('[data-testid="contador"]')!.addEventListener('click', (e) => {
  favoritos++;
  (e.currentTarget as HTMLElement).querySelector('span')!.textContent = String(favoritos);
});
