import { NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/server";
import { esUrlTSJ } from "@/lib/tsj";
import { lanzarTrabajo } from "@/lib/lanzar-trabajo";

export const maxDuration = 300; // solo aplica fuera de Netlify (local / Vercel)

/** Importa una sentencia desde su URL en tsj.gob.ve (descarga + extracción con IA en segundo plano). */
export async function POST(req: Request) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { url, caso_id, datos } = await req.json();
  if (!url || !esUrlTSJ(url)) return NextResponse.json({ error: "Indica una URL de tsj.gob.ve" }, { status: 400 });

  // Mismos permisos que antes: hay que pertenecer a un despacho y, si se vincula, poder ver el caso
  const { data: despacho } = await supabase.rpc("mi_despacho");
  if (!despacho) return NextResponse.json({ error: "Sin despacho asignado" }, { status: 403 });
  if (caso_id) {
    const { data: caso } = await supabase.from("casos").select("id").eq("id", caso_id).maybeSingle();
    if (!caso) return NextResponse.json({ error: "Caso no encontrado o sin acceso" }, { status: 404 });
  }

  try {
    const trabajo_id = await lanzarTrabajo(supabase, user.id, "importar_tsj", { url, caso_id: caso_id || null, datos: datos ?? null }, req);
    return NextResponse.json({ trabajo_id }, { status: 202 });
  } catch (e) {
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e) }, { status: 500 });
  }
}
