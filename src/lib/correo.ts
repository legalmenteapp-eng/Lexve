import "@/lib/solo-servidor";

export const ENVIO_REAL = process.env.ALERTAS_ENVIO_REAL === "true";

/**
 * Envía un correo con Resend. Si ALERTAS_ENVIO_REAL no es "true", no envía nada y
 * devuelve "simulado" (útil para pruebas y para no escribir a clientes por error).
 */
export async function enviarCorreo(para: string, asunto: string, html: string): Promise<"enviado" | "simulado"> {
  if (!ENVIO_REAL) return "simulado";
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("Falta RESEND_API_KEY");
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.ALERTAS_REMITENTE, to: [para], subject: asunto, html }),
  });
  if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
  return "enviado";
}
