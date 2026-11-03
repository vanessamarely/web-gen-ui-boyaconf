// Métricas del laboratorio, medidas en la página (las mismas que verás en DevTools):
//  · CLS: layout-shift sin input reciente · INP aprox.: peor interacción (Event Timing)
//  · nodos creados: MutationObserver sobre la lista · focos perdidos: inputs que se recrearon
//  · llamadas a tools del agente
export const metrics = { cls: 0, inp: 0, nodos: 0, renders: 0, focoPerdido: 0, tools: 0 };
export type Metrics = typeof metrics;

export function resetMetrics() {
  Object.assign(metrics, { cls: 0, inp: 0, nodos: 0, renders: 0, focoPerdido: 0, tools: 0 });
}

function observe(type: string, cb: (e: PerformanceEntry) => void, extra: Record<string, unknown> = {}) {
  try {
    if (!PerformanceObserver.supportedEntryTypes?.includes(type)) return;
    new PerformanceObserver((l) => l.getEntries().forEach(cb)).observe({ type, buffered: true, ...extra } as PerformanceObserverInit);
  } catch {
    /* noop */
  }
}

export function startMetrics(root: HTMLElement) {
  observe('layout-shift', (e) => {
    const s = e as PerformanceEntry & { value: number; hadRecentInput: boolean };
    if (!s.hadRecentInput) metrics.cls += s.value;
  });
  observe(
    'event',
    (e) => {
      const ev = e as PerformanceEntry & { interactionId?: number };
      if (ev.interactionId) metrics.inp = Math.max(metrics.inp, ev.duration);
    },
    { durationThreshold: 16 },
  );
  new MutationObserver((rs) => {
    for (const r of rs) r.addedNodes.forEach((n) => (metrics.nodos += n.nodeType === 1 ? 1 + (n as Element).getElementsByTagName('*').length : 0));
  }).observe(root, { childList: true, subtree: true });
}
