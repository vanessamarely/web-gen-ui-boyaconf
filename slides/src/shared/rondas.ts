// Datos de la corrida real del agente sobre base/ (docs/corrida-agente): los números salen de
// corridas.jsonl y el código, de sus commits. Deck, celular y memoria leen de aquí.
export interface FilaSalida {
  ok: boolean;
  nombre: string;
  valor: string;
}

export interface Ronda {
  id: string;
  n: number;
  /** La pregunta que responde la prueba */
  prueba: string;
  /** El problema, en palabras de quien usa la web */
  problema: string;
  /** Qué pasaba en la web, sin asumir contexto */
  pasaba: string;
  /** Qué se midió */
  mide: string;
  antes: string;
  despues: string;
  limite: string;
  /** Fragmentos reales: base/src y docs/corrida-agente/despues/src */
  codigoAntes: { archivo: string; texto: string };
  codigoDespues: { archivo: string; texto: string };
  correccion: string;
  porque: string;
  /** Apoyo opcional bajo el código */
  extra?: string;
  notas: string;
  notasCodigo: string;
  time: string;
  timeCodigo: string;
}

/** Primera ejecución del harness (corridas.jsonl, línea 1). */
export const SALIDA_INICIAL: FilaSalida[] = [
  { ok: false, nombre: '¿La pantalla se queda quieta?', valor: 'No: el contenido salta (CLS 0,103)' },
  { ok: false, nombre: '¿Responde mientras la IA genera?', valor: 'No: se congeló 29 veces' },
  { ok: false, nombre: '¿Cambia solo lo necesario?', valor: 'No: creó 117.460 elementos' },
  { ok: false, nombre: '¿Conserva la nota y la marca?', valor: 'No: las pierde' },
  { ok: false, nombre: '¿Sirve con lector de pantalla?', valor: 'No: 86 campos sin etiqueta' },
];

/** Última ejecución del harness (corridas.jsonl, línea 6). */
export const SALIDA_FINAL: FilaSalida[] = [
  { ok: true, nombre: '¿La pantalla se queda quieta?', valor: 'Sí: CLS 0' },
  { ok: true, nombre: '¿Responde mientras la IA genera?', valor: 'Sí: no se congeló' },
  { ok: true, nombre: '¿Cambia solo lo necesario?', valor: 'Sí: creó 60 elementos' },
  { ok: true, nombre: '¿Conserva la nota y la marca?', valor: 'Sí: quedan intactas' },
  { ok: true, nombre: '¿Sirve con lector de pantalla?', valor: 'Sí: 0 campos sin etiqueta' },
];

export const CORRIDA = { ejecuciones: 6, rondas: 5 };

