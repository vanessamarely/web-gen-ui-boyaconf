// Reacciones con efecto: cuando la sala reacciona EN MASA, pasa algo en la pantalla.
//  🔥 fuego        → un tejedor cruza corriendo con un letrero
//  🤯 mente volada → ¡tejo! el disco revienta la mecha (el deporte nacional nació en Boyacá)
//  ❤️ me gusta     → el sol de Boyacá aparece y sonríe
// No cuesta tiempo de charla: se dispara solo. Umbral proporcional a la sala y un enfriamiento
// por efecto para no saturar. Respeta prefers-reduced-motion.
import { tejedorSVG } from '../shared/tejedor';
import type { Reaction } from '../shared/realtime';
import { solSVG, tejoSVG } from './landmarks';

const WINDOW_MS = 6000;
const COOLDOWN_MS = 25000;

/** Cuántas reacciones iguales en 6 s disparan el efecto: 4 como mínimo, ~6 % de la sala, 18 como máximo. */
export const burstThreshold = (players: number) => Math.min(18, Math.max(4, Math.ceil(players * 0.06)));

export function createBursts(getPlayers: () => number) {
  const hits: Record<string, number[]> = {};
  const lastFired: Record<string, number> = {};
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  function show(kind: Reaction) {
    const el = document.createElement('div');
    el.className = `burst burst-${kind}`;
    el.setAttribute('role', 'status');
    if (kind === 'fire')
      el.innerHTML = `<div class="burst-runner">${tejedorSVG({ ruana: 3, patron: 0, sombrero: 0, piel: 2, accesorio: 1, expresion: 2 }, 'Tejedor')}</div><p class="burst-sign">¡Boyacá está que arde! 🔥</p>`;
    if (kind === 'mind') el.innerHTML = `<div class="burst-tejo">${tejoSVG()}</div><p class="burst-sign">¡Mecha! Mente volada 🤯</p>`;
    if (kind === 'heart') el.innerHTML = `<div class="burst-sol">${solSVG()}</div><p class="burst-sign">¡Gracias, sumercé! ❤️</p>`;
    document.body.append(el);
    setTimeout(() => el.remove(), reduced() ? 2500 : 5200);
  }

  return {
    /** Llamar con cada reacción recibida. Devuelve true si disparó un efecto. */
    add(r: Reaction, now = Date.now()): boolean {
      if (r === 'ask') return false;
      const list = (hits[r] = (hits[r] ?? []).filter((t) => now - t < WINDOW_MS));
      list.push(now);
      if (list.length < burstThreshold(getPlayers()) || now - (lastFired[r] ?? 0) < COOLDOWN_MS) return false;
      lastFired[r] = now;
      hits[r] = [];
      show(r);
      return true;
    },
    /** Para ensayar desde la consola: window.deckBurst('fire') */
    show,
  };
}
