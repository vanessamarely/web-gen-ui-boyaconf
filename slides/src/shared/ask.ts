// Preguntas del público: solo sobre el tema de la charla (web agéntica, WebMCP, UI generativa,
// renderizado, streaming, DOM, estado, accesibilidad, la demo, IA en el navegador). Filtro en el celular, antes de enviar: no llega texto fuera de tema.
const ON_TOPIC =
  /(mcp|webmcp|agent|agént|agentic|\btools?\b|herramienta|model ?context|registertool|modelcontext|toolname|declarativ|imperativ|schema|json|formulario|\bform|\bapis?\b|navegador|browser|chrome|origin trial|\bflag|gemini|\bnano\b|prompt|\bllm|modelo|\bia\b|\bai\b|inteligencia artificial|\bweb\b|sitio|página|pagina|frontend|angular|react|\bvue\b|javascript|typescript|\bdemo\b|tejedor|mercado|generativ|genui|\bui\b|interfaz|render|stream|parche|patch|innerhtml|movebefore|reconcili|\bestado\b|\bstate\b|store|signal|layout|\bcls\b|\binp\b|loaf|rendimiento|performance|fluid|fricci|esqueleto|skeleton|aria|lector de pantalla|deshacer|undo|reserv|\bclics?\b|click|\bdom\b|scraping|segur|injection|inyecci|confirmaci|consequential|untrusted|readonly|permis|iframe|origen|servidor|server|cliente|client|backend|stdio|\bhttp|extensi|accesib|\bvoz\b|\bevals?\b|testing|debug|devtools|token|abortsignal|\bsignal\b)/i;
const OFF_TOPIC = /(put[ao]|mierd|pend[ae]j|verga|coñ|carajo|fuck|shit|sex|nazi|cojud|huev[oó]n)/i;

/** ¿La pregunta es sobre la charla? (mínimo 8 caracteres, sin groserías, con algún término del tema) */
export const isOnTopic = (text: string) => text.trim().length >= 8 && !OFF_TOPIC.test(text) && ON_TOPIC.test(text);
