"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sesion } from "@/lib/auth";
import { crearClienteServidor } from "@/lib/supabase/server";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { procesarAlertas } from "@/lib/alertas";
import { idArchivoDesdeUrl, idCarpetaDesdeUrl } from "@/lib/drive";

const txt = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
};
const num = (fd: FormData, k: string) => {
  const v = txt(fd, k);
  return v === null ? null : Number(v.replace(",", "."));
};
function comprobar(error: { message: string } | null) {
  if (error) throw new Error(error.message);
}

export async function cerrarSesion() {
  const supabase = await crearClienteServidor();
  await supabase.auth.signOut();
  redirect("/login");
}

// ---------------- Clientes ----------------
export async function crearCliente(fd: FormData) {
  const { supabase, perfil } = await sesion();
  const driveUrl = txt(fd, "drive_folder_url");
  const { data, error } = await supabase
    .from("clientes")
    .insert({
      despacho_id: perfil.despacho_id,
      tipo: txt(fd, "tipo") ?? "natural",
      nombre: txt(fd, "nombre"),
      cedula_rif: txt(fd, "cedula_rif"),
      email: txt(fd, "email"),
      telefono: txt(fd, "telefono"),
      direccion: txt(fd, "direccion"),
      ciudad: txt(fd, "ciudad"),
      estado_region: txt(fd, "estado_region"),
      drive_folder_url: driveUrl,
      drive_folder_id: idCarpetaDesdeUrl(driveUrl),
      notas: txt(fd, "notas"),
    })
    .select("id")
    .single();
  comprobar(error);
  redirect(`/clientes/${data!.id}`);
}

export async function actualizarDriveCliente(clienteId: string, fd: FormData) {
  const { supabase } = await sesion();
  const url = txt(fd, "drive_folder_url");
  comprobar((await supabase.from("clientes").update({ drive_folder_url: url, drive_folder_id: idCarpetaDesdeUrl(url) }).eq("id", clienteId)).error);
  revalidatePath(`/clientes/${clienteId}`);
}

// ---------------- Casos ----------------
export async function crearCaso(fd: FormData) {
  const { supabase, perfil } = await sesion();
  const anio = new Date().getFullYear();
  const { count } = await supabase.from("casos").select("id", { count: "exact", head: true }).like("codigo", `LEX-${anio}-%`);
  const { data: ultimo } = await supabase.from("casos").select("codigo").order("codigo", { ascending: false }).limit(1);
  const correlativo = Math.max((count ?? 0) + 1, Number(ultimo?.[0]?.codigo?.split("-")[2] ?? 0) + 1);
  const driveUrl = txt(fd, "drive_folder_url");
  const { data, error } = await supabase
    .from("casos")
    .insert({
      despacho_id: perfil.despacho_id,
      cliente_id: txt(fd, "cliente_id"),
      codigo: txt(fd, "codigo") ?? `LEX-${anio}-${String(correlativo).padStart(3, "0")}`,
      numero_expediente: txt(fd, "numero_expediente"),
      titulo: txt(fd, "titulo"),
      materia: txt(fd, "materia") ?? "civil",
      estado: txt(fd, "estado") ?? "abierto",
      etapa: txt(fd, "etapa"),
      tribunal: txt(fd, "tribunal"),
      circunscripcion: txt(fd, "circunscripcion"),
      contraparte: txt(fd, "contraparte"),
      descripcion: txt(fd, "descripcion"),
      cuantia: num(fd, "cuantia"),
      prioridad: num(fd, "prioridad") ?? 2,
      tarifa_tipo: txt(fd, "tarifa_tipo") ?? "por_hora",
      tarifa_monto: num(fd, "tarifa_monto"),
      drive_folder_url: driveUrl,
      drive_folder_id: idCarpetaDesdeUrl(driveUrl),
      creado_por: perfil.id,
    })
    .select("id")
    .single();
  comprobar(error);
  redirect(`/casos/${data!.id}`);
}

