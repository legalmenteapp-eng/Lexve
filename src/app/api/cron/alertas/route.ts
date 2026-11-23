import { NextResponse } from "next/server";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { procesarAlertas } from "@/lib/alertas";

export const maxDuration = 120;

/** Ejecución manual o desde Vercel Cron (vercel.json). En Netlify corre netlify/functions/alertas-diarias.mts. Protegido con CRON_SECRET. */
export async function GET(req: Request) {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || req.headers.get("authorization") !== `Bearer ${secreto}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  try {
    return NextResponse.json(await procesarAlertas(crearClienteAdmin()));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
