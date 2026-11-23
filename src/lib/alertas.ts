/* eslint-disable @typescript-eslint/no-explicit-any */
import "@/lib/solo-servidor";
import type { SupabaseClient } from "@supabase/supabase-js";
import { enviarCorreo } from "./correo";
import { fecha } from "./formato";

/**
 * Genera alertas de correo para los plazos que entran en su ventana de aviso
 * (p. ej. 7, 3 y 1 días antes) y para los vencidos, y luego procesa la cola.
 * Idempotente: la restricción única (plazo, destinatario, dias_antes) evita duplicados.
 */
export async function procesarAlertas(db: SupabaseClient<any, any, any>, despachoId?: string) {
  let consulta = db
    .from("plazos")
    .select("id, titulo, descripcion, fecha_vencimiento, dias_aviso, responsable_id, caso:casos!inner(id, codigo, titulo, despacho_id, numero_expediente, tribunal)")
    .eq("completado", false)
    .lte("fecha_vencimiento", new Date(Date.now() + 31 * 86_400_000).toISOString());
  if (despachoId) consulta = consulta.eq("caso.despacho_id", despachoId);
  const { data: plazos, error } = await consulta;
  if (error) throw error;

  const nuevas: Record<string, unknown>[] = [];
  for (const p of plazos ?? []) {
    const caso = p.caso as unknown as { id: string; codigo: string; titulo: string; despacho_id: string; numero_expediente: string | null; tribunal: string | null };
    const dias = Math.ceil((new Date(p.fecha_vencimiento).getTime() - Date.now()) / 86_400_000);
    const avisos: number[] = [...(p.dias_aviso ?? [7, 3, 1])].sort((a, b) => a - b);
    const umbral = dias < 0 ? -1 : avisos.find((d) => dias <= d);
    if (umbral === undefined) continue;

    const { data: equipo } = await db.from("caso_abogados").select("perfil:perfiles(email, nombre, activo)").eq("caso_id", caso.id);
    const destinatarios = new Set<string>();
    for (const e of equipo ?? []) {
      const perfil = e.perfil as unknown as { email: string; activo: boolean } | null;
      if (perfil?.activo) destinatarios.add(perfil.email);
    }
    if (p.responsable_id) {
      const { data: r } = await db.from("perfiles").select("email").eq("id", p.responsable_id).single();
      if (r?.email) destinatarios.add(r.email);
    }
    const cuando = dias < 0 ? `VENCIDO hace ${-dias} día(s)` : dias === 0 ? "vence HOY" : `vence en ${dias} día(s)`;
    for (const email of destinatarios) {
      nuevas.push({
        despacho_id: caso.despacho_id,
        plazo_id: p.id,
        caso_id: caso.id,
        destinatario: email,
        dias_antes: umbral,
        asunto: `[LexVE] ${caso.codigo}: ${p.titulo} — ${cuando}`,
        cuerpo: `<p><strong>${p.titulo}</strong> ${cuando} (${fecha(p.fecha_vencimiento, true)}).</p>
<p>Caso <strong>${caso.codigo}</strong> — ${caso.titulo}<br/>Expediente: ${caso.numero_expediente ?? "—"}<br/>Tribunal: ${caso.tribunal ?? "—"}</p>
${p.descripcion ? `<p>${p.descripcion}</p>` : ""}
<p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? ""}/casos/${caso.id}?tab=plazos">Abrir el caso en LexVE</a></p>`,
      });
    }
  }
  if (nuevas.length) {
    const { error: e2 } = await db.from("alertas_correo").upsert(nuevas, { onConflict: "plazo_id,destinatario,dias_antes", ignoreDuplicates: true });
    if (e2) throw e2;
  }

  let pendientesQ = db.from("alertas_correo").select("*").eq("estado", "pendiente").lte("programado_para", new Date().toISOString()).limit(200);
  if (despachoId) pendientesQ = pendientesQ.eq("despacho_id", despachoId);
  const { data: pendientes } = await pendientesQ;
  let enviados = 0,
    simulados = 0,
    errores = 0;
  for (const a of pendientes ?? []) {
    try {
      const estado = await enviarCorreo(a.destinatario, a.asunto, a.cuerpo);
      estado === "enviado" ? enviados++ : simulados++;
      await db.from("alertas_correo").update({ estado, enviado_en: new Date().toISOString() }).eq("id", a.id);
    } catch (err) {
      errores++;
      await db.from("alertas_correo").update({ estado: "error", error: String(err) }).eq("id", a.id);
    }
  }
  return { generadas: nuevas.length, enviados, simulados, errores };
}
