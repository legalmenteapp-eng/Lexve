/** Cliente: llama a una ruta que crea un trabajo de IA y espera su resultado consultando el estado. */
export async function ejecutarYEsperar<T = unknown>(ruta: string, cuerpo: unknown, limiteMs = 16 * 60_000): Promise<T> {
  const r = await fetch(ruta, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(cuerpo) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? `Error ${r.status}`);
  const id: string = j.trabajo_id;
  const inicio = Date.now();
  let espera = 2000;
  while (Date.now() - inicio < limiteMs) {
    await new Promise((ok) => setTimeout(ok, espera));
    espera = Math.min(espera + 1000, 5000);
    const e = await fetch(`/api/ia/trabajos/${id}`, { cache: "no-store" });
    if (!e.ok) continue; // fallo de red puntual: se reintenta
    const t = await e.json();
    if (t.estado === "completado") return t.resultado as T;
    if (t.estado === "error") throw new Error(t.error ?? "El trabajo de IA falló");
  }
  throw new Error("La IA está tardando más de lo normal. Revisa el historial del caso en unos minutos.");
}