export async function actualizarCaso(casoId: string, fd: FormData) {
  const { supabase } = await sesion();
  const cambios: Record<string, unknown> = {};
  for (const k of ["estado", "etapa", "tribunal", "numero_expediente", "juez", "contraparte", "descripcion", "drive_folder_url"]) {
    if (fd.has(k)) cambios[k] = txt(fd, k);
  }
  if (fd.has("prioridad")) cambios.prioridad = num(fd, "prioridad");
  if ("drive_folder_url" in cambios) cambios.drive_folder_id = idCarpetaDesdeUrl(cambios.drive_folder_url as string | null);
  if (cambios.estado === "cerrado") cambios.fecha_cierre = new Date().toISOString().slice(0, 10);
  comprobar((await supabase.from("casos").update(cambios).eq("id", casoId)).error);
  revalidatePath(`/casos/${casoId}`);
}

export async function asignarAbogado(casoId: string, fd: FormData) {
  const { supabase } = await sesion();
  comprobar((await supabase.from("caso_abogados").upsert({ caso_id: casoId, abogado_id: txt(fd, "abogado_id"), rol: txt(fd, "rol") ?? "colaborador" })).error);
  revalidatePath(`/casos/${casoId}`);
}

export async function quitarAbogado(casoId: string, abogadoId: string) {
  const { supabase } = await sesion();
  comprobar((await supabase.from("caso_abogados").delete().eq("caso_id", casoId).eq("abogado_id", abogadoId)).error);
  revalidatePath(`/casos/${casoId}`);
}

export async function crearActuacion(casoId: string, fd: FormData) {
  const { supabase, perfil } = await sesion();
  const f = txt(fd, "fecha");
  comprobar(
    (
      await supabase.from("actuaciones").insert({
        caso_id: casoId,
        tipo: txt(fd, "tipo") ?? "nota",
        titulo: txt(fd, "titulo"),
        descripcion: txt(fd, "descripcion"),
        fecha: f ? new Date(f + "T12:00:00-04:00").toISOString() : new Date().toISOString(),
        autor_id: perfil.id,
      })
    ).error,
  );
  revalidatePath(`/casos/${casoId}`);
}

export async function crearPlazo(casoId: string, fd: FormData) {
  const { supabase, perfil } = await sesion();
  const dias = (txt(fd, "dias_aviso") ?? "7,3,1").split(",").map((d) => parseInt(d)).filter((d) => !isNaN(d));
  comprobar(
    (
      await supabase.from("plazos").insert({
        caso_id: casoId,
        titulo: txt(fd, "titulo"),
        descripcion: txt(fd, "descripcion"),
        tipo: txt(fd, "tipo") ?? "lapso_procesal",
        fecha_vencimiento: new Date(`${txt(fd, "fecha")}T${txt(fd, "hora") ?? "09:00"}:00-04:00`).toISOString(),
        responsable_id: txt(fd, "responsable_id") ?? perfil.id,
        dias_aviso: dias,
      })
    ).error,
  );
  revalidatePath(`/casos/${casoId}`);
  revalidatePath("/");
}

export async function completarPlazo(plazoId: string, casoId: string) {
  const { supabase } = await sesion();
  comprobar((await supabase.from("plazos").update({ completado: true, completado_en: new Date().toISOString() }).eq("id", plazoId)).error);
  revalidatePath(`/casos/${casoId}`);
  revalidatePath("/");
}

export async function agregarDocumento(casoId: string, fd: FormData) {
  const { supabase, perfil } = await sesion();
  const url = txt(fd, "url");
  const driveId = idArchivoDesdeUrl(url) ?? txt(fd, "drive_file_id");
  const esDrive = Boolean(driveId && (url?.includes("google.com") || !url));
  comprobar(
    (
      await supabase.from("documentos").insert({
        caso_id: casoId,
        nombre: txt(fd, "nombre"),
        tipo: txt(fd, "tipo"),
        origen: esDrive ? "drive" : url ? "url" : "texto",
        drive_file_id: esDrive ? driveId : null,
        url,
        mime_type: txt(fd, "mime_type"),
        contenido_texto: txt(fd, "contenido_texto"),
        subido_por: perfil.id,
      })
    ).error,
  );
  revalidatePath(`/casos/${casoId}`);
}

export async function registrarTiempo(casoId: string, fd: FormData) {
  const { supabase, perfil } = await sesion();
  comprobar(
    (
      await supabase.from("registros_tiempo").insert({
        caso_id: casoId,
        abogado_id: perfil.id,
        fecha: txt(fd, "fecha") ?? new Date().toISOString().slice(0, 10),
        horas: num(fd, "horas"),
        descripcion: txt(fd, "descripcion"),
        tarifa: num(fd, "tarifa") ?? perfil.tarifa_hora ?? 0,
        facturable: fd.get("facturable") === "on",
      })
    ).error,
  );
  revalidatePath(`/casos/${casoId}`);
}

