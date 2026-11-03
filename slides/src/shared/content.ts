// Fuente única del contenido "de bolsillo" de cada slide.
//  · El deck solo transmite { index, id }: el celular busca aquí el título y los puntos clave
//    (el documento en vivo pesa ~200 bytes y nadie descarga capturas).
//  · La consola de la presentadora lee `notes` (guion) y `time`.
//  · La memoria descargable usa `summary` de TODOS los slides, aunque alguien llegue tarde.
//  · El código de los slides vive aquí (CODE_*): el deck lo resalta, el celular y la memoria lo muestran.
import type { QuestionId } from './questions';

export type LiveKind = 'content' | 'join' | 'demo' | 'poll' | 'wall' | 'podium' | 'end';

export interface SlideContent {
  id: string;
  label: string;
  kind: LiveKind;
  /** Pregunta del podio (solo kind 'poll') */
  qid?: QuestionId;
  /** Título que ve el público en el celular y en la memoria */
  title: string;
  /** Sección (para agrupar la memoria) */
  section?: string;
  /** Lo más importante del slide: 1–4 frases cortas */
  summary: string[];
  /** Código de referencia (se muestra en el celular y entra a la memoria) */
  code?: { file: string; text: string };
  /** Guion de la presentadora (solo consola) */
  notes: string;
  /** Minuto aproximado en que empieza (charla de 30 min, ~8 de demo) */
  time: string;
  /** Este slide entra a la memoria descargable */
  inSummary?: boolean;
}

const S1 = '01 · ¿Qué es la web agéntica?';
const S2 = '02 · Renderizado: la urdimbre';
const S3 = '03 · Streaming: la trama';
const S4 = '04 · Reutilizar el DOM: no destejer';
const S5 = '05 · Estado: el patrón';

export const CODE_WEBMCP = `await document.modelContext.registerTool({
  name: 'agregar_producto',
  description: 'Agrega un producto del catálogo a la lista del mercado.',
  inputSchema: {
    type: 'object',
    properties: {
      id:       { type: 'string', description: 'id del catálogo' },
      cantidad: { type: 'number', minimum: 0.25, description: 'kg o unidades' },
    },
    required: ['id', 'cantidad'],
  },
  async execute({ id, cantidad }) {
    const r = mercado.agregar(id, cantidad);   // la MISMA lógica que el botón
    return r.ok ? \`Agregado: \${r.nombre}\` : \`Error: \${r.error}\`;
  },
});`;

export const CODE_CONTRACT = `// El modelo devuelve DATOS de un catálogo cerrado, no HTML
const MERCADO_SCHEMA = {
  type: 'object',
  properties: {
    plan:    { type: 'array' },   // 1.º: qué secciones y cuántos ítems
    puestos: { type: 'array', items: {
      properties: {
        id:    { enum: ['frutas', 'tuberculos', 'verduras', 'lacteos'] },
        items: { type: 'array', maxItems: 8 },
      } } },
    menu:    { type: 'array' },   // al final: lo que aún no se ve
  },
};

session.promptStreaming(pedido, { responseConstraint: MERCADO_SCHEMA });`;

export const CODE_PLAN = `// 1.º el plan: pocos tokens, llega casi de inmediato
{ "plan": [
  { "id": "frutas",     "tipo": "puesto",  "items": 5 },
  { "id": "tuberculos", "tipo": "puesto",  "items": 4 },
  { "id": "total",      "tipo": "resumen" }
] }

// La UI reserva cada sección con su altura final
for (const s of plan)
  slots.set(s.id, reservar(s.tipo, s.items));
// …y después el contenido llena los slots, sin saltos`;

