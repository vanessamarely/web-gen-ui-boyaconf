# Patterns (with code)

All examples come from the talk demo *Mercado campesino* (`demo/src`). APIs as of November 2026:
WebMCP is a proposed standard in the W3C Web Machine Learning Community Group, available in Chrome
through an Origin Trial and the `chrome://flags/#enable-webmcp-testing` flag; ship a polyfill or a
fallback path. `moveBefore()` ships in Chrome 133+. Prompt API with `responseConstraint` runs Gemini
Nano on supported devices.

## 1. One store, called by buttons AND tools

```ts
const mercado = createStore({ items: [], presupuesto: 120_000, version: 0 });

button.onclick = () => mercado.marcar(id, true);              // person

await document.modelContext.registerTool({                    // agent
  name: 'marcar_comprado',
  description: 'Marks a product on the list as already bought.',
  inputSchema: {
    type: 'object',
    properties: { id: { type: 'string' }, version: { type: 'integer', description: 'version returned by ver_mercado' } },
    required: ['id', 'version'],
  },
  async execute({ id, version }) {
    if (version !== mercado.version)
      return `Error: the list changed (current version ${mercado.version}). Call ver_mercado and retry.`;
    const r = mercado.marcar(id, true);
    return r.ok ? `${r.nombre}: bought.` : `Error: ${r.error}`;
  },
}, { signal: controller.signal });                            // abort() unregisters it
```

Descriptive errors let the model correct itself. Validate in code even if the schema says the same.

## 2. Data, not HTML

```ts
const LISTA_SCHEMA = {
  type: 'object',
  properties: {
    lineas: { type: 'array', items: { type: 'object', properties: {
      id: { type: 'string', enum: CATALOGO.map((p) => p.id) },   // closed catalog
      cantidad: { type: 'number' }, razon: { type: 'string' } } } },
    consejo: { type: 'string' },
  },
  required: ['lineas', 'consejo'],
};
const raw = await session.prompt(pedido, { responseConstraint: LISTA_SCHEMA });
```

## 3. Plan first, then patches

```jsonl
{"op":"plan","plan":[{"puesto":"tuberculos","items":3},{"puesto":"verduras","items":7}]}
{"op":"consejo","texto":"…"}
{"op":"add","item":{"id":"papa-pastusa","cantidad":2,"razon":"for the cuchuco"}}
{"op":"done","puesto":"tuberculos"}
{"op":"replace","id":"cubio","cantidad":1.5}
{"op":"remove","id":"lulo"}
```

```ts
let buf = '';
for await (const chunk of stream) {
  buf += chunk;
  let nl;
  while ((nl = buf.indexOf('\n')) >= 0) {           // each char read once
    mercado.aplicar(JSON.parse(buf.slice(0, nl)));   // O(1) per change
    buf = buf.slice(nl + 1);
  }
}
// the store batches notifications: at most one per key per animation frame
```

Reserve each section from the plan: `ul.style.minHeight = items * ROW_HEIGHT + 'px'` with skeleton
rows of the same height. When a real row arrives, **replace** a skeleton in place
(`skeleton.replaceWith(row)`) instead of inserting before it, or the skeletons shift (CLS).

## 4. Reconcile by id with moveBefore()

```ts
ids.forEach((id, i) => {
  let el = rows.get(id);
  if (!el) rows.set(id, (el = createRow(id)));          // only new items are created
  const ref = list.children[i] ?? null;
  if (el === ref) return;
  if (el.isConnected && 'moveBefore' in list) list.moveBefore(el, ref); // keeps focus & state
  else list.insertBefore(el, ref);
});
// per-item subscription: store.subscribe(`item:${id}`, () => patch(el)) — textContent only;
// never overwrite an <input> the person is focused on.
```

## 5. The person wins

```ts
case 'replace':
  if (item.editedByPerson) item.suggestion = change.cantidad;   // show it, don't apply it
  else item.cantidad = change.cantidad;
case 'remove':
  if (item.bought || item.note || item.editedByPerson) keep(item); // never silently delete
```

Take a snapshot before every agent change; push it to an undo history only if the tool succeeded.

## 6. Visible, accessible agent

- Activity feed: one keyed row per tool call (`running → ok/error/cancel`).
- `aria-busy="true"` on the section being generated; `false` on its `done` patch.
- One polite live region; queue announcements ≥ 1.5 s apart ("The agent added 3 products").
- Highlight changed rows with a short background animation inside `prefers-reduced-motion: no-preference`.
- Never move focus when the agent finishes; Cancel button wired to an `AbortController`.

## 7. Verify

- Record CLS (layout-shift without recent input), worst Event Timing duration (INP), nodes added
  (MutationObserver on the list) and "focus lost" (focused input no longer connected after a render)
  for the SAME scenario in naive and fixed versions. In the demo, refining the budget while typing a
  note: naive 71,765 nodes / 381 renders / note and check lost; fixed 147 nodes / 26 renders / intact.
- With dev servers that inject CSS from JS, the first paint shifts the whole body: link the stylesheet
  in `<head>` or you will measure your bundler, not your UI.
- Test tools natively in Chrome with WebMCP enabled (DevTools → Application → WebMCP shows tools,
  activity and "Run tool"), not only through a polyfill.
