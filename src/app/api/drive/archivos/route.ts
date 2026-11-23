import { NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/server";
import { idCarpetaDesdeUrl, listarCarpeta } from "@/lib/drive";

export async function GET(req: Request) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const carpetaUrl = new URL(req.url).searchParams.get("carpeta");
  const id = idCarpetaDesdeUrl(carpetaUrl);
  if (!id) return NextResponse.json({ error: "Enlace de carpeta no válido" }, { status: 400 });
  // Solo se listan carpetas registradas en un cliente o caso visible para el usuario
  const [{ count: c1 }, { count: c2 }] = await Promise.all([
    supabase.from("clientes").select("id", { count: "exact", head: true }).eq("drive_folder_id", id),
    supabase.from("casos").select("id", { count: "exact", head: true }).eq("drive_folder_id", id),
  ]);
  if (!c1 && !c2) return NextResponse.json({ error: "Carpeta no asociada a un cliente o caso tuyo" }, { status: 403 });
  try {
    return NextResponse.json({ archivos: await listarCarpeta(id) });
  } catch (e) {
    return NextResponse.json({ error: String(e instanceof Error ? e.message : e) }, { status: 500 });
  }
}
