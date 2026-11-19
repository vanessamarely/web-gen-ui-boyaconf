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
  evitaTitulo: string;
  usaTitulo: string;
  /** Código que es igual en todos los frameworks */
  comun?: string;
  frameworks: { nombre: string; evita: string; usa: string }[];
  notas: string;
  notasCodigo: string;
  time: string;
  timeCodigo: string;
}

export const SALIDA_INICIAL: FilaSalida[] = [
  { ok: false, nombre: 'Si la respuesta de la IA trae código, la web no lo ejecuta', valor: 'Ejecutó un código dañino' },
  { ok: false, nombre: 'La pantalla se actualiza por grupos de cambios', valor: '204 actualizaciones' },
  { ok: false, nombre: 'Solo cambia lo necesario', valor: 'Creó 5.274 elementos' },
  { ok: false, nombre: 'La IA no sobrescribe lo que cambió la persona', valor: 'Volvió de 5 kg a 2 kg' },
  { ok: false, nombre: 'El lector de pantalla no recibe avisos de más', valor: '204 avisos · 8 campos sin nombre' },
];

export const RONDAS: Ronda[] = [
  {
    id: 'renderizado', n: 1, tema: 'Renderizado',
    problema: 'La web ejecutó código dañino de la respuesta',
    yaSabiamos: 'no confiar en contenido externo.',
    ahora: 'eso incluye la respuesta de la IA.',
    mide: 'Prueba de seguridad', antes: 'se ejecutó', despues: 'no se ejecutó', limite: 'Pusimos ese código a propósito para comprobar la regla',
    correccion: "Muestra la respuesta como texto, no como código",
    porque: "Si de verdad necesitas mostrar HTML, límpialo antes con un sanitizador como DOMPurify.",
    evitaTitulo: "La web lo ejecuta como HTML",
    usaTitulo: "La web lo muestra como texto",
    frameworks: [
      { nombre: "React", evita: "<p dangerouslySetInnerHTML={{ __html: consejo }} />", usa: "<p>{consejo}</p>" },
      { nombre: "Vue", evita: "<p v-html=\"consejo\"></p>", usa: "<p>{{ consejo }}</p>" },
      { nombre: "Angular", evita: "<p [innerHTML]=\"consejo()\"></p>", usa: "<p>{{ consejo() }}</p>" },
      { nombre: "Svelte", evita: "<p>{@html consejo}</p>", usa: "<p>{consejo}</p>" },
    ],
    notas: 'Empecemos por lo primero que ve la persona. Siempre supimos que el contenido externo no es confiable. Ahora la respuesta de la IA también es contenido externo. Para comprobarlo, pusimos a propósito un código dañino dentro de la respuesta. La versión sin preparar lo ejecutó. La preparada lo mostró como texto y no pasó nada.',
    notasCodigo: 'Cada framework tiene una forma de insertar HTML y una forma segura de mostrar texto. A la izquierda está lo que debemos evitar y a la derecha lo que debemos usar. Angular limpia lo que pasa por innerHTML, pero si solo necesitas texto, usa interpolación. Y si de verdad necesitas HTML, límpialo antes con un sanitizador como DOMPurify.',
    time: '10:40', timeCodigo: '11:15',
  },
  {
    id: 'streaming', n: 2, tema: 'Streaming',
    problema: 'La pantalla se actualizaba con cada pedacito',
    yaSabiamos: 'agrupar actualizaciones para no trabajar de más.',
    ahora: 'la interfaz se construye mientras la respuesta llega.',
    mide: 'Actualizaciones de pantalla', antes: '204', despues: '51', limite: 'En esta demo no se congeló: el costo fue trabajo innecesario',
    correccion: "No actualices la pantalla con cada pedazo",
    porque: "Cada pedazo se guarda al llegar, y la pantalla se actualiza como máximo cada 100 ms.",
    evitaTitulo: "Actualiza con cada pedazo",
    usaTitulo: "Actualiza una vez por tanda",
    comun: "// Igual en todos: guarda el pedazo y espera 100 ms\nbuffer += trozo;\ntimer ??= setTimeout(() => { timer = null; mostrar(buffer); }, 100);",
    frameworks: [
      { nombre: "React", evita: "setTexto((t) => t + trozo);", usa: "const mostrar = (b) => setTexto(b);" },
      { nombre: "Vue", evita: "texto.value += trozo;", usa: "const mostrar = (b) => (texto.value = b);" },
      { nombre: "Angular", evita: "texto.update((t) => t + trozo);", usa: "const mostrar = (b) => texto.set(b);" },
      { nombre: "Svelte", evita: "texto += trozo;", usa: "const mostrar = (b) => (texto = b);" },
    ],
    notas: 'Ya se ve bien, pero la respuesta llega por pedazos. La versión sin preparar actualizó la pantalla 204 veces. Seamos claros: en esta demo no se congeló. El problema es hacer trabajo que nadie alcanza a ver, y en una interfaz más grande eso sí se nota.',
    notasCodigo: 'A la izquierda, cada pedazo actualiza la pantalla. A la derecha, cada pedazo solo se guarda, y la pantalla se actualiza cada 100 milisegundos. Pasamos de 204 actualizaciones a 51.',
    time: '11:45', timeCodigo: '12:20',
  },
  {
    id: 'dom', n: 3, tema: 'Reutilizar el DOM',
    problema: 'Reconstruía toda la interfaz por un dato nuevo',
    yaSabiamos: 'usar claves estables en las listas.',
    ahora: 'la IA puede cambiar la estructura en cada respuesta.',
    mide: 'Elementos creados', antes: '5.274', despues: '56', limite: 'Regla de esta demo: 100 o menos',
    correccion: "Usa el id del dato como clave, no su posición",
    porque: "La IA puede cambiar el orden. Con el id, el framework reconoce cada elemento y lo reutiliza.",
    evitaTitulo: "Clave por posición",
    usaTitulo: "Clave por id",
    frameworks: [
      { nombre: "React", evita: "<Fila key={i} item={p} />", usa: "<Fila key={p.id} item={p} />" },
      { nombre: "Vue", evita: "<Fila v-for=\"(p, i) in items\" :key=\"i\" />", usa: "<Fila v-for=\"p in items\" :key=\"p.id\" />" },
      { nombre: "Angular", evita: "@for (p of items(); track $index) { … }", usa: "@for (p of items(); track p.id) { … }" },
      { nombre: "Svelte", evita: "{#each items as p, i (i)} … {/each}", usa: "{#each items as p (p.id)} … {/each}" },
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
    correccion: "Si la persona cambió un dato, la IA no lo sobrescribe",
    porque: "Si la persona cambió la cantidad, se usa su valor. Si no, se usa lo que sugiere la IA.",
    evitaTitulo: "Siempre gana la IA",
    usaTitulo: "Primero lo de la persona",
    frameworks: [
      { nombre: "React", evita: "const cantidad = sugerida;", usa: "const cantidad = dePersona[id] ?? sugerida;" },
      { nombre: "Vue", evita: "computed(() => sugerida.value)", usa: "computed(() => dePersona.value[id] ?? sugerida.value)" },
      { nombre: "Angular", evita: "computed(() => this.sugerida())", usa: "computed(() => this.dePersona()[id] ?? this.sugerida())" },
      { nombre: "Svelte", evita: "$derived(sugerida)", usa: "$derived(dePersona[id] ?? sugerida)" },
    ],
    notas: 'La pantalla ya es estable. Falta la pregunta más propia de esta nueva web: ¿quién gana? El estado sí estaba guardado. El problema es que ahora dos actores cambian el mismo dato al mismo tiempo: yo puse 5 kg y la IA seguía diciendo 2.',
    notasCodigo: 'La regla cabe en una línea: si la persona cambió el dato, se usa su valor; si no, se usa lo que sugiere la IA. Lo mismo aplica cuando un agente actúa en la página.',
    time: '15:15', timeCodigo: '15:50',
  },
  {
    id: 'accesibilidad', n: 5, tema: 'Accesibilidad',
    problema: 'El lector de pantalla recibía un aviso tras otro',
    yaSabiamos: 'nombrar los campos y anunciar los cambios.',
    ahora: 'el contenido cambia cientos de veces en segundos.',
    mide: 'Avisos al lector de pantalla', antes: '204', despues: '2', limite: 'Campos sin nombre: de 8 a 0',
    correccion: "Avisa al empezar y al terminar, no con cada cambio",
    porque: "Además, cada campo necesita un nombre, por ejemplo: aria-label=\"Cantidad de papa\".",
    evitaTitulo: "Anuncia cada pedazo",
    usaTitulo: "Anuncia solo el estado",
    frameworks: [
      { nombre: "React", evita: "<main aria-live=\"polite\">", usa: "<main aria-busy={generando}>\n<p role=\"status\">{mensaje}</p>" },
      { nombre: "Vue", evita: "<main aria-live=\"polite\">", usa: "<main :aria-busy=\"generando\">\n<p role=\"status\">{{ mensaje }}</p>" },
      { nombre: "Angular", evita: "<main aria-live=\"polite\">", usa: "<main [attr.aria-busy]=\"generando()\">\n<p role=\"status\">{{ mensaje() }}</p>" },
      { nombre: "Svelte", evita: "<main aria-live=\"polite\">", usa: "<main aria-busy={generando}>\n<p role=\"status\">{mensaje}</p>" },
    ],
    notas: 'Una web rápida también debe funcionar para quien no la ve. Quien usa un lector de pantalla recibía un aviso con cada pedazo de la respuesta: 204 en pocos segundos. Además, 8 campos no decían de qué producto eran.',
    notasCodigo: 'A la izquierda, aria-live anuncia cada pedazo que llega. A la derecha, aria-busy indica que se está generando y un solo mensaje avisa cuando empieza y cuando termina.',
    time: '16:20', timeCodigo: '16:55',
  },
];

export const SALIDA_FINAL: FilaSalida[] = [
  { ok: true, nombre: 'Si la respuesta de la IA trae código, la web no lo ejecuta', valor: 'No lo ejecutó' },
  { ok: true, nombre: 'La pantalla se actualiza por grupos de cambios', valor: '51 actualizaciones' },
  { ok: true, nombre: 'Solo cambia lo necesario', valor: '56 elementos' },
  { ok: true, nombre: 'La IA no sobrescribe lo que cambió la persona', valor: 'Se queda en 5 kg' },
  { ok: true, nombre: 'El lector de pantalla no recibe avisos de más', valor: '2 avisos · 0 campos sin nombre' },
];
