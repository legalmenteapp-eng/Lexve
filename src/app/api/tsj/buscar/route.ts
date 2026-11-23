import { NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/server";
import { lanzarTrabajo } from "@/lib/lanzar-trabajo";

export const maxDuration = 300; // solo aplica fuera de Netlify (local / Vercel)

export async function POST(req: Request) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { consulta, sala } = await req.json();
  if (!consulta || String(consulta).length < 4) return NextResponse.json({ error: "Escribe una consulta más específica" }, { status: 400 });
  try {
    const trabajo_id = await lanzarTrabajo(supabase, user.id, "busqueda_tsj", { consulta: String(consulta).slice(0, 2000), sala: sala || null }, req);
    return NextResponse.json({ trabajo_id }, { status: 202 });
  } catch (e) {
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e) }, { status: 500 });
  }
}
