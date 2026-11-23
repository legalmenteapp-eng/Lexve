import "@/lib/solo-servidor";
import { GoogleAuth } from "google-auth-library";

/**
 * Integración con Google Drive mediante una cuenta de servicio.
 * Cada cliente/caso guarda el enlace de su carpeta; el cliente comparte esa carpeta
 * (lectura) con el correo de la cuenta de servicio y LexVE puede listar y leer sus archivos.
 */
let auth: GoogleAuth | null = null;

export function driveConfigurado() {
  return Boolean(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
}

export function cuentaServicioEmail(): string | null {
  try {
    return JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON || "{}").client_email ?? null;
  } catch {
    return null;
  }
}

async function token() {
  if (!driveConfigurado()) throw new Error("Google Drive no está configurado (GOOGLE_SERVICE_ACCOUNT_JSON)");
  auth ??= new GoogleAuth({
    credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!),
    scopes: ["https://www.googleapis.com/auth/drive.readonly"],
  });
  const t = await auth.getAccessToken();
  if (!t) throw new Error("No se pudo obtener token de Google");
  return t;
}

export function idCarpetaDesdeUrl(url: string | null | undefined) {
  if (!url) return null;
  const m = url.match(/folders\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

export function idArchivoDesdeUrl(url: string | null | undefined) {
  if (!url) return null;
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  return m ? m[1] : null;
}

export interface ArchivoDrive {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink: string;
  size?: string;
}

export async function listarCarpeta(folderId: string): Promise<ArchivoDrive[]> {
  const q = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  const campos = encodeURIComponent("files(id,name,mimeType,modifiedTime,webViewLink,size)");
  const r = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${campos}&orderBy=modifiedTime desc&pageSize=100&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    { headers: { Authorization: `Bearer ${await token()}` }, cache: "no-store" },
  );
  if (!r.ok) throw new Error(`Drive respondió ${r.status}: ${await r.text()}`);
  return (await r.json()).files ?? [];
}

/** Descarga un archivo para análisis: PDF en base64 o texto plano (Google Docs se exportan a texto). */
export async function leerArchivo(fileId: string): Promise<{ nombre: string; mime: string; pdfBase64?: string; texto?: string }> {
  const t = await token();
  const meta = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType&supportsAllDrives=true`, {
    headers: { Authorization: `Bearer ${t}` },
  }).then((r) => r.json());
  if (meta.error) throw new Error(meta.error.message);
  const mime: string = meta.mimeType;
  if (mime === "application/vnd.google-apps.document") {
    const texto = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/plain`, {
      headers: { Authorization: `Bearer ${t}` },
    }).then((r) => r.text());
    return { nombre: meta.name, mime, texto };
  }
  const r = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`, {
    headers: { Authorization: `Bearer ${t}` },
  });
  if (!r.ok) throw new Error(`No se pudo descargar el archivo (${r.status})`);
  const buf = Buffer.from(await r.arrayBuffer());
  if (mime === "application/pdf") return { nombre: meta.name, mime, pdfBase64: buf.toString("base64") };
  if (mime.startsWith("text/")) return { nombre: meta.name, mime, texto: buf.toString("utf-8") };
  throw new Error(`Formato no soportado para análisis: ${mime}. Usa PDF, Google Docs o texto.`);
}
