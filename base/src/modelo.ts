// Simula la respuesta de un modelo en streaming. NO SE MODIFICA: es la entrada de la app.
// Cada línea es un cambio en JSON:
//   {"op":"plan","items":40}                     cuántos productos vienen
//   {"op":"item","id":"papa","nombre":"Papa","cantidad":2,"unidad":"kg","razon":"…"}
//   {"op":"consejo","texto":"…"}                 llega al final
//   {"op":"fin"}
const BASE = ['Papa pastusa', 'Papa criolla', 'Cubios', 'Hibias', 'Arracacha', 'Rubas', 'Cebolla larga', 'Habas', 'Arveja', 'Zanahoria', 'Cilantro', 'Ajo', 'Repollo', 'Mazorca', 'Trigo', 'Cebada', 'Maíz pelado', 'Fríjol', 'Lenteja', 'Arroz', 'Uchuvas', 'Curuba', 'Feijoa', 'Mora', 'Lulo', 'Durazno', 'Queso campesino', 'Cuajada', 'Huevos', 'Leche', 'Almojábanas', 'Mantequilla', 'Tomate', 'Pepino', 'Espinaca', 'Acelga', 'Remolacha', 'Calabaza', 'Guatila', 'Panela'];
const slug = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, '-');

export type Pedido = 'inicial' | 'refinado';

function lineas(pedido: Pedido): string[] {
  const nombres = pedido === 'refinado' ? [...BASE, 'Aguacate', 'Plátano', 'Yuca'] : BASE;
  return [
    JSON.stringify({ op: 'plan', items: nombres.length }),
    ...nombres.map((nombre, i) =>
      JSON.stringify({ op: 'item', id: slug(nombre), nombre, cantidad: pedido === 'refinado' && i % 4 === 0 ? 3 : 1 + (i % 3), unidad: i % 2 ? 'lb' : 'kg', razon: `Alcanza para la semana (${i % 5 ? 'almuerzos' : 'desayunos'})` }),
    ),
    JSON.stringify({ op: 'consejo', texto: 'Compra temprano: a las 6 a. m. la cebolla llega más fresca y los puestos todavía tienen de todo. Empieza por los tubérculos, que pesan más, y deja las frutas y los huevos para el final para que no se maltraten. Si te sobra presupuesto, lleva fruta de temporada para toda la semana y pregunta por los productos que están en cosecha: suelen ser más baratos y duran más. Lleva bolsas de tela y efectivo en billetes pequeños.' }),
    JSON.stringify({ op: 'fin' }),
  ];
}

/** Entrega el texto en pedazos pequeños, como un modelo real: una línea puede llegar partida. */
export async function* pedirAlModelo(pedido: Pedido): AsyncGenerator<string> {
  const texto = lineas(pedido).join('\n') + '\n';
  const RAFAGA = 6; // la red entrega varios pedazos juntos: llegan en la misma tarea
  for (let i = 0, n = 0; i < texto.length; i += 22, n++) {
    yield texto.slice(i, i + 22);
    if (n % RAFAGA === RAFAGA - 1) await new Promise((r) => setTimeout(r, 120));
  }
}