export async function registrarGasto(casoId: string, fd: FormData) {
  const { supabase, perfil } = await sesion();
  comprobar(
    (
      await supabase.from("gastos").insert({
        caso_id: casoId,
        fecha: txt(fd, "fecha") ?? new Date().toISOString().slice(0, 10),
        descripcion: txt(fd, "descripcion"),
        monto: num(fd, "monto"),
        reembolsable: fd.get("reembolsable") === "on",
        registrado_por: perfil.id,
      })
    ).error,
  );
  revalidatePath(`/casos/${casoId}`);
}

export async function vincularSentencia(casoId: string, fd: FormData) {
  const { supabase, perfil } = await sesion();
  comprobar(
    (
      await supabase.from("caso_sentencias").upsert({
        caso_id: casoId,
        sentencia_id: txt(fd, "sentencia_id"),
        relevancia: num(fd, "relevancia") ?? 3,
        nota: txt(fd, "nota"),
        vinculado_por: perfil.id,
      })
    ).error,
  );
  revalidatePath(`/casos/${casoId}`);
}

// ---------------- Facturación ----------------
async function siguienteNumero(supabase: Awaited<ReturnType<typeof sesion>>["supabase"]) {
  const { data } = await supabase.from("facturas").select("numero").order("numero", { ascending: false }).limit(1);
  const n = Number(data?.[0]?.numero?.replace(/\D/g, "") ?? 100) + 1;
  return `F-${String(n).padStart(6, "0")}`;
}

/** Crea un borrador de factura con las horas y gastos reembolsables pendientes del caso. */
export async function facturarCaso(casoId: string) {
  const { supabase, perfil } = await sesion();
  const { data: caso } = await supabase.from("casos").select("id, cliente_id, codigo").eq("id", casoId).single();
  if (!caso) throw new Error("Caso no encontrado");
  const { data: despacho } = await supabase.from("despachos").select("iva_porcentaje").eq("id", perfil.despacho_id).single();
  const { data: horas } = await supabase
    .from("registros_tiempo")
    .select("id, horas, tarifa, abogado:perfiles(nombre)")
    .eq("caso_id", casoId)
    .eq("facturable", true)
    .is("factura_id", null);
  const { data: gastos } = await supabase.from("gastos").select("id, descripcion, monto").eq("caso_id", casoId).eq("reembolsable", true).is("factura_id", null);
  if (!horas?.length && !gastos?.length) throw new Error("No hay horas ni gastos pendientes por facturar en este caso");

  const { data: factura, error } = await supabase
    .from("facturas")
    .insert({
      despacho_id: perfil.despacho_id,
      cliente_id: caso.cliente_id,
      caso_id: caso.id,
      numero: await siguienteNumero(supabase),
      fecha_vencimiento: new Date(Date.now() + 15 * 86_400_000).toISOString().slice(0, 10),
      iva_porcentaje: despacho?.iva_porcentaje ?? 16,
      creado_por: perfil.id,
      notas: `Honorarios profesionales — caso ${caso.codigo}`,
    })
    .select("id")
    .single();
  comprobar(error);

  // Agrupar horas por abogado y tarifa
  const grupos = new Map<string, { descripcion: string; cantidad: number; precio: number }>();
  for (const h of horas ?? []) {
    const nombre = (h.abogado as unknown as { nombre: string } | null)?.nombre ?? "Abogado";
    const clave = `${nombre}|${h.tarifa}`;
    const g = grupos.get(clave) ?? { descripcion: `Horas profesionales — ${nombre}`, cantidad: 0, precio: Number(h.tarifa) };
    g.cantidad += Number(h.horas);
    grupos.set(clave, g);
  }
  const items = [
    ...[...grupos.values()].map((g) => ({ factura_id: factura!.id, descripcion: g.descripcion, cantidad: g.cantidad, precio_unitario: g.precio })),
    ...(gastos ?? []).map((g) => ({ factura_id: factura!.id, descripcion: `Gasto reembolsable: ${g.descripcion}`, cantidad: 1, precio_unitario: Number(g.monto) })),
  ];
  comprobar((await supabase.from("factura_items").insert(items)).error);
  if (horas?.length) comprobar((await supabase.from("registros_tiempo").update({ factura_id: factura!.id }).in("id", horas.map((h) => h.id))).error);
  if (gastos?.length) comprobar((await supabase.from("gastos").update({ factura_id: factura!.id }).in("id", gastos.map((g) => g.id))).error);
  redirect(`/facturacion/${factura!.id}`);
}

