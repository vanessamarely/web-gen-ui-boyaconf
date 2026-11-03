// HUD: las métricas a la vista mientras el agente trabaja.
import { metrics } from './metrics';

export function mountHud(el: HTMLElement) {
  el.innerHTML = `<div class="hud" role="group" aria-label="Métricas en vivo">
    <span data-k="cls">CLS <b>0</b></span><span data-k="nodos">Nodos creados <b>0</b></span>
    <span data-k="focoPerdido">Focos perdidos <b>0</b></span><span data-k="inp">INP <b>0 ms</b></span><span data-k="tools">Tools <b>0</b></span></div>`;
  const fmt: Record<string, (v: number) => string> = {
    cls: (v) => v.toFixed(3),
    nodos: (v) => v.toLocaleString('es-CO'),
    focoPerdido: (v) => String(v),
    inp: (v) => `${Math.round(v)} ms`,
    tools: (v) => String(v),
  };
  const bad: Record<string, (v: number) => boolean> = { cls: (v) => v > 0.1, nodos: (v) => v > 1500, focoPerdido: (v) => v > 0, inp: (v) => v > 200, tools: () => false };
  setInterval(() => {
    el.querySelectorAll<HTMLElement>('[data-k]').forEach((s) => {
      const k = s.dataset.k as keyof typeof metrics;
      s.querySelector('b')!.textContent = fmt[k](metrics[k]);
      s.classList.toggle('bad', bad[k](metrics[k]));
    });
  }, 250);
}
