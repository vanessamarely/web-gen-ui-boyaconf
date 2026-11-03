// Inspector de tools WebMCP dentro de la demo (botón "Tools WebMCP" o ?inspector): lo mismo que muestra el panel
// Application → WebMCP de Chrome DevTools, pero visible sin flags: las tools registradas,
// su schema, "Run tool" para ejecutarlas a mano y la actividad de cada llamada.
import { mercado } from '../store';
import { esc } from '../esc';
import { onEvento, eventos } from './actividad';
import { ejecutar } from './tools';
import { getModelContext, type RegisteredTool } from './webmcp';

const ejemplo = (t: RegisteredTool) => {
  const out: Record<string, unknown> = {};
  for (const [k, p] of Object.entries(t.inputSchema?.properties ?? {})) {
    if (k === 'version') out[k] = mercado.version;
    else if (k === 'id') out[k] = [...mercado.items.keys()][0] ?? 'uchuva';
    else if (k === 'texto') out[k] = 'uchuva';
    else if (k === 'presupuesto') out[k] = 150000;
    else if (k === 'personas') out[k] = 4;
    else if (k === 'cantidad') out[k] = 1;
    else if (k === 'comprado') out[k] = true;
    else if (p.enum) out[k] = p.enum[0];
  }
  return JSON.stringify(out);
};

export function montarInspector(root: HTMLElement, toggle: HTMLButtonElement) {
  const { mc, native } = getModelContext();
  let tools: RegisteredTool[] = [];
  let sel = 'ver_mercado';

  const pintar = async () => {
    tools = await mc.getTools();
    const t = tools.find((x) => x.name === sel) ?? tools[0];
    root.innerHTML = `<div class="ins-head"><h2>Tools WebMCP <small>${tools.length} · ${native ? 'nativo' : 'polyfill'}</small></h2><button type="button" data-cerrar aria-label="Cerrar inspector">×</button></div>
      <ul class="ins-tools" role="listbox" aria-label="Tools registradas">${tools
        .map((x) => `<li role="option" aria-selected="${x.name === t?.name}" data-t="${x.name}"><code>${x.name}</code>${x.annotations?.readOnlyHint ? '<span class="tag ro">solo lectura</span>' : ''}${x.annotations?.consequentialHint ? '<span class="tag irr">irreversible</span>' : ''}</li>`)
        .join('')}</ul>
      ${t ? `<div class="ins-run"><p>${esc(t.description)}</p><label>Entrada (JSON)<textarea data-args rows="3" spellcheck="false">${esc(ejemplo(t))}</textarea></label><button type="button" data-run>Run tool</button><pre data-out aria-live="polite"></pre></div>` : ''}
      <h3>Tool activity</h3><ol class="ins-log" data-log></ol>`;
    pintarLog();
  };
  const pintarLog = () => {
    const log = root.querySelector('[data-log]');
    if (!log) return;
    log.innerHTML = eventos
      .slice(0, 8)
      .map((e) => `<li class="${e.estado}"><span class="st">${{ run: 'Running', ok: 'Completed', error: 'Error', cancel: 'Canceled' }[e.estado]}</span><code>${esc(e.tool)}</code><span class="io">${esc(JSON.stringify(e.args))}</span><span class="io out">${esc(e.detalle)}</span></li>`)
      .join('');
  };
  onEvento(() => !root.hidden && pintarLog());
  mc.addEventListener?.('toolchange', () => !root.hidden && void pintar());

  root.addEventListener('click', async (e) => {
    const el = e.target as HTMLElement;
    if (el.closest('[data-cerrar]')) return set(false);
    const li = el.closest<HTMLElement>('[data-t]');
    if (li) {
      sel = li.dataset.t!;
      return void pintar();
    }
    if (el.closest('[data-run]')) {
      const out = root.querySelector<HTMLElement>('[data-out]')!;
      try {
        const args = JSON.parse(root.querySelector<HTMLTextAreaElement>('[data-args]')!.value || '{}');
        out.textContent = '…';
        out.textContent = await ejecutar(sel, args);
      } catch (err) {
        out.textContent = `Error: ${(err as Error).message}`;
      }
    }
  });

  const set = (on = root.hidden) => {
    root.hidden = !on;
    toggle.setAttribute('aria-expanded', String(on));
    if (on) void pintar();
  };
  toggle.addEventListener('click', () => set());
  return set;
}
