import "@/lib/solo-servidor";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { BetaContentBlockParam, BetaMessage } from "@anthropic-ai/sdk/resources/beta/messages/messages";
import { z } from "zod";

export const MODELO = process.env.CLAUDE_MODEL || "claude-opus-5-5";
const BETAS = ["server-side-fallback-2026-07-01"];

let _cliente: Anthropic | null = null;
function cliente() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Falta ANTHROPIC_API_KEY en el servidor");
  _cliente ??= new Anthropic();
  return _cliente;
}

export const SISTEMA_ABOGADO = `Eres un asistente jurídico senior para un despacho de abogados en Venezuela.
Conoces el ordenamiento venezolano: Constitución de 1999 (CRBV), Código Civil, Código de Procedimiento Civil (CPC), Código de Comercio, Código Penal y Código Orgánico Procesal Penal (COPP), LOTTT y Ley Orgánica Procesal del Trabajo, LOPNNA, Código Orgánico Tributario (COT), Ley Orgánica de la Jurisdicción Contencioso Administrativa, Ley de Tierras y Desarrollo Agrario, Ley Orgánica del TSJ, y la jurisprudencia vinculante de la Sala Constitucional del TSJ.
Reglas:
- Responde en español de Venezuela, con lenguaje jurídico claro y preciso.
- Cita artículos y normas cuando sea pertinente. Si no estás seguro de un número de artículo, de una sentencia o de un plazo, dilo expresamente y recomienda verificarlo; nunca inventes números de sentencia, expedientes ni fechas.
- Distingue hechos del expediente, inferencias y recomendaciones.
- Señala plazos procesales relevantes (días de despacho vs. calendario) y riesgos de preclusión, caducidad o prescripción.
- Tu análisis es un apoyo para el abogado, no sustituye su criterio profesional.
Usa Markdown con encabezados breves.`;

