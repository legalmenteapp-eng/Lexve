import { crearClienteServidor } from "@/lib/supabase/server";

function csv(filas: Record<string, unknown>[]) {
  if (!filas.length) return "";
  const cols = Object.keys(filas[0]);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(";"), ...filas.map((f) => cols.map((c) => esc(f[c])).join(";"))].join("\n");
}

export async function GET(req: Request) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("No autenticado", { status: 401 });
  const tipo = new URL(req.url).searchParams.get("tipo") ?? "casos";
  let filas: Record<string, unknown>[] = [];
  if (tipo === "casos") {
    const { data } = await supabase
      .from("v_casos_resumen")
      .select("codigo, numero_expediente, titulo, cliente_nombre, materia, estado, etapa, tribunal, abogados, horas_totales, por_facturar, proximo_plazo, fecha_inicio");
    filas = data ?? [];
  } else if (tipo === "facturas") {
    const { data } = await supabase.from("v_facturas_saldo").select("numero, numero_control, fecha_emision, fecha_vencimiento, cliente_nombre, caso_codigo, moneda, subtotal, iva_monto, igtf_monto, total, pagado, saldo, estado, tasa_bcv");
    filas = data ?? [];
  } else if (tipo === "horas") {
    const { data } = await supabase.from("registros_tiempo").select("fecha, horas, tarifa, descripcion, facturable, caso:casos(codigo), abogado:perfiles(nombre)").order("fecha");
    filas = (data ?? []).map((h) => ({
      fecha: h.fecha,
      caso: (h.caso as unknown as { codigo: string })?.codigo,
      abogado: (h.abogado as unknown as { nombre: string })?.nombre,
      horas: h.horas,
      tarifa: h.tarifa,
      monto: Number(h.horas) * Number(h.tarifa),
      facturable: h.facturable ? "sí" : "no",
      descripcion: h.descripcion,
    }));
  }
  return new Response("﻿" + csv(filas), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="lexve-${tipo}.csv"` },
  });
}
