// Lee un JSON que todavía está llegando: cierra lo que falta sin inventar datos.
export function parsearParcial(texto: string): unknown {
  const pila: string[] = [];
  let enTexto = false;
  let escape = false;
  let seguro = { pos: 0, pila: [] as string[] };
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (enTexto) {
      if (escape) escape = false;
      else if (c === '\\') escape = true;
      else if (c === '"') enTexto = false;
      continue;
    }
    if (c === '"') enTexto = true;
    else if (c === '{' || c === '[') {
      pila.push(c === '{' ? '}' : ']');
      seguro = { pos: i + 1, pila: [...pila] };
    } else if (c === '}' || c === ']') {
      pila.pop();
      seguro = { pos: i + 1, pila: [...pila] };
    } else if (c === ',') seguro = { pos: i, pila: [...pila] };
  }
  const cerrar = (base: string, abiertos: string[]) => base + [...abiertos].reverse().join('');
  const intentos = [cerrar(texto.replace(/\\$/, '') + (enTexto ? '"' : ''), pila), cerrar(texto.slice(0, seguro.pos), seguro.pila)];
  for (const intento of intentos) {
    try {
      return JSON.parse(intento);
    } catch {
      /* sigue con el corte seguro */
    }
  }
  return null;
}