function texto(msg: BetaMessage) {
  if (msg.stop_reason === "refusal") return "_El modelo no pudo completar esta solicitud._";
  return msg.content
    .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

/** Análisis libre (caso, documento, sentencia, estrategia, informe). */
export async function analizar(opciones: {
  instruccion: string;
  contexto: string;
  documentos?: { titulo: string; pdfBase64?: string; texto?: string }[];
  esfuerzo?: "low" | "medium" | "high" | "xhigh";
}) {
  const contenido: BetaContentBlockParam[] = [];
  for (const d of opciones.documentos ?? []) {
    if (d.pdfBase64) {
      contenido.push({
        type: "document",
        title: d.titulo,
        source: { type: "base64", media_type: "application/pdf", data: d.pdfBase64 },
      });
    } else if (d.texto) {
      contenido.push({ type: "document", title: d.titulo, source: { type: "text", media_type: "text/plain", data: d.texto } });
    }
  }
  contenido.push({ type: "text", text: `<contexto_del_caso>\n${opciones.contexto}\n</contexto_del_caso>\n\n${opciones.instruccion}` });

  const stream = cliente().beta.messages.stream({
    model: MODELO,
    max_tokens: 32000,
    betas: BETAS,
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: { effort: opciones.esfuerzo ?? "high" },
    system: SISTEMA_ABOGADO,
    messages: [{ role: "user", content: contenido }],
  });
  const msg = await stream.finalMessage();
  return { resultado: texto(msg), modelo: msg.model };
}

const EsquemaSentencia = z.object({
  sala: z.enum(["constitucional", "politico_administrativa", "electoral", "casacion_civil", "casacion_penal", "casacion_social", "plena"]),
  numero: z.string().describe("Número de la sentencia, vacío si no aparece"),
  expediente: z.string(),
  fecha: z.string().describe("YYYY-MM-DD o vacío"),
  ponente: z.string(),
  partes: z.string(),
  materia: z.enum(["civil", "mercantil", "penal", "laboral", "familia", "lopnna", "contencioso_administrativo", "constitucional", "tributario", "agrario", "transito", "maritimo", "otro"]),
  asunto: z.string().describe("Título breve del asunto"),
  resumen: z.string().describe("Resumen de 5-8 líneas de los hechos y la decisión"),
  doctrina: z.string().describe("Criterio jurídico o ratio decidendi establecido"),
});
export type SentenciaExtraida = z.infer<typeof EsquemaSentencia>;

/** Extrae metadatos, resumen y doctrina del texto de una sentencia del TSJ. */
export async function extraerSentencia(textoSentencia: string): Promise<SentenciaExtraida | null> {
  const resp = await cliente().beta.messages.parse({
    model: MODELO,
    max_tokens: 16000,
    betas: BETAS,
    fallbacks: "default",
    output_config: { effort: "medium", format: betaZodOutputFormat(EsquemaSentencia) },
    system: SISTEMA_ABOGADO,
    messages: [
      {
        role: "user",
        content: [
          { type: "document", title: "Sentencia", source: { type: "text", media_type: "text/plain", data: textoSentencia } },
          { type: "text", text: "Extrae los datos de esta sentencia del Tribunal Supremo de Justicia. Usa solo lo que aparece en el texto; deja vacío lo que no conste." },
        ],
      },
    ],
  });
  return resp.parsed_output ?? null;
}

export interface ResultadoTSJ {
  sala: string;
  numero: string;
  expediente: string;
  fecha: string;
  ponente: string;
  asunto: string;
  resumen: string;
  url: string;
}

/**
 * Búsqueda de jurisprudencia en el sitio público del TSJ usando la herramienta de búsqueda web de Claude,
 * restringida a los dominios del TSJ. Devuelve solo resultados con URL verificable.
 */
export async function buscarJurisprudenciaTSJ(consulta: string, sala?: string) {
  let messages: Anthropic.Beta.Messages.BetaMessageParam[] = [
    {
      role: "user",
      content: `Busca en el sitio del Tribunal Supremo de Justicia de Venezuela (tsj.gob.ve) sentencias relevantes para: "${consulta}"${
        sala ? ` (preferiblemente de la ${sala})` : ""
      }.
Devuelve entre 3 y 8 resultados. Incluye SOLO sentencias cuya URL hayas visto en los resultados de búsqueda; no inventes números ni URLs.
Al final responde con un bloque \`\`\`json que contenga un arreglo de objetos con las claves: sala, numero, expediente, fecha (YYYY-MM-DD si se conoce), ponente, asunto, resumen (2-3 líneas sobre lo decidido y su relevancia para la consulta), url.`,
    },
  ];
  let msg: BetaMessage | null = null;
  // La búsqueda web puede pausar el turno (pause_turn); se reanuda hasta 3 veces.
  for (let i = 0; i < 4; i++) {
    msg = await cliente()
      .beta.messages.stream({
        model: MODELO,
        max_tokens: 16000,
        betas: BETAS,
        fallbacks: "default",
        thinking: { type: "adaptive" },
        output_config: { effort: "medium" },
        system: SISTEMA_ABOGADO,
        tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 6, allowed_domains: ["tsj.gob.ve"] }],
        messages,
      })
      .finalMessage();
    if (msg.stop_reason !== "pause_turn") break;
    messages = [...messages, { role: "assistant", content: msg.content }];
  }
  const salida = msg ? texto(msg) : "";
  const bloque = salida.match(/```json\s*([\s\S]*?)```/);
  let resultados: ResultadoTSJ[] = [];
  if (bloque) {
    try {
      const datos = JSON.parse(bloque[1]);
      if (Array.isArray(datos)) resultados = datos.filter((r) => typeof r?.url === "string" && /tsj\.gob\.ve/.test(r.url));
    } catch {
      /* respuesta sin JSON válido */
    }
  }
  const comentario = salida.replace(/```json[\s\S]*?```/, "").trim();
  return { resultados, comentario, modelo: msg?.model ?? MODELO };
}