export const RONDAS: Ronda[] = [
  {
    id: 'renderizado',
    n: 1,
    prueba: '¿La pantalla se queda quieta?',
    problema: 'El contenido saltaba',
    pasaba: 'Un consejo aparecía al final, arriba de la lista, y empujaba todo hacia abajo.',
    mide: 'CLS: cuánto se mueve lo que ya estabas viendo',
    antes: '0,103',
    despues: '0',
    limite: 'Bueno: 0,1 o menos',
    codigoAntes: { archivo: 'src/main.ts', texto: "consejo.innerHTML = aviso\n  ? `<aside class=\"consejo\">${aviso}</aside>`\n  : '';" },
    codigoDespues: { archivo: 'src/styles.css', texto: '#consejo { min-height: 154px; }\n\n#lista {\n  min-height: calc(var(--filas, 0) * 61px);\n}' },
    correccion: 'Reservar el espacio antes de que llegue el contenido.',
    porque: 'El espacio ya existe cuando llega el consejo. Por eso nada se mueve.',
    notas: '¿A quién le ha saltado un botón justo cuando iba a tocarlo? Eso mide CLS. Aquí, un consejo llegaba al final y empujaba toda la lista. Pasamos de 0,103 a cero.',
    notasCodigo: 'A la izquierda, el consejo aparece sin tener un lugar reservado. A la derecha, el agente reservó su altura en CSS. Esto es lo que evita el salto.',
    time: '11:00',
    timeCodigo: '11:30',
  },
  {
    id: 'streaming',
    n: 2,
    prueba: '¿Responde mientras la IA genera?',
    problema: 'La web se congelaba',
    pasaba: 'La respuesta de la IA llega por partes. Con cada parte, la web volvía a dibujar toda la lista.',
    mide: 'Congelamientos: veces que la pantalla tardó más de 50 ms en actualizarse',
    antes: '29',
    despues: '0',
    limite: 'Límite de esta prueba: 5',
    codigoAntes: { archivo: 'src/main.ts', texto: "for await (const parte of pedirAlModelo(pedido)) {\n  texto += parte;\n  // …vuelve a leer toda la respuesta\n  lista.innerHTML = items.map(fila).join('');\n}" },
    codigoDespues: { archivo: 'src/main.ts', texto: "if (cambio.op === 'item') filasPendientes.push(cambio);\npedirPintura();\n\nfunction pedirPintura() {\n  if (!frame) frame = requestAnimationFrame(pintar);\n}" },
    correccion: 'Juntar los cambios y actualizar la pantalla una sola vez',
    porque: 'Aunque lleguen muchas partes, el navegador actualiza la pantalla una sola vez antes de mostrar cada imagen.',
    notas: 'La pantalla se actualiza muchas veces por segundo. Si una actualización tarda demasiado, la web se congela y no responde. Aquí se congeló 29 veces mientras la IA generaba la lista. En el video, cada marca es un momento en que la web se congeló. Después de corregirla, cero.',
    notasCodigo: 'Antes, cada parte de la respuesta volvía a dibujar toda la lista. Ahora los cambios se guardan y requestAnimationFrame los aplica juntos justo antes de que el navegador actualice la pantalla.',
    time: '12:05',
    timeCodigo: '12:35',
  },
  {
    id: 'dom',
    n: 3,
    prueba: '¿Cambia solo lo necesario?',
    problema: 'La web borraba la lista y la creaba otra vez',
    pasaba: 'Cada vez que algo cambiaba, se destruía toda la lista. Por eso se perdía la nota.',
    mide: 'Elementos de la página creados al actualizar la lista',
    antes: '117.460',
    despues: '60',
    limite: 'Límite de esta prueba: 60',
    codigoAntes: { archivo: 'src/main.ts', texto: "lista.innerHTML = items.map(fila).join('');" },
    codigoDespues: { archivo: 'src/main.ts', texto: 'let actual = filas.get(item.id);\n\nif (actual) actualizarFila(actual, item);\nelse filas.set(item.id, (actual = crearFila(item)));' },
    correccion: 'Actualizar cada fila por su id, sin reemplazar la lista.',
    porque: 'Si el producto ya existe, se actualiza esa misma fila. El campo de la nota no se destruye.',
    extra: 'En tu framework: <code>key={id}</code> React · <code>:key="id"</code> Vue · <code>track item.id</code> Angular · <code>(item.id)</code> Svelte',
    notas: 'Cada vez que algo cambiaba, la web tiraba la lista completa y creaba otra: más de cien mil elementos. Al destruir la lista, también destruía el campo donde estabas escribiendo.',
    notasCodigo: 'innerHTML reemplaza toda la lista. El id es el identificador de cada producto: con él, el agente busca la fila que ya existe y solo actualiza lo que cambió. Si usan un framework, esta es la misma idea: key en React y Vue, track en Angular y la clave del each en Svelte.',
    time: '13:10',
    timeCodigo: '13:40',
  },
  {
    id: 'accesibilidad',
    n: 4,
    prueba: '¿Sirve con lector de pantalla?',
    problema: 'Un lector de pantalla no sabía qué era cada campo',
    pasaba: 'Una persona ciega escuchaba una casilla sin nombre y una nota que no decía de qué producto era.',
    mide: 'Campos sin etiqueta para un lector de pantalla',
    antes: '86',
    despues: '0',
    limite: 'Meta: 0',
    codigoAntes: { archivo: 'src/main.ts', texto: '<input type="checkbox" />\n<input type="text" placeholder="Nota para el puesto" />' },
    codigoDespues: { archivo: 'src/main.ts', texto: "marca.setAttribute('aria-label', `Marcar ${nombre} como comprado`);\nnota.setAttribute('aria-label', `Nota para el puesto sobre ${nombre}`);\n\nlista.setAttribute('aria-busy', 'true');\nestado.textContent = 'Generando tu mercado…';" },
    correccion: 'Ponerle nombre a cada campo y avisar qué está pasando.',
    porque: 'El lector de pantalla ya puede decir qué es cada campo y cuándo está trabajando la IA.',
    extra: 'También: toda imagen necesita <code>alt</code>. Un emoji decorativo se oculta con <code>aria-hidden="true"</code>.',
    notas: 'Una web rápida también debe funcionar para todas las personas. Un lector de pantalla es el programa que lee la web en voz alta. Aquí encontró 86 campos sin etiqueta: la persona no sabe qué está marcando ni de qué producto es la nota.',
    notasCodigo: 'aria-label le da nombre a cada campo. aria-busy indica que la lista se está generando, y el texto de estado anuncia lo que pasa. Lo mismo pasa con imágenes y emojis: una imagen necesita un texto alternativo. Un emoji se lee por su nombre, así que si solo decora, se oculta con aria-hidden.',
    time: '15:40',
    timeCodigo: '16:05',
  },
  {
    id: 'estado',
    n: 5,
    prueba: '¿Conserva la nota y la marca?',
    problema: 'Lo que escribía la persona solo existía en la pantalla',
    pasaba: 'Si la fila desaparecía de la pantalla, la nota y la marca se perdían con ella.',
    mide: 'La nota y la marca después de actualizar la lista',
    antes: 'Perdidas',
    despues: 'Intactas',
    limite: 'Meta: no perder nada',
    codigoAntes: { archivo: 'src/main.ts', texto: '<input type="text" placeholder="Nota para el puesto" />' },
    codigoDespues: { archivo: 'src/main.ts', texto: "// Cuando la persona escribe:\npropio.nota = campo.value;\ndePersona.set(id, propio);\n\n// Cuando la fila se crea otra vez:\nnueva.nota.value = propio?.nota ?? '';" },
    correccion: 'Guardar lo que hace la persona aparte de lo que genera la IA.',
    porque: 'La nota queda guardada aparte. Aunque la fila se cree otra vez, la nota vuelve.',
    notas: 'La prueba ya pasaba desde la corrección 3. Pero las instrucciones decían que lo que escribe la persona debe guardarse aparte, y el agente lo hizo. Las pruebas no lo ven todo: por eso un harness necesita instrucciones y pruebas.',
    notasCodigo: 'Antes, la nota solo vivía en el campo de la pantalla. Ahora se guarda en dePersona, y cuando la fila se crea otra vez, la nota se recupera.',
    time: '16:35',
    timeCodigo: '17:00',
  },
];

/** Fragmentos reales de la prueba que comprueba la nota (base/harness/check.mjs). */
export const CODIGO_PRUEBA = `await page.locator('[data-id="papa-pastusa"] input[type="checkbox"]').check();
await nota.click();
await page.keyboard.type('bien grandes', { delay: 25 });
document.querySelector('[data-testid="refinar"]').click();
const notaOk = r.nota === 'bien grandes, gracias';`;
