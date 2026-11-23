import { NextResponse } from "next/server";
import { crearClienteServidor } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  const { caso_id, archivo } = await req.json();
  const { error } = await supabase.from("documentos").insert({
    caso_id,
    nombre: archivo.name,
    mime_type: archivo.mimeType,
    origen: "drive",
    drive_file_id: archivo.id,
    url: archivo.webViewLink,
    subido_por: user.id,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
