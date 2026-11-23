import { ejecutarTrabajo } from "../../src/lib/trabajos";

/**
 * Función en SEGUNDO PLANO de Netlify (el sufijo -background la hace asíncrona: hasta 15 min).
 * La llama src/lib/lanzar-trabajo.ts con el id de un trabajo ya validado.
 * Requiere un plan de Netlify con Background Functions (Pro o superior).
 */
export default async (req: Request) => {
  const secreto = process.env.CRON_SECRET;
  if (!secreto || req.headers.get("x-lexve-secreto") !== secreto) {
    console.warn("trabajo-ia-background: petición no autorizada");
    return;
  }
  const { id } = (await req.json().catch(() => ({}))) as { id?: string };
  if (!id) return;
  await ejecutarTrabajo(id); // nunca lanza: los errores quedan guardados en el trabajo
};
