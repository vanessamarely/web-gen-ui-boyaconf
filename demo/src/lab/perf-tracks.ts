// Pistas propias en el panel Performance de Chrome DevTools (extensibilidad de User Timing):
// stream, cambios, render y tools aparecen en el grupo "Mercado campesino".
type Color = 'primary' | 'secondary' | 'tertiary' | 'error' | 'warning';
const GROUP = 'Mercado campesino';

export function trackSpan(track: string, name: string, start: number, end = performance.now(), color: Color = 'primary') {
  try {
    performance.measure(`${track}: ${name}`, { start, end, detail: { devtools: { dataType: 'track-entry', track, trackGroup: GROUP, color, tooltipText: name } } });
  } catch {
    /* navegadores sin `detail` */
  }
}

setInterval(() => {
  if (performance.getEntriesByType('measure').length > 2000) performance.clearMeasures();
}, 10_000);
