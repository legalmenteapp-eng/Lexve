import type { Config } from "@netlify/functions";
import { crearClienteAdmin } from "../../src/lib/supabase/admin";
import { procesarAlertas } from "../../src/lib/alertas";

/** Sustituye al cron de vercel.json: todos los días a las 11:00 UTC (7:00 a. m. en Caracas). */
export default async () => {
  const r = await procesarAlertas(crearClienteAdmin());
  console.log("Alertas procesadas:", JSON.stringify(r));
};

export const config: Config = { schedule: "0 11 * * *" };
