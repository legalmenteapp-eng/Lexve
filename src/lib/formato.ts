export function dinero(n: number | string | null | undefined, moneda = "USD") {
  const v = Number(n ?? 0);
  if (moneda === "VES") return "Bs. " + v.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return v.toLocaleString("es-VE", { style: "currency", currency: moneda, minimumFractionDigits: 2 });
}

export function fecha(f: string | Date | null | undefined, conHora = false) {
  if (!f) return "—";
  const d = typeof f === "string" ? new Date(f.length === 10 ? f + "T12:00:00" : f) : f;
  return d.toLocaleDateString("es-VE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...(conHora ? { hour: "2-digit", minute: "2-digit" } : {}),
    timeZone: "America/Caracas",
  });
}

export function diasHasta(f: string) {
  const ms = new Date(f).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

export function etiquetaDias(f: string) {
  const d = diasHasta(f);
  if (d < 0) return `vencido hace ${-d} d`;
  if (d === 0) return "hoy";
  if (d === 1) return "mañana";
  return `en ${d} días`;
}
