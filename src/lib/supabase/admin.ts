import "@/lib/solo-servidor";
import { createClient } from "@supabase/supabase-js";

/** Cliente con service role: SOLO para tareas de servidor sin usuario (cron de alertas). */
export function crearClienteAdmin() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    db: { schema: "legal" },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
