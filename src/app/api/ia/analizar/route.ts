import { NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/server";
import { INSTRUCCIONES } from "@/lib/trabajos";
import { lanzarTrabajo } from "@/lib/lanzar-trabajo";

export const maxDuration = 300; // solo aplica fuera de Netlify (local / Vercel)

/** Valida permisos y crea el trabajo de análisis. Responde al instante con { trabajo_id }. */
export async function POST(req: Request) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { caso_id, tipo, pregunta, documento_id } = await req.json();
  if (!INSTRUCCIONES[tipo]) return NextResponse.json({ error: "Tipo de análisis no válido" }, { status: 400 });

  // RLS: solo se encuentran casos y documentos a los que el abogado tiene acceso
  const { data: caso } = await supabase.from("casos").select("id").eq("id", caso_id).maybeSingle();
  if (!caso) return NextResponse.json({ error: "Caso no encontrado o sin acceso" }, { status: 404 });
  if (tipo === "documento") {
    const { data: doc } = await supabase.from("documentos").select("id").eq("id", documento_id).eq("caso_id", caso_id).maybeSingle();
    if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  }

  try {
    const trabajo_id = await lanzarTrabajo(
      supabase,
      user.id,
      "analisis",
      { caso_id, tipo, pregunta: pregunta ? String(pregunta).slice(0, 4000) : "", documento_id: tipo === "documento" ? documento_id : null },
      req,
    );
    return NextResponse.json({ trabajo_id }, { status: 202 });
  } catch (e) {
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e) }, { status: 500 });
  }
}
