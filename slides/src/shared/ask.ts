// Preguntas del público: solo sobre el tema de la charla (harness, web agéntica, WebMCP, UI generativa,
// renderizado, streaming, DOM, estado, accesibilidad, la demo, IA en el navegador). Filtro en el celular, antes de enviar: no llega texto fuera de tema.
const ON_TOPIC =
  /(no entend|no entiendo|no me qued|expl[ií]ca|significa|mcp|webmcp|agent|agént|agentic|\btools?\b|herramienta|model ?context|registertool|modelcontext|toolname|declarativ|imperativ|schema|json|formulario|\bform|\bapis?\b|navegador|browser|chrome|origin trial|\bflag|gemini|\bnano\b|prompt|\bllm|modelo|\bia\b|\bai\b|inteligencia artificial|\bweb\b|sitio|página|pagina|frontend|angular|react|\bvue\b|javascript|typescript|\bdemo\b|tejedor|mercado|harness|arn[eé]s|agents\.md|sensor|presupuesto|playwright|lighthouse|\bci\b|prueba|test|generativ|genui|\bui\b|interfaz|render|stream|parche|patch|innerhtml|movebefore|reconcili|\bestado\b|\bstate\b|store|signal|layout|\bcls\b|\binp\b|loaf|rendimiento|performance|fluid|fricci|esqueleto|skeleton|aria|lector de pantalla|deshacer|undo|reserv|\bclics?\b|click|\bdom\b|scraping|segur|injection|inyecci|confirmaci|consequential|untrusted|readonly|permis|iframe|origen|servidor|server|cliente|client|backend|stdio|\bhttp|extensi|accesib|\bvoz\b|\bevals?\b|testing|debug|devtools|token|abortsignal|\bsignal\b|\bnodos?\b|\blista\b|\bfilas?\b|\bkey\b|\btrack\b|\bid\b|framework|svelte|emoji|imagen|\balt\b|lector|\bnota\b|c[oó]digo|error|m[eé]trica|\blcp\b|core web|vitals|instacart|chatgpt|a2ui|scorer|guidance|cursor|claude|codex|congel|salta|requestanimationframe|\braf\b)/i;
const OFF_TOPIC = /(put[ao]|mierd|pend[ae]j|verga|coñ|carajo|fuck|shit|sex|nazi|cojud|huev[oó]n)/i;

/** ¿La pregunta es sobre la charla? (mínimo 8 caracteres, sin groserías, con algún término del tema) */
export const isOnTopic = (text: string) => text.trim().length >= 8 && !OFF_TOPIC.test(text) && ON_TOPIC.test(text);

const VACIAS = new Set('para como cual cuales donde cuando porque pero esta este esto esa ese eso estas estos las los una uno unos unas del que qué por con sin sobre entre mas más muy hay ser son fue era tiene tienen hace hacen puede pueden sirve sirven significa explica explicas entendi entendí entiendo parte charla web'.split(' '));
const normalizar = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const palabras = (t: string) => normalizar(t).split(/[^a-z0-9]+/).filter((p) => p.length >= 3 && !VACIAS.has(p));

export interface SlideConsulta { id: string; kind: string; title: string; summary: string[] }

/** Busca en el contenido de la charla: funciona en el celular, sin internet y sin un modelo de IA. */
export function respuestaDeLaCharla<T extends SlideConsulta>(pregunta: string, slides: readonly T[]): T | null {
  const buscadas = new Set(palabras(pregunta));
  let mejor: T | null = null;
  let puntos = 0;
  for (const s of slides) {
    if (s.kind !== 'content' && s.kind !== 'demo') continue;
    const titulo = new Set(palabras(s.title));
    const resumen = new Set(palabras(s.summary.join(' ')));
    let p = 0;
    for (const b of buscadas) p += titulo.has(b) ? 3 : resumen.has(b) ? 1 : 0;
    if (p > puntos) [mejor, puntos] = [s, p];
  }
  return puntos >= 2 ? mejor : null;
}