export const CODE_PATCHES = `// El stream trae cambios pequeños, no el documento entero
{"op":"add",     "path":"/puestos/frutas", "value":{"id":"uchuva","kg":1}}
{"op":"replace", "path":"/items/uchuva/kg", "value":2}
{"op":"done",    "path":"/puestos/frutas"}

for await (const cambio of leerCambios(stream)) {
  mercado.aplicar(cambio);                 // O(1) por cambio
  if (!raf) raf = requestAnimationFrame(pintar);  // 1 render por frame
}`;

export const CODE_RECONCILE = `items.forEach((it, i) => {
  let el = nodos.get(it.id);
  if (!el) nodos.set(it.id, (el = crearFila(it)));  // solo lo nuevo
  parchar(el, it);                                  // textContent, no innerHTML
  const ref = lista.children[i] ?? null;
  if (el === ref) return;
  if (el.isConnected && 'moveBefore' in lista)
    lista.moveBefore(el, ref);    // mueve sin perder foco, scroll ni estado
  else lista.insertBefore(el, ref);
});`;

export const CODE_STATE = `// Un solo estado; la persona y el agente llaman la MISMA lógica
const mercado = crearStore({ items: [], presupuesto: 120_000, version: 0 });

boton.onclick = () => mercado.marcar(id, { por: 'persona' });

document.modelContext.registerTool({
  name: 'marcar_comprado', /* …schema… */
  execute: ({ id, version }) =>
    mercado.marcar(id, { por: 'agente', version }),  // rechaza versiones viejas
});

// Cada fila se suscribe SOLO a su ítem
mercado.suscribir(id, (item) => pintarFila(item));`;

