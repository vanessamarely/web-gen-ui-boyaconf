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
  /** Una frase bajo el título del slide de implementación */
  idea: string;
  /** Dibujo que compara cuántas veces se redibuja la pantalla */
  diagrama?: boolean;
  /** Fragmento que se muestra como ejemplo de la prueba */
  ejemplo?: string;
  porque?: string;
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
  { ok: false, nombre: 'Si la respuesta de la IA trae código, la web no lo ejecuta', valor: 'Ejecutó un script de la respuesta' },
  { ok: false, nombre: 'La pantalla se actualiza por grupos de cambios', valor: '204 actualizaciones' },
  { ok: false, nombre: 'Solo cambia lo necesario', valor: 'Creó 5.274 elementos' },
  { ok: false, nombre: 'La IA no sobrescribe lo que cambió la persona', valor: 'Volvió de 5 kg a 2 kg' },
  { ok: false, nombre: 'El lector de pantalla no recibe avisos de más', valor: '204 avisos · 8 campos sin nombre' },
];

export const RONDAS: Ronda[] = [
  {
    id: 'renderizado', n: 1, tema: 'Renderizado',
    problema: "La respuesta de la IA traía un script y la web lo ejecutó",
    yaSabiamos: "no confiar en lo que escriben los usuarios.",
    ahora: "la IA puede traer contenido copiado de una reseña o de otra página.",
    mide: "Prueba de seguridad", antes: "lo ejecutó", despues: "solo lo mostró", limite: "Agregamos a propósito este HTML al consejo de la IA:",
    correccion: "Muestra la respuesta de la IA como texto",
    porque: "Si de verdad necesitas HTML, límpialo con DOMPurify, como recomiendan OWASP y Chrome. Angular limpia [innerHTML] por defecto, pero para texto usa {{ }}.",
    evitaTitulo: "Insertarla como HTML: se ejecuta",
    usaTitulo: "Mostrarla como texto: no se ejecuta",
    ejemplo: "<img src=\"x\" onerror=\"robarDatos()\">",
    idea: "La IA sí puede pedir componentes visuales, como en A2UI o AG-UI, pero la web los dibuja con los suyos: nunca ejecuta el HTML que traiga la respuesta.",
    frameworks: [
      { nombre: "React", evita: "<p dangerouslySetInnerHTML={{ __html: consejo }} />", usa: "<p>{consejo}</p>" },
      { nombre: "Vue", evita: "<p v-html=\"consejo\"></p>", usa: "<p>{{ consejo }}</p>" },
      { nombre: "Angular", evita: "<p [innerHTML]=\"consejo()\"></p>", usa: "<p>{{ consejo() }}</p>" },
      { nombre: "Svelte", evita: "<p>{@html consejo}</p>", usa: "<p>{consejo}</p>" },
    ],
    notas: "Empecemos por lo primero que ve la persona. Siempre supimos que no se debe confiar en lo que escriben los usuarios. Pues la respuesta de la IA es igual: puede traer contenido que copió de una reseña o de otra página. Para probarlo, agregamos a propósito al consejo de la IA una imagen con un onerror que ejecuta JavaScript. La versión sin preparar lo ejecutó. La preparada lo mostró como texto.",
    notasCodigo: "Ojo, esto no significa que la IA solo pueda mostrar texto. En A2UI o AG-UI, la IA pide componentes visuales, como una tarjeta o un botón, y la web los dibuja con sus propios componentes. Lo que nunca hacemos es ejecutar HTML que venga en la respuesta. En la tabla, a la izquierda está lo que debemos evitar y a la derecha lo que debemos usar. Y si de verdad necesitas mostrar HTML, límpialo antes con un sanitizador como DOMPurify: es lo que recomiendan OWASP, la referencia de seguridad web, y la guía de Chrome para mostrar respuestas de modelos de IA.",
    time: "9:50", timeCodigo: "10:25",
  },
  {
    id: 'streaming', n: 2, tema: 'Streaming',
    problema: "La pantalla se redibujaba con cada pedacito de la respuesta",
    yaSabiamos: "no redibujar con cada tecla, como en un buscador.",
    ahora: "la IA envía su respuesta en cientos de pedacitos.",
    mide: "Veces que se redibujó la pantalla", antes: '204', despues: '51', limite: "En esta demo no se congeló, pero es trabajo de más: en un celular sencillo sí se nota",
    correccion: "Junta los pedacitos y redibuja cada 100 ms",
    porque: "Para la persona se ve igual de fluido. Para el navegador es 4 veces menos trabajo. throttle viene en lodash o es-toolkit.",
    evitaTitulo: "Redibujar con cada pedacito",
    usaTitulo: "Redibujar cada 100 ms (throttle)",
    idea: "Igual que en un buscador: no reaccionas a cada tecla. Aquí no redibujas con cada pedacito, sino una vez cada 100 ms con todo lo que llegó.",
    diagrama: true,
    frameworks: [
      { nombre: "React", evita: "onTrozo = (t) => setTexto(t);", usa: "onTrozo = throttle((t) => setTexto(t), 100);" },
      { nombre: "Vue", evita: "onTrozo = (t) => (texto.value = t);", usa: "onTrozo = throttle((t) => (texto.value = t), 100);" },
      { nombre: "Angular", evita: "onTrozo = (t) => this.texto.set(t);", usa: "onTrozo = throttle((t) => this.texto.set(t), 100);" },
      { nombre: "Svelte", evita: "onTrozo = (t) => (texto = t);", usa: "onTrozo = throttle((t) => (texto = t), 100);" },
    ],
    notas: "Ya se ve bien, pero la respuesta de la IA llega en cientos de pedacitos. La versión sin preparar redibujaba la pantalla con cada uno: 204 veces. Seamos claros: en esta demo no se congeló. El problema es trabajo que nadie alcanza a ver, y en una interfaz más grande o en un celular sencillo sí se nota.",
    notasCodigo: "Piensen en un buscador: no lanzamos una búsqueda con cada tecla. Aquí es igual. La IA manda cientos de pedacitos; en lugar de redibujar con cada uno, juntamos lo que llegó y redibujamos una vez cada 100 milisegundos. La persona lo ve igual de fluido, y el navegador hace 4 veces menos trabajo: de 204 redibujos a 51. En código es una sola línea con throttle.",
    time: "10:55", timeCodigo: "11:30",
  },
  {
    id: 'dom', n: 3, tema: 'Reutilizar el DOM',
    problema: 'Reconstruía toda la interfaz por un dato nuevo',
    yaSabiamos: 'usar claves estables en las listas.',
    ahora: 'la IA puede cambiar la estructura en cada respuesta.',
    mide: 'Elementos creados', antes: '5.274', despues: '56', limite: 'Regla de esta demo: 100 o menos',
    correccion: "Usa el id del dato como clave, no su posición",
    evitaTitulo: "Clave por posición",
    usaTitulo: "Clave por id",
    idea: "La IA puede cambiar el orden. Con el id, el framework reconoce cada producto y lo reutiliza.",
    porque: "La clave debe salir del dato, no del orden en que la IA lo envió.",
    frameworks: [
      { nombre: "React", evita: "<Fila key={i} item={p} />", usa: "<Fila key={p.id} item={p} />" },
      { nombre: "Vue", evita: "<Fila v-for=\"(p, i) in items\" :key=\"i\" />", usa: "<Fila v-for=\"p in items\" :key=\"p.id\" />" },
      { nombre: "Angular", evita: "@for (p of items(); track $index) { … }", usa: "@for (p of items(); track p.id) { … }" },
      { nombre: "Svelte", evita: "{#each items as p, i (i)} … {/each}", usa: "{#each items as p (p.id)} … {/each}" },
    ],
    notas: 'Actualizar menos veces ayuda, pero cada actualización también debe costar menos. La versión sin preparar reconstruía toda la interfaz cada vez: 5.274 elementos para mostrar solo 56.',
    notasCodigo: 'Esto ya lo sabemos hacer: claves estables. Lo importante en UI generativa es que la clave salga del dato, como el id del producto, y no de la posición en la que el modelo decidió ponerlo.',
    time: "12:00", timeCodigo: "12:35",
  },
  {
    id: 'estado', n: 4, tema: 'Estado',
    problema: "Cambié la cantidad y la IA la devolvió a su valor",
    yaSabiamos: "guardar lo que cambia el usuario.",
    ahora: "la IA sigue enviando datos mientras la persona edita.",
    mide: 'Papa pastusa después de cambiarla a 5 kg', antes: '2 kg', despues: '5 kg', limite: "AG-UI recomienda resolver los conflictos entre el agente y la interfaz",
    correccion: "Si la persona cambió un dato, la IA no lo sobrescribe",
    evitaTitulo: "Siempre gana la IA",
    usaTitulo: "Primero lo de la persona",
    idea: "Si la persona cambió la cantidad, se usa su valor. Si no, se usa lo que sugiere la IA.",
    porque: "Lo mismo aplica cuando un agente cambia datos en la página.",
    frameworks: [
      { nombre: "React", evita: "const cantidad = sugerida;", usa: "const cantidad = dePersona[id] ?? sugerida;" },
      { nombre: "Vue", evita: "computed(() => sugerida.value)", usa: "computed(() => dePersona.value[id] ?? sugerida.value)" },
      { nombre: "Angular", evita: "computed(() => this.sugerida())", usa: "computed(() => this.dePersona()[id] ?? this.sugerida())" },
      { nombre: "Svelte", evita: "$derived(sugerida)", usa: "$derived(dePersona[id] ?? sugerida)" },
    ],
    notas: "La pantalla ya es estable. Ahora una situación propia de esta nueva web. Mientras la IA seguía respondiendo, cambié la papa a 5 kilos. Llegó el siguiente pedazo de la respuesta y volvió a 2. Mi cambio sí estaba guardado: el problema es que la IA seguía enviando datos. Esto no es solo de la demo: la documentación de AG-UI, el protocolo que conecta agentes con interfaces, recomienda resolver los conflictos entre lo que cambia el agente y lo que cambia la interfaz.",
    notasCodigo: 'La regla cabe en una línea: si la persona cambió el dato, se usa su valor; si no, se usa lo que sugiere la IA. Lo mismo aplica cuando un agente actúa en la página.',
    time: "13:35", timeCodigo: "14:10",
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
    idea: "aria-busy indica que se está generando, y un solo mensaje avisa cuando termina.",
    frameworks: [
      { nombre: "React", evita: "<main aria-live=\"polite\">", usa: "<main aria-busy={generando}>\n<p role=\"status\">{mensaje}</p>" },
      { nombre: "Vue", evita: "<main aria-live=\"polite\">", usa: "<main :aria-busy=\"generando\">\n<p role=\"status\">{{ mensaje }}</p>" },
      { nombre: "Angular", evita: "<main aria-live=\"polite\">", usa: "<main [attr.aria-busy]=\"generando()\">\n<p role=\"status\">{{ mensaje() }}</p>" },
      { nombre: "Svelte", evita: "<main aria-live=\"polite\">", usa: "<main aria-busy={generando}>\n<p role=\"status\">{mensaje}</p>" },
    ],
    notas: 'Una web rápida también debe funcionar para quien no la ve. Quien usa un lector de pantalla recibía un aviso con cada pedazo de la respuesta: 204 en pocos segundos. Además, 8 campos no decían de qué producto eran.',
    notasCodigo: 'A la izquierda, aria-live anuncia cada pedazo que llega. A la derecha, aria-busy indica que se está generando y un solo mensaje avisa cuando empieza y cuando termina.',
    time: "14:40", timeCodigo: "15:15",
  },
];

export const SALIDA_FINAL: FilaSalida[] = [
  { ok: true, nombre: 'Si la respuesta de la IA trae código, la web no lo ejecuta', valor: 'Lo mostró como texto' },
  { ok: true, nombre: 'La pantalla se actualiza por grupos de cambios', valor: '51 actualizaciones' },
  { ok: true, nombre: 'Solo cambia lo necesario', valor: '56 elementos' },
  { ok: true, nombre: 'La IA no sobrescribe lo que cambió la persona', valor: 'Se queda en 5 kg' },
  { ok: true, nombre: 'El lector de pantalla no recibe avisos de más', valor: '2 avisos · 0 campos sin nombre' },
];
