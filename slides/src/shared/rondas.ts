// Las 5 reglas de la demo (demo/ui). Las cifras salen de demo/tests/reglas.spec.ts sobre la misma respuesta de Gemini Nano.
export interface FilaSalida {
  ok: boolean;
  nombre: string;
  valor: string;
}

export interface Ronda {
  id: string;
  n: number;
  tema: string;
  problema: string;
  yaSabiamos: string;
  ahora: string;
  mide: string;
  antes: string;
  despues: string;
  limite: string;
  correccion: string;
  porque: string;
  frameworks: { nombre: string; codigo: string }[];
  notas: string;
  notasCodigo: string;
  time: string;
  timeCodigo: string;
}

export const SALIDA_INICIAL: FilaSalida[] = [
  { ok: false, nombre: 'No ejecuta HTML del modelo', valor: 'Lo ejecutó 43 veces' },
  { ok: false, nombre: 'Actualiza por tandas', valor: '204 actualizaciones' },
  { ok: false, nombre: 'Reutiliza lo que ya está', valor: 'Creó 5.274 elementos' },
  { ok: false, nombre: 'Lo de la persona gana', valor: 'Volvió de 5 kg a 2 kg' },
  { ok: false, nombre: 'Avisa sin saturar', valor: '204 avisos · 8 campos sin nombre' },
];