export const SLIDES: SlideContent[] = [
  {
    id: 'portada',
    label: 'Portada',
    kind: 'content',
    title: 'UI generativa sin fricción',
    summary: [
      'La web agéntica ya no es solo páginas que lees: agentes que entienden tu sitio, lo usan con tools (WebMCP) y te generan la interfaz.',
      'Esa UI generativa crea experiencias personalizadas, pero trae retos de renderizado, streaming, DOM y estado.',
    ],
    notes: '¡Buenas, sumercé! Bienvenida a BoyaConf. "Todo el mundo habla de la web agéntica y casi nadie sabe qué significa. Hoy la aterrizamos y la tejemos sin fricción."',
    time: '0:00',
    inSummary: true,
  },
  {
    id: 'unete',
    label: 'Únete',
    kind: 'join',
    title: 'Únete a la charla',
    summary: ['Escanea el QR: elige tu apodo, crea tu tejedor, toma notas y responde 3 preguntas por el podio.'],
    notes: 'Deja el QR 40 segundos. "Si entran ahora, suman +100 por llegar a tiempo." Muestra el contador de la sala.',
    time: '0:40',
  },
  {
    id: 'bio',
    label: 'Quién soy',
    kind: 'content',
    title: 'Vanessa Aristizabal',
    summary: ['Software Engineer · Google Developer Expert en Web Technologies y Angular · GitHub Star.'],
    notes: 'Breve: 20 segundos.',
    time: '1:20',
  },
  {
    id: 'sec-agentica',
    label: '01 ¿Web agéntica?',
    kind: 'content',
    section: S1,
    title: '¿Qué es la web agéntica?',
    summary: ['Una web en la que un agente de IA puede entender, usar y adaptar los sitios en nombre de una persona, y la persona sigue en control.'],
    notes: 'Pregunta a la sala: "¿Quién podría explicarle a su mamá qué es la web agéntica?" Pocas manos. "Al final de este capítulo, todos."',
    time: '1:50',
  },
  {
    id: 'tres-capas',
    label: 'Lee · usa · genera',
    kind: 'content',
    section: S1,
    title: 'Tres capas: el agente lee, usa y genera',
    summary: [
      'Lee: entiende tu sitio. HTML semántico y accesible: lo que sirve a un lector de pantalla, sirve a un agente.',
      'Usa: actúa en tu sitio con tools que tú defines (WebMCP), en vez de adivinar botones y hacer clic.',
      'Genera: arma para la persona una interfaz a la medida de su intención: eso es la UI generativa.',
      'En las tres capas la persona decide: ve lo que pasa, confirma lo importante y puede deshacer.',
    ],
    notes: 'El diagrama de las 3 capas es la idea que se tienen que llevar. Ejemplo en voz alta: "Hazme el mercado de la semana con 120 mil": leer el catálogo, usar las tools, generar la lista por puestos.',
    time: '2:05',
    inSummary: true,
  },
  {
    id: 'novedades',
    label: 'Lo nuevo',
    kind: 'content',
    section: S1,
    title: 'Lo nuevo en la web agéntica',
    summary: [
      'WebMCP: tu página registra tools (nombre, descripción, JSON Schema) que un agente puede llamar. Estándar propuesto en el W3C, en Origin Trial en Chrome.',
      'IA en el navegador: Prompt API con Gemini Nano, con salida estructurada (responseConstraint): sin servidor y con los datos en el equipo.',
      'Agentes en el navegador y extensiones que pueden usar las tools de tu página, con la sesión y los permisos de la persona.',
    ],
    notes: 'Sin humo: dí qué es estable y qué es experimental. WebMCP está en Origin Trial; Prompt API ya está en Chrome estable para extensiones y web en equipos compatibles.',
    time: '3:15',
    inSummary: true,
  },
  {
    id: 'webmcp',
    label: 'Una tool en tu página',
    kind: 'content',
    section: S1,
    title: 'WebMCP: una tool en tu página',
    summary: [
      'document.modelContext.registerTool() expone una acción con nombre, descripción y JSON Schema.',
      'execute llama la MISMA lógica que el botón: la persona y el agente comparten estado.',
      'Lo que la tool devuelve vuelve al modelo; lo que cambia, la UI lo muestra.',
    ],
    code: { file: 'demo/src/agente/tools.ts', text: CODE_WEBMCP },
    notes: 'No es un MCP en un servidor aparte: vive en la pestaña que la persona ya tiene abierta. Ojo: también existe la versión declarativa con <form toolname>.',
    time: '4:15',
    inSummary: true,
  },
  {
    id: 'cara',
    label: 'La cara de la web agéntica',
    kind: 'content',
    section: S1,
    title: 'La UI generativa es la cara de la web agéntica',
    summary: [
      'Intención → agente → tools → estado → UI generada → persona: lo único que la persona ve es la última parte.',
      'Si esa UI salta, se traba o pierde lo que marcaste, todo lo agéntico se siente roto.',
      'Sin fricción para la persona (rápida, fluida, accesible) y para el agente (tools claras, estado consistente).',
    ],
    notes: 'Puente al resto de la charla: "Ahora, cómo tejemos esa cara sin fricción: renderizado, streaming, DOM y estado."',
    time: '5:15',
    inSummary: true,
  },
  {
    id: 'q1',
    label: 'Pregunta 1 · Web agéntica',
    kind: 'poll',
    qid: 'q1',
    section: S1,
    title: 'Pregunta 1 · Web agéntica',
    summary: ['WebMCP permite que tu página exponga tools con nombre, descripción y JSON Schema que un agente llama sin adivinar clics.'],
    notes: 'Primera pregunta. 30–40 segundos. Revela con V.',
    time: '6:00',
    inSummary: true,
  },
  {
    id: 'sec-urdimbre',
    label: '02 Renderizado',
    kind: 'content',
    section: S2,
    title: 'Renderizado: la urdimbre',
    summary: ['En el telar, la urdimbre son los hilos fijos: tu UI pone la estructura y el espacio; el modelo solo trae datos.'],
    notes: 'Transición.',
    time: '7:00',
  },
  {
    id: 'contrato',
    label: 'Datos, no HTML',
    kind: 'content',
    section: S2,
    title: 'Datos, no HTML: catálogo + schema',
    summary: [
      'El modelo elige componentes de un catálogo cerrado y devuelve JSON validado por un schema.',
      'Ganas seguridad (nada de HTML arbitrario), accesibilidad por diseño y componentes que conoces y puedes medir.',
      'El orden del schema es el orden en que aparece la UI: lo importante primero.',
    ],
    code: { file: 'demo/src/genui/schema.ts', text: CODE_CONTRACT },
    notes: 'Un agente que escribe HTML libre es un agente que puede romper tu diseño y tu accesibilidad.',
    time: '7:15',
    inSummary: true,
  },
  {
    id: 'plan',
    label: 'Primero el plan',
    kind: 'content',
    section: S2,
    title: 'Primero el plan, luego el contenido',
    summary: [
      'El modelo empieza con un plan corto: qué secciones y cuántos ítems. Llega en pocos tokens.',
      'La UI reserva cada sección con su altura final: la persona ve la estructura de inmediato y nada salta (CLS ≈ 0).',
      'El contenido llena los espacios a medida que llega; si el plan cambia, solo se ajusta esa sección.',
    ],
    code: { file: 'demo/src/genui/plan.ts', text: CODE_PLAN },
    notes: 'Es como montar la urdimbre antes de tejer. En la demo: los cuatro puestos aparecen como esqueletos en ~300 ms.',
    time: '8:15',
    inSummary: true,
  },
  {
    id: 'sec-trama',
    label: '03 Streaming',
    kind: 'content',
    section: S3,
    title: 'Streaming: la trama',
    summary: ['La trama son los hilos que van llegando: mostrar valor desde el primer token sin trabar el hilo principal.'],
    notes: 'Transición. "El hilo principal del navegador es literalmente un hilo: si está ocupado, nadie atiende tu clic."',
    time: '9:15',
  },
  {
    id: 'parches',
    label: 'Stream de cambios',
    kind: 'content',
    section: S3,
    title: 'Envía cambios, no el documento entero',
    summary: [
      'En vez de reenviar y releer todo el JSON en cada token, el stream trae cambios pequeños: agregar, reemplazar, terminar.',
      'Cada cambio se aplica en O(1) sobre el estado, identificado por id.',
      'Se pinta una vez por frame (requestAnimationFrame): muchos tokens por segundo no son muchos renders.',
    ],
    code: { file: 'demo/src/genui/stream.ts', text: CODE_PATCHES },
    notes: 'Formato estilo JSON Patch con paths por id. El "done" de cada sección permite quitar el aria-busy de esa sección.',
    time: '9:30',
    inSummary: true,
  },
  {
    id: 'progreso',
    label: 'El agente a la vista',
    kind: 'content',
    section: S3,
    title: 'El agente trabaja a la vista',
    summary: [
      'Cada llamada a una tool es un evento visible: "Buscando en el puesto de frutas…", "Agregué 2 kg de papa".',
      'La sección que el agente está cambiando se marca (aria-busy); el resto sigue usable.',
      'Si el agente tarda, la persona puede seguir trabajando o cancelarlo (AbortSignal).',
    ],
    notes: 'Fricción = no saber qué está pasando. Un agente que trabaja en silencio y de golpe cambia todo se siente como un fantasma.',
    time: '10:30',
    inSummary: true,
  },
  {
    id: 'sec-destejer',
    label: '04 Reutilizar el DOM',
    kind: 'content',
    section: S4,
    title: 'Reutilizar el DOM: no destejer',
    summary: ['Ninguna tejedora desteje la ruana para cambiar un color: actualiza y mueve lo que ya existe.'],
    notes: 'Transición.',
    time: '11:30',
  },
  {
    id: 'reconciliar',
    label: 'Refinar sin regenerar',
    kind: 'content',
    section: S4,
    title: 'Refinar sin regenerar',
    summary: [
      '"Súbele el presupuesto" no es una página nueva: es un cambio sobre lo que ya existe.',
      'Reconcilia por id estable: reutiliza el nodo, parcha solo el texto que cambió y crea solo lo nuevo.',
      'moveBefore() (Chrome 133+) mueve un nodo sin perder foco, scroll ni estado; insertBefore como respaldo.',
    ],
    code: { file: 'demo/src/genui/reconciliar.ts', text: CODE_RECONCILE },
    notes: 'Pide al modelo que conserve los ids entre versiones; si no, tu código los asigna por producto del catálogo.',
    time: '11:45',
    inSummary: true,
  },
  {
    id: 'foco',
    label: 'Tú no pierdes nada',
    kind: 'content',
    section: S4,
    title: 'El agente cambia algo y tú no pierdes nada',
    summary: [
      'Ingenuo (innerHTML de toda la lista): miles de nodos nuevos, se pierden el foco, el scroll, lo que estabas escribiendo y lo marcado.',
      'Sin fricción (claves estables): solo cambian las filas afectadas; la persona sigue donde estaba.',
      'Lo mismo ayuda al lector de pantalla: el foco no salta y no se vuelve a leer toda la página.',
    ],
    notes: 'En la demo lo verán: la persona escribe una nota en la uchuva mientras el agente reorganiza la lista.',
    time: '12:45',
    inSummary: true,
  },
  {
    id: 'q2',
    label: 'Pregunta 2 · DOM',
    kind: 'poll',
    qid: 'q2',
    section: S4,
    title: 'Pregunta 2 · Reutilizar el DOM',
    summary: ['Al refinar, reconcilia por id estable y aplica solo los cambios: así no se pierde lo que la persona ya marcó.'],
    notes: 'Segunda pregunta. Revela con V.',
    time: '13:30',
    inSummary: true,
  },
  {
    id: 'sec-patron',
    label: '05 Estado',
    kind: 'content',
    section: S5,
    title: 'Estado: el patrón',
    summary: ['El patrón de la ruana no vive en un hilo: vive fuera. El estado vive fuera del render y lo comparten la persona y el agente.'],
    notes: 'Transición.',
    time: '14:30',
  },
  {
    id: 'un-estado',
    label: 'Un solo estado',
    kind: 'content',
    section: S5,
    title: 'Un solo estado para la persona y el agente',
    summary: [
      'El botón y la tool de WebMCP llaman la misma lógica sobre el mismo store: no hay dos verdades.',
      'Cada componente se suscribe solo a su parte: marcar la uchuva repinta una fila, no la página.',
      'Lo derivado (total, lo que falta, el menú) lo calcula el código, no el modelo.',
    ],
    code: { file: 'demo/src/mercado/store.ts', text: CODE_STATE },
    notes: 'Ventaja extra: los tests prueban el store y con eso prueban la UI y las tools.',
    time: '14:45',
    inSummary: true,
  },
  {
    id: 'conflictos',
    label: 'Lo de la persona gana',
    kind: 'content',
    section: S5,
    title: 'Cuando los dos tocan lo mismo: lo de la persona gana',
    summary: [
      'Separa el estado: lo generado (sugerencias del agente), lo de la persona (marcado, notas, cantidades editadas) y lo derivado.',
      'Las tools reciben la versión del estado que vio el agente: si cambió, responden "vuelve a leer" en lugar de pisar.',
      'Una regeneración nunca borra lo que la persona hizo a mano.',
    ],
    notes: 'Ejemplo: la persona cambió la papa a 3 kg; el agente propone 2 kg. Se queda en 3 y el agente lo ve en la respuesta de la tool.',
    time: '15:45',
    inSummary: true,
  },
  {
    id: 'accesible',
    label: 'Accesible y reversible',
    kind: 'content',
    section: S5,
    title: 'El agente avisa y todo se puede deshacer',
    summary: [
      'Anuncia lo que hizo el agente en una región aria-live, corto y espaciado: "Agregué 3 productos al puesto de verduras".',
      'Resalta lo que cambió (y respeta prefers-reduced-motion); el foco nunca se mueve solo.',
      'Historial de cambios con deshacer; confirmación en pantalla para lo irreversible (pagar, enviar).',
    ],
    notes: 'La confianza es parte de "sin fricción": si no sé qué hizo el agente, no lo vuelvo a usar.',
    time: '16:30',
    inSummary: true,
  },
  {
    id: 'demo',
    label: 'Demo · Mercado campesino',
    kind: 'demo',
    title: 'Demo: Mercado campesino',
    summary: [
      'Un planificador de la plaza de mercado: "mercado para 4 personas con 120 mil" y un agente lo arma por puestos con tools WebMCP.',
      'La lista se genera en streaming mientras la persona marca, edita y escribe notas.',
      'Interruptor ingenuo ↔ sin fricción para ver la diferencia en vivo. Productos y precios ficticios.',
    ],
    notes: 'DEMO ~8 min con los clips. Si hay buena red, abre la demo en vivo con ?modo=ingenuo y luego ?modo=fluido.',
    time: '17:15',
    inSummary: true,
  },
  {
    id: 'demo-arma',
    label: 'Demo 1 · El agente arma el mercado',
    kind: 'demo',
    title: 'Demo 1 · El agente arma el mercado',
    summary: ['Primero el plan (los puestos aparecen reservados), luego los cambios llegan en streaming: CLS 0,004 mientras se genera, y cada tool del agente se ve en el panel de actividad.'],
    notes: 'Señala el panel de actividad del agente y que la estructura apareció antes que el contenido.',
    time: '17:45',
    inSummary: true,
  },
  {
    id: 'demo-ingenuo',
    label: 'Demo 2 · Ingenuo',
    kind: 'demo',
    title: 'Demo 2 · Ingenuo: cada acción re-pinta todo',
    summary: ['Mientras marcas y escribes una nota, el agente "sube el presupuesto": con innerHTML (381 renders, 71.765 nodos creados) se pierden la nota, el foco y lo marcado.'],
    notes: 'Mira el contador de nodos creados y el CLS en el HUD.',
    time: '19:30',
    inSummary: true,
  },
  {
    id: 'demo-fluido',
    label: 'Demo 3 · Sin fricción',
    kind: 'demo',
    title: 'Demo 3 · Sin fricción: refinar sin perder nada',
    summary: ['Mismo pedido con 13 cambios por id, moveBefore() y un solo estado: 26 renders y 147 nodos; tu nota, tu foco y lo marcado siguen ahí.'],
    notes: 'Compara los números del HUD con el clip anterior.',
    time: '21:15',
    inSummary: true,
  },
  {
    id: 'demo-devtools',
    label: 'Demo 4 · Las tools por dentro',
    kind: 'demo',
    title: 'Demo 4 · Las tools por dentro',
    summary: ['Inspector de tools (como Application → WebMCP en DevTools): 8 tools, cada llamada con su entrada y salida, y "Run tool" para probarlas sin agente. Una versión vieja responde "vuelve a leer" y el reintento funciona.'],
    notes: 'En vivo con Chrome y el flag #enable-webmcp-testing también puedes abrir DevTools → Application → WebMCP. El clip usa el inspector de la demo, que funciona en cualquier navegador.',
    time: '23:00',
    inSummary: true,
  },
  {
    id: 'medir',
    label: '¿Cómo sé que no hay fricción?',
    kind: 'content',
    title: '¿Cómo sé que no hay fricción?',
    summary: [
      'Para la persona: INP ≤ 200 ms (responde), CLS ≤ 0,1 (no salta) y frames largos (LoAF) mientras se genera.',
      'Para el agente: cuántas llamadas y tokens necesita por intención, y cuántas fallan.',
      'Prueba con un lector de pantalla mientras el agente trabaja: ¿se entiende qué pasó?',
    ],
    notes: 'Un solo slide de medición: la charla es de construir. Las métricas de la persona y las del agente juntas.',
    time: '24:45',
    inSummary: true,
  },
  {
    id: 'q3',
    label: 'Pregunta 3 · Estado',
    kind: 'poll',
    qid: 'q3',
    section: S5,
    title: 'Pregunta 3 · Estado',
    summary: ['El agente (con una tool) y la persona (con un botón) llaman la misma lógica sobre un solo estado, con versión; la UI se actualiza por partes.'],
    notes: 'Última pregunta: define el podio. Revela con V.',
    time: '25:40',
    inSummary: true,
  },
  {
    id: 'muro',
    label: 'Muro de tejedores',
    kind: 'wall',
    title: 'El telar de la sala',
    summary: ['Cada asistente creó su tejedor con el hilo (la práctica) que se lleva a su proyecto.'],
    notes: 'Muestra el muro 20 segundos. Lee 2 o 3 hilos en voz alta. Clic en un tejedor para ocultarlo si hace falta.',
    time: '26:30',
  },
  {
    id: 'checklist',
    label: 'Para llevar',
    kind: 'content',
    title: '10 puntadas para una UI generativa sin fricción',
    summary: ['Diez reglas para que tu web agéntica tenga una cara rápida, fluida y accesible (están completas en tu memoria).'],
    notes: 'Lee 3 o 4 en voz alta. "Están todas en su memoria descargable y en la guía del repo para su agente de código."',
    time: '27:00',
    inSummary: true,
  },
  {
    id: 'podio',
    label: 'Podio',
    kind: 'podium',
    title: 'Podio',
    summary: ['Ganan quienes acertaron más rápido las 3 preguntas (para entrar al podio hay que acertar al menos una). Bonos: +100 por llegar a tiempo, +100 por publicar tu tejedor, +100 por una pregunta sobre el tema y +10 por reacción (máximo +100).'],
    notes: 'El primer lugar muestra su código de 4 letras en el celular para reclamar el premio.',
    time: '27:45',
  },
  {
    id: 'gracias',
    label: 'Gracias',
    kind: 'end',
    title: '¡Gracias, sumercé!',
    summary: ['Repo con el deck, la demo Mercado campesino y una guía para tu agente de código: pídele que vuelva agéntica y sin fricción tu UI generativa. Descarga tu memoria (PDF o HTML) con tus notas y tu tejedor.'],
    notes: '"Sumercé" es el trato cariñoso boyacense. Invita a descargar la memoria y a probar la demo en su laptop.',
    time: '28:45',
  },
];

export const SLIDE_BY_ID = new Map(SLIDES.map((s) => [s.id, s]));

/** Las 10 puntadas (slide de cierre, memoria y guía del repo). */
export const CHECKLIST = [
  ['Lee, usa, genera', 'piensa tu sitio en las tres capas de la web agéntica.'],
  ['Una tool por intención', 'WebMCP con nombre, descripción y schema; la misma lógica que tus botones.'],
  ['Datos, no HTML', 'catálogo de componentes + JSON Schema.'],
  ['Primero el plan', 'reserva cada sección con su altura final antes del contenido.'],
  ['Cambios, no documentos', 'el stream trae agregar/reemplazar por id; un render por frame.'],
  ['El agente a la vista', 'progreso por tool, aria-busy por sección y cancelar con AbortSignal.'],
  ['Refina sin regenerar', 'reconcilia por id y mueve con moveBefore(); nada de innerHTML.'],
  ['Un solo estado', 'persona y agente comparten store, con versión y suscripciones finas.'],
  ['Lo de la persona gana', 'una regeneración nunca borra lo que alguien hizo a mano.'],
  ['Avisa, deshaz y mide', 'aria-live, historial con deshacer, INP/CLS y llamadas por intención.'],
] as const;
