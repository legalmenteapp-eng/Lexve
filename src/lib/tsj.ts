import "@/lib/solo-servidor";

/** Salas del TSJ y su código en el portal histórico (historico.tsj.gob.ve/decisiones/<codigo>/...). */
export const CODIGO_SALA: Record<string, string> = {
  scon: "constitucional",
  spa: "politico_administrativa",
  selec: "electoral",
  scc: "casacion_civil",
  scp: "casacion_penal",
  scs: "casacion_social",
  tplen: "plena",
};

export function esUrlTSJ(url: string) {
  try {
    const u = new URL(url);
    return /(^|\.)tsj\.gob\.ve$/.test(u.hostname);
  } catch {
    return false;
  }
}

export function salaDesdeUrl(url: string): string | null {
  const m = url.match(/decisiones\/(scon|spa|selec|scc|scp|scs|tplen)\//i);
  return m ? CODIGO_SALA[m[1].toLowerCase()] : null;
}

/** Descarga una sentencia publicada en tsj.gob.ve y devuelve su texto plano. */
export async function descargarSentencia(url: string) {
  if (!esUrlTSJ(url)) throw new Error("La URL debe pertenecer a tsj.gob.ve");
  const r = await fetch(url, { headers: { "User-Agent": "LexVE/1.0 (consulta jurisprudencial)" }, cache: "no-store" });
  if (!r.ok) throw new Error(`El TSJ respondió ${r.status}`);
  const buffer = Buffer.from(await r.arrayBuffer());
  // Las sentencias históricas suelen venir en windows-1252
  const tipo = r.headers.get("content-type") ?? "";
  const html = new TextDecoder(/utf-8/i.test(tipo) ? "utf-8" : "windows-1252").decode(buffer);
  return htmlATexto(html);
}

export function htmlATexto(html: string) {
  return html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h\d|li|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&[a-z]+;/gi, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n\n")
    .trim();
}