export const RONDAS: Ronda[] = [
  {
    id: 'renderizado', n: 1, tema: 'Renderizado',
    problema: 'Lo que escribe la IA se mostraba sin revisar',
    yaSabiamos: 'no confiar en contenido externo.',
    ahora: 'el modelo escribe parte de la interfaz.',
    mide: 'HTML peligroso ejecutado', antes: '43 veces', despues: '0', limite: 'Agregamos ese HTML a propósito para comprobar la regla',
    correccion: 'Muestra el texto de la IA como texto',
    porque: 'Tu framework escapa el texto. Reserva también el espacio para que nada salte.',
    frameworks: [
      { nombre: 'React', codigo: '<aside style={{ minHeight: 104 }}>\n  <p>{consejo}</p>\n</aside>' },
      { nombre: 'Vue', codigo: '<aside style="min-height: 104px">\n  <p>{{ consejo }}</p>\n</aside>' },
      { nombre: 'Angular', codigo: '<aside style="min-height: 104px">\n  <p>{{ consejo() }}</p>\n</aside>' },
      { nombre: 'Svelte', codigo: '<aside style="min-height: 104px">\n  <p>{consejo}</p>\n</aside>' },
    ],
    notas: 'Empecemos por lo primero que ve la persona. Siempre supimos que no se debe confiar en contenido externo. Ahora ese contenido también lo escribe un modelo. Para comprobarlo, agregamos HTML peligroso a propósito a la respuesta: la versión sin preparar lo ejecutó 43 veces.',
    notasCodigo: 'La solución es la que ya conocemos: mostrar el texto como texto. Los frameworks lo hacen por defecto, siempre que no usemos innerHTML ni sus equivalentes. Y si de verdad necesitas HTML, sanitízalo primero.',
    time: '10:40', timeCodigo: '11:15',
  },
  {
    id: 'streaming', n: 2, tema: 'Streaming',
    problema: 'La pantalla se actualizaba con cada pedacito',
    yaSabiamos: 'agrupar actualizaciones para no trabajar de más.',
    ahora: 'la interfaz se construye mientras la respuesta llega.',
    mide: 'Actualizaciones de pantalla', antes: '204', despues: '51', limite: 'En esta demo no se congeló: el costo fue trabajo innecesario',
    correccion: 'Actualiza la pantalla por tandas',
    porque: 'Guardas cada pedazo al llegar y actualizas la pantalla cada 100 ms.',
    frameworks: [
      { nombre: 'React', codigo: "buffer.current += trozo;\ntimer.current ??= setTimeout(() => {\n  timer.current = null;\n  setTexto(buffer.current);\n}, 100);" },
      { nombre: 'Vue', codigo: "buffer += trozo;\ntimer ??= setTimeout(() => {\n  timer = null;\n  texto.value = buffer;\n}, 100);" },
      { nombre: 'Angular', codigo: "this.buffer += trozo;\nthis.timer ??= setTimeout(() => {\n  this.timer = undefined;\n  this.texto.set(this.buffer);\n}, 100);" },
      { nombre: 'Svelte', codigo: "buffer += trozo;\ntimer ??= setTimeout(() => {\n  timer = null;\n  texto = buffer;\n}, 100);" },
    ],
    notas: 'Ya se ve bien, pero la respuesta llega por pedazos. La versión sin preparar actualizó la pantalla 204 veces. Seamos claros: en esta demo no se congeló. El problema es hacer trabajo que nadie alcanza a ver, y en una interfaz más grande eso sí se nota.',
    notasCodigo: 'La idea es la misma en cualquier framework: guardar lo que llega y actualizar la pantalla por tandas. Aquí pasamos de 204 actualizaciones a 51.',
    time: '11:45', timeCodigo: '12:20',
  },
  {
    id: 'dom', n: 3, tema: 'Reutilizar el DOM',
    problema: 'Reconstruía toda la interfaz por un dato nuevo',
    yaSabiamos: 'usar claves estables en las listas.',
    ahora: 'la IA puede cambiar la estructura en cada respuesta.',
    mide: 'Elementos creados', antes: '5.274', despues: '56', limite: 'Regla de esta demo: 100 o menos',
    correccion: 'Reutiliza cada elemento por su clave',
    porque: 'Si el producto ya está en pantalla, se actualiza ese mismo elemento.',
    frameworks: [
      { nombre: 'React', codigo: '{items.map((p) => (\n  <Fila key={p.id} item={p} />\n))}' },
      { nombre: 'Vue', codigo: '<Fila\n  v-for="p in items"\n  :key="p.id"\n  :item="p" />' },
      { nombre: 'Angular', codigo: '@for (p of items(); track p.id) {\n  <app-fila [item]="p" />\n}' },
      { nombre: 'Svelte', codigo: '{#each items as p (p.id)}\n  <Fila item={p} />\n{/each}' },
    ],
    notas: 'Actualizar menos veces ayuda, pero cada actualización también debe costar menos. La versión sin preparar reconstruía toda la interfaz cada vez: 5.274 elementos para mostrar solo 56.',
    notasCodigo: 'Esto ya lo sabemos hacer: claves estables. Lo importante en UI generativa es que la clave salga del dato, como el id del producto, y no de la posición en la que el modelo decidió ponerlo.',
    time: '12:50', timeCodigo: '13:25',
  },
  {
    id: 'estado', n: 4, tema: 'Estado',
    problema: 'La IA sobrescribía lo que cambió la persona',
    yaSabiamos: 'guardar el estado de la aplicación.',
    ahora: 'persona, IA y agente pueden cambiar el mismo dato a la vez.',
    mide: 'Papa pastusa después de cambiarla a 5 kg', antes: '2 kg', despues: '5 kg', limite: 'Regla: lo que cambia la persona gana',
    correccion: 'Define quién gana cuando dos cambian lo mismo',
    porque: 'La IA sugiere y la persona decide. Su valor nunca se sobrescribe.',
    frameworks: [
      { nombre: 'React', codigo: 'const cantidad =\n  dePersona[id] ?? sugerida;' },
      { nombre: 'Vue', codigo: 'const cantidad = computed(\n  () => dePersona.value[id] ?? sugerida.value\n);' },
      { nombre: 'Angular', codigo: 'cantidad = computed(\n  () => this.dePersona()[id] ?? this.sugerida()\n);' },
      { nombre: 'Svelte', codigo: 'let cantidad = $derived(\n  dePersona[id] ?? sugerida\n);' },
    ],
    notas: 'La pantalla ya es estable. Falta la pregunta más propia de esta nueva web: ¿quién gana? El estado sí estaba guardado. El problema es que ahora dos actores cambian el mismo dato al mismo tiempo: yo puse 5 kg y la IA seguía diciendo 2.',
    notasCodigo: 'La solución es una decisión de producto convertida en código: lo que cambia la persona gana y lo que dice la IA queda como sugerencia. Lo mismo aplica cuando un agente actúa en la página.',
    time: '15:15', timeCodigo: '15:50',
  },
  {
    id: 'accesibilidad', n: 5, tema: 'Accesibilidad',
    problema: 'El lector de pantalla recibía un aviso tras otro',
    yaSabiamos: 'nombrar los campos y anunciar los cambios.',
    ahora: 'el contenido cambia cientos de veces en segundos.',
    mide: 'Avisos al lector de pantalla', antes: '204', despues: '2', limite: 'Campos sin nombre: de 8 a 0',
    correccion: 'Avisa al empezar y al terminar',
    porque: 'aria-busy indica que se está generando. Un solo mensaje de estado cuenta el resultado.',
    frameworks: [
      { nombre: 'React', codigo: '<main aria-busy={generando}>…</main>\n<p role="status">{mensaje}</p>\n<input aria-label={`Cantidad de ${nombre}`} />' },
      { nombre: 'Vue', codigo: '<main :aria-busy="generando">…</main>\n<p role="status">{{ mensaje }}</p>\n<input :aria-label="`Cantidad de ${nombre}`" />' },
      { nombre: 'Angular', codigo: '<main [attr.aria-busy]="generando()">…</main>\n<p role="status">{{ mensaje() }}</p>\n<input [attr.aria-label]="etiqueta()" />' },
      { nombre: 'Svelte', codigo: '<main aria-busy={generando}>…</main>\n<p role="status">{mensaje}</p>\n<input aria-label={`Cantidad de ${nombre}`} />' },
    ],
    notas: 'Una web rápida también debe funcionar para quien no la ve. Quien usa un lector de pantalla recibía un aviso con cada pedazo de la respuesta: 204 en pocos segundos. Además, 8 campos no decían de qué producto eran.',
    notasCodigo: 'Son atributos que ya conocemos. La diferencia es cuándo anunciamos: una vez cuando empieza a generar y otra cuando termina.',
    time: '16:20', timeCodigo: '16:55',
  },
];

export const SALIDA_FINAL: FilaSalida[] = [
  { ok: true, nombre: 'No ejecuta HTML del modelo', valor: '0 veces' },
  { ok: true, nombre: 'Actualiza por tandas', valor: '51 actualizaciones' },
  { ok: true, nombre: 'Reutiliza lo que ya está', valor: '56 elementos' },
  { ok: true, nombre: 'Lo de la persona gana', valor: 'Se queda en 5 kg' },
  { ok: true, nombre: 'Avisa sin saturar', valor: '2 avisos · 0 campos sin nombre' },
];
