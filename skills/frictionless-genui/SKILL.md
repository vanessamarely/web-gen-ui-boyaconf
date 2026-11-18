---
name: frictionless-genui
description: Make a web app's generative UI agent-ready and frictionless. Use when building or reviewing UI that an AI model or agent generates or edits (streaming lists, plans, dashboards, assistants), when adding WebMCP tools (document.modelContext.registerTool) to a page, when a generated UI jumps (CLS), freezes while streaming, loses focus/scroll/user input on regeneration, or when a person and an agent edit the same state. Covers the three layers of the agentic web (read, use, generate), rendering with a component catalog + JSON Schema, plan-first streaming, patch streams, DOM reconciliation with moveBefore(), shared state with versions, accessibility and undo.
---

# Frictionless generative UI for the agentic web

> Start from the ready-to-copy harness in [`base/`](../../base): `AGENTS.md` (instructions), `harness/presupuestos.json` (budgets) and `harness/check.mjs` (Playwright browser tests). Work is done when the tests pass, not when the code compiles.

The agentic web has three layers: an agent **reads** your site (semantic, accessible HTML), **uses** it through tools you define (WebMCP), and **generates** an interface for the person (generative UI). The generated UI is the only part people see: if it jumps, freezes or forgets what they did, the whole agentic experience feels broken. Make it frictionless for the person (fast, fluid, accessible) and for the agent (clear tools, one consistent state, errors it can recover from).

## Workflow

1. **Inventory intents.** List what people come to do (e.g. "build my weekly shopping list", "raise the budget", "mark as bought"). One tool per intent, not per button.
2. **Audit the read layer.** Landmarks, headings, labels, buttons that are buttons. Fix this first: it serves screen readers and agents alike.
3. **Find the single source of truth.** Locate (or create) one store that both UI handlers and tools call. If tools and buttons call different code, unify them before anything else.
4. **Register WebMCP tools** that call that store (see `references/patterns.md`). Read-only tools get `readOnlyHint`; irreversible ones get `consequentialHint` plus an on-screen confirmation; tools that change shared lists accept the `version` the agent last read.
5. **Make the model return data, not HTML.** A closed component/product catalog plus a JSON Schema (`responseConstraint` in the Prompt API, or the equivalent in your provider). Validate again in code.
6. **Stream plan-first.** The first thing the model emits is a short plan (which sections, how many items). Reserve each section at its final height before content arrives.
7. **Stream patches, not documents.** Emit small id-based changes (`add`, `replace`, `remove`, `done`). Apply each once; notify the UI at most once per animation frame.
8. **Reconcile, never re-create.** Keyed rows by stable id, patch text with `textContent`, move nodes with `moveBefore()` (fallback `insertBefore`). Never `innerHTML` a live list.
9. **Protect what the person did.** Split state into generated / person-owned / derived. Regenerations never overwrite person-owned fields (checked, notes, hand-edited quantities); show the agent's suggestion next to them instead.
10. **Make the agent visible and reversible.** Activity feed per tool call, `aria-busy` per section, short spaced `aria-live` announcements, cancel (AbortSignal) and undo for every agent change.
11. **Measure** before and after (see "Report").

## 10 rules

1. Read, use, generate: design the page for all three layers.
2. One WebMCP tool per intent, calling the same logic as your buttons.
3. Data, not HTML: catalog + JSON Schema, validated in code.
4. Plan first: reserve every section at its final size before content.
5. Patches, not documents: id-based changes, one render per frame.
6. The agent works in plain sight: progress per tool, `aria-busy` per section, cancel.
7. Refine, don't regenerate: reconcile by id; `moveBefore()`; no `innerHTML` on live UI.
8. One state with a version: tools reject stale versions with "re-read and retry".
9. The person wins: regeneration never erases person-owned state.
10. Announce, undo, measure: `aria-live`, history with undo, INP/CLS/LoAF and calls per intent.

## Anti-patterns

- Re-parsing the whole JSON buffer on every token and re-rendering the whole view.
- Late banners or tips inserted *above* content that is already being read.
- A separate "agent copy" of the state, or tools that click DOM buttons.
- Regenerating the full list for a refinement ("raise the budget"), wiping checks and notes.
- Moving focus programmatically when the agent finishes, or announcing every token.
- Tool descriptions that describe the UI ("clicks the green button") instead of the intent.
- Irreversible tools without `consequentialHint` and on-screen confirmation.

## Report format

```
## Frictionless generative UI report
Intents → tools: <table: intent | tool | readOnly/consequential | calls same logic as UI? (y/n)>
State: single store? version checks? person-owned fields protected? undo?
Streaming: plan-first? patch stream? renders per second during generation?
Metrics (before → after, same scenario, same machine):
  CLS during generation · INP of the busiest interaction · nodes created on refine ·
  focus lost on refine · tool calls per intent
Accessibility: aria-busy per section, aria-live announcements, focus never moved, reduced motion
Next steps: ordered list
```

See `references/patterns.md` for code.