export async function crearFacturaManual(fd: FormData) {
  const { supabase, perfil } = await sesion();
  const { data, error } = await supabase
    .from("facturas")
    .insert({
      despacho_id: perfil.despacho_id,
      cliente_id: txt(fd, "cliente_id"),
      caso_id: txt(fd, "caso_id"),
      numero: await siguienteNumero(supabase),
      moneda: txt(fd, "moneda") ?? "USD",
      fecha_vencimiento: new Date(Date.now() + 15 * 86_400_000).toISOString().slice(0, 10),
      creado_por: perfil.id,
    })
    .select("id")
    .single();
  comprobar(error);
  redirect(`/facturacion/${data!.id}`);
}

export async function agregarItem(facturaId: string, fd: FormData) {
  const { supabase } = await sesion();
  comprobar(
    (await supabase.from("factura_items").insert({ factura_id: facturaId, descripcion: txt(fd, "descripcion"), cantidad: num(fd, "cantidad") ?? 1, precio_unitario: num(fd, "precio_unitario") ?? 0 })).error,
  );
  revalidatePath(`/facturacion/${facturaId}`);
}

export async function eliminarItem(facturaId: string, itemId: string) {
  const { supabase } = await sesion();
  comprobar((await supabase.from("factura_items").delete().eq("id", itemId)).error);
  revalidatePath(`/facturacion/${facturaId}`);
}

export async function actualizarFactura(facturaId: string, fd: FormData) {
  const { supabase } = await sesion();
  const cambios: Record<string, unknown> = {};
  if (fd.has("tasa_bcv")) cambios.tasa_bcv = num(fd, "tasa_bcv");
  if (fd.has("numero_control")) cambios.numero_control = txt(fd, "numero_control");
  if (fd.has("notas")) cambios.notas = txt(fd, "notas");
  if (fd.has("igtf")) {
    const { data: f } = await supabase.from("facturas").select("subtotal, iva_porcentaje").eq("id", facturaId).single();
    cambios.igtf_monto = fd.getAll("igtf").includes("on") && f ? Math.round(Number(f.subtotal) * (1 + Number(f.iva_porcentaje) / 100) * 0.03 * 100) / 100 : 0;
  }
  comprobar((await supabase.from("facturas").update(cambios).eq("id", facturaId)).error);
  await supabase.rpc("recalcular_factura", { p_factura: facturaId });
  revalidatePath(`/facturacion/${facturaId}`);
}

export async function cambiarEstadoFactura(facturaId: string, estado: "emitida" | "anulada") {
  const { supabase } = await sesion();
  const cambios: Record<string, unknown> = { estado };
  if (estado === "emitida") cambios.fecha_emision = new Date().toISOString().slice(0, 10);
  comprobar((await supabase.from("facturas").update(cambios).eq("id", facturaId)).error);
  if (estado === "anulada") {
    await supabase.from("registros_tiempo").update({ factura_id: null }).eq("factura_id", facturaId);
    await supabase.from("gastos").update({ factura_id: null }).eq("factura_id", facturaId);
  }
  revalidatePath(`/facturacion/${facturaId}`);
  revalidatePath("/facturacion");
}

export async function registrarPago(facturaId: string, fd: FormData) {
  const { supabase } = await sesion();
  comprobar(
    (
      await supabase.from("pagos").insert({
        factura_id: facturaId,
        fecha: txt(fd, "fecha") ?? new Date().toISOString().slice(0, 10),
        monto: num(fd, "monto"),
        moneda: txt(fd, "moneda") ?? "USD",
        metodo: txt(fd, "metodo") ?? "transferencia",
        referencia: txt(fd, "referencia"),
      })
    ).error,
  );
  revalidatePath(`/facturacion/${facturaId}`);
  revalidatePath("/facturacion");
}

// ---------------- Alertas ----------------
export async function ejecutarAlertasAhora() {
  const { perfil, esGerente } = await sesion();
  if (!esGerente) throw new Error("Solo socios o administradores pueden ejecutar las alertas");
  await procesarAlertas(crearClienteAdmin(), perfil.despacho_id);
  revalidatePath("/alertas");
}
