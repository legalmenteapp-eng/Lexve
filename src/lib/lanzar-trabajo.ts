import "@/lib/solo-servidor";
import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ejecutarTrabajo, type TipoTrabajo } from "@/lib/trabajos";
import { crearClienteAdmin } from "@/lib/supabase/admin";

/** "netlify" cuando el build corre en Netlify (lo fija next.config.mjs); si no, "local" (npm run dev, Vercel…). */
const EJECUTOR = process.env.LEXVE_EJECUTOR ?? "local";
export const FUNCION_SEGUNDO_PLANO = "/.netlify/functions/trabajo-ia-background";

/**
 * Crea el trabajo con el cliente del usuario (RLS) y lo pone a correr en segundo plano.
 * Devuelve el id para que la pantalla consulte su estado.
 */
export async function lanzarTrabajo(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  usuarioId: string,
  tipo: TipoTrabajo,
  parametros: Record<string, unknown>,
  req: Request,
): Promise<string> {
  const { data, error } = await supabase
    .from("trabajos_ia")
    .insert({ tipo, parametros, creado_por: usuarioId })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const id = data.id as string;

  if (EJECUTOR === "netlify") {
    const secreto = process.env.CRON_SECRET;
    const base = process.env.URL && process.env.CONTEXT === "production" ? process.env.URL : new URL(req.url).origin;
    let fallo: string | null = secreto ? null : "Falta CRON_SECRET en las variables de entorno de Netlify";
    if (!fallo) {
      try {
        const r = await fetch(base + FUNCION_SEGUNDO_PLANO, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-lexve-secreto": secreto! },
          body: JSON.stringify({ id }),
        });
        // Las funciones en segundo plano responden 202 de inmediato
        if (r.status !== 202 && !r.ok) fallo = `La función en segundo plano respondió ${r.status}`;
      } catch (e) {
        fallo = `No se pudo iniciar la función en segundo plano: ${e}`;
      }
    }
    if (fallo) {
      await crearClienteAdmin().from("trabajos_ia").update({ estado: "error", error: fallo }).eq("id", id).eq("estado", "pendiente");
    }
  } else {
    // Fuera de Netlify: se ejecuta después de responder, dentro de la misma función
    after(() => ejecutarTrabajo(id));
  }
  return id;
}
