import { NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/server";

/** Estado de un trabajo de IA (RLS: cada usuario solo ve los suyos). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.from("trabajos_ia").select("id, estado, resultado, error").eq("id", id).maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Trabajo no encontrado" }, { status: 404 });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
