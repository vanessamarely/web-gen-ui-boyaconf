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
let favoritos = 0;

function fila(item: Item) {
  return `<li class="fila" data-id="${item.id}">
    <input type="checkbox" />
    <div><b>${item.nombre}</b><small>${item.razon}</small></div>
    <label>Cantidad
      <select>${Array.from({ length: 12 }, (_, n) => `<option ${n + 1 === item.cantidad ? 'selected' : ''}>${n + 1} ${item.unidad}</option>`).join('')}</select>
    </label>
    <input type="text" placeholder="Nota para el puesto" />
  </li>`;
}

async function generar(pedido: Pedido) {
  let texto = '';
  for await (const pedazo of pedirAlModelo(pedido)) {
    texto += pedazo;
    // Vuelve a leer toda la respuesta y pinta toda la lista con cada pedazo.
    const items: Item[] = [];
    let aviso = '';
    for (const linea of texto.split('\n')) {
      try {
        const cambio = JSON.parse(linea);
        if (cambio.op === 'item') items.push(cambio);
        if (cambio.op === 'consejo') aviso = cambio.texto;
      } catch {
        // línea incompleta: llegará en el próximo pedazo
      }
    }
    lista.innerHTML = items.map(fila).join('');
    // Mide la lista después de cada pintura para ajustar el diseño.
    document.documentElement.style.setProperty('--alto-lista', `${lista.scrollHeight}px`);
    for (const el of lista.querySelectorAll('.fila')) el.getBoundingClientRect();
    consejo.innerHTML = aviso ? `<aside class="consejo">${aviso}</aside>` : '';
  }
}

document.querySelector('[data-testid="generar"]')!.addEventListener('click', () => void generar('inicial'));
document.querySelector('[data-testid="refinar"]')!.addEventListener('click', () => void generar('refinado'));
document.querySelector('[data-testid="contador"]')!.addEventListener('click', (e) => {
  favoritos++;
  (e.currentTarget as HTMLElement).querySelector('span')!.textContent = String(favoritos);
});
