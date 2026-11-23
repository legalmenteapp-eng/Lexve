import "@/lib/solo-servidor";
import { crearClienteAdmin } from "@/lib/supabase/admin";
import { analizar, buscarJurisprudenciaTSJ, extraerSentencia } from "@/lib/ia";
import { driveConfigurado, leerArchivo } from "@/lib/drive";
import { descargarSentencia, salaDesdeUrl } from "@/lib/tsj";
import { fecha } from "@/lib/formato";

/**
 * Trabajos de IA en segundo plano.
 *
 * Las rutas /api/ia/analizar, /api/tsj/buscar y /api/tsj/importar validan al usuario y sus permisos
 * (con RLS) y crean una fila en legal.trabajos_ia. Después se llama a `ejecutarTrabajo`:
 *  - en Netlify, desde la función en segundo plano netlify/functions/trabajo-ia-background.mts (hasta 15 min);
 *  - en local o en Vercel, con `after()` de Next.js dentro de la misma petición.
 * La pantalla consulta /api/ia/trabajos/[id] hasta que el estado sea "completado" o "error".
 *
 * Como aquí se usa service_role (sin RLS), los permisos se comprueban ANTES de crear el trabajo
 * y los parámetros guardados no se pueden modificar después (los usuarios no tienen UPDATE).
 */

export type TipoTrabajo = "analisis" | "busqueda_tsj" | "importar_tsj";

export const INSTRUCCIONES: Record<string, string> = {
  caso: `Elabora un análisis integral del caso con estas secciones: 1) Resumen de hechos y estado procesal, 2) Cuestiones jurídicas y normas aplicables, 3) Fortalezas y debilidades de nuestra posición, 4) Riesgos procesales (lapsos, preclusión, perención, caducidad), 5) Recomendaciones y próximos pasos concretos con responsables sugeridos.`,
  estrategia: `Propón una estrategia procesal: objetivos, alternativas (incluida la autocomposición: transacción, convenimiento, mediación), pruebas a promover, escritos a preparar y un cronograma de próximos pasos con sus lapsos legales.`,
  riesgo: `Evalúa riesgos del caso: probabilidad estimada de éxito (baja/media/alta con justificación), exposición económica, riesgos procesales y reputacionales, y medidas de mitigación.`,
  documento: `Analiza el documento adjunto en el contexto del caso: tipo de documento y propósito, puntos clave, plazos o fechas que genera, riesgos o defectos (forma y fondo), argumentos de la contraparte si aplica, y acciones recomendadas.`,
  informe: `Redacta un informe de avance dirigido al cliente, en lenguaje claro y sin tecnicismos innecesarios: situación actual, lo que se ha hecho, próximos pasos y fechas importantes, y qué se necesita del cliente.`,
};

type Db = ReturnType<typeof crearClienteAdmin>;

/** Procesa un trabajo pendiente. Nunca lanza: los errores quedan guardados en el propio trabajo. */
export async function ejecutarTrabajo(id: string) {
  const db = crearClienteAdmin();
  // Reclamo atómico: solo una ejecución puede pasar de "pendiente" a "procesando".
  const { data: trabajo } = await db
    .from("trabajos_ia")
    .update({ estado: "procesando" })
    .eq("id", id)
    .eq("estado", "pendiente")
    .select("*")
    .maybeSingle();
  if (!trabajo) return;

  try {
    const p = trabajo.parametros ?? {};
    let resultado: unknown;
    if (trabajo.tipo === "analisis") resultado = await procesarAnalisis(db, p, trabajo.creado_por);
    else if (trabajo.tipo === "busqueda_tsj") resultado = await procesarBusqueda(db, p, trabajo.creado_por);
    else if (trabajo.tipo === "importar_tsj") resultado = await procesarImportacion(db, p, trabajo.creado_por);
    else throw new Error(`Tipo de trabajo desconocido: ${trabajo.tipo}`);
    await db.from("trabajos_ia").update({ estado: "completado", resultado }).eq("id", id);
  } catch (e) {
    const mensaje = String(e instanceof Error ? e.message : e).slice(0, 2000);
    await db.from("trabajos_ia").update({ estado: "error", error: mensaje }).eq("id", id);
  }
}

async function procesarAnalisis(db: Db, p: { caso_id: string; tipo: string; pregunta?: string; documento_id?: string }, usuario: string) {
  const { caso_id, tipo, pregunta, documento_id } = p;
  if (!INSTRUCCIONES[tipo]) throw new Error("Tipo de análisis no válido");

  const { data: caso } = await db.from("v_casos_resumen").select("*").eq("id", caso_id).single();
  if (!caso) throw new Error("Caso no encontrado");

  const [{ data: actuaciones }, { data: plazos }, { data: sentencias }, { data: docs }] = await Promise.all([
    db.from("actuaciones").select("fecha, tipo, titulo, descripcion").eq("caso_id", caso_id).order("fecha"),
    db.from("plazos").select("titulo, tipo, fecha_vencimiento, completado, descripcion").eq("caso_id", caso_id).order("fecha_vencimiento"),
    db.from("caso_sentencias").select("nota, sentencia:sentencias(sala, numero, fecha, asunto, doctrina, url)").eq("caso_id", caso_id),
    db.from("documentos").select("id, nombre, tipo, contenido_texto, drive_file_id").eq("caso_id", caso_id),
  ]);

  const contexto = [
    `Caso ${caso.codigo}: ${caso.titulo}`,
    `Materia: ${caso.materia} · Estado: ${caso.estado} · Etapa: ${caso.etapa ?? "—"}`,
    `Cliente: ${caso.cliente_nombre} · Contraparte: ${caso.contraparte ?? "—"}`,
    `Tribunal: ${caso.tribunal ?? "—"} (${caso.circunscripcion ?? "—"}) · Expediente: ${caso.numero_expediente ?? "—"}`,
    `Cuantía: ${caso.cuantia ?? "—"} ${caso.moneda ?? ""} · Fecha de inicio: ${caso.fecha_inicio}`,
    `Hechos: ${caso.descripcion ?? "—"}`,
    `\nSeguimiento (actuaciones):\n${(actuaciones ?? []).map((a) => `- ${fecha(a.fecha)} [${a.tipo}] ${a.titulo}${a.descripcion ? `: ${a.descripcion}` : ""}`).join("\n") || "—"}`,
    `\nPlazos:\n${(plazos ?? []).map((x) => `- ${fecha(x.fecha_vencimiento)} ${x.titulo} (${x.completado ? "cumplido" : "pendiente"})${x.descripcion ? ` — ${x.descripcion}` : ""}`).join("\n") || "—"}`,
    `\nJurisprudencia vinculada:\n${
      (sentencias ?? [])
        .map((s) => {
          const x = s.sentencia as unknown as { sala: string; numero: string; fecha: string; asunto: string; doctrina: string };
          return `- ${x.sala} N.º ${x.numero} (${x.fecha}): ${x.asunto}. Doctrina: ${x.doctrina ?? "—"}${s.nota ? ` · Nota: ${s.nota}` : ""}`;
        })
        .join("\n") || "—"
    }`,
    `\nDocumentos del expediente: ${(docs ?? []).map((d) => `${d.nombre} (${d.tipo ?? "—"})`).join("; ") || "—"}`,
    `\nFecha de hoy: ${fecha(new Date())}`,
  ].join("\n");

  const documentos: { titulo: string; pdfBase64?: string; texto?: string }[] = [];
  let doc: { id: string; nombre: string; contenido_texto: string | null; drive_file_id: string | null } | undefined;
  if (tipo === "documento") {
    doc = docs?.find((d) => d.id === documento_id);
    if (!doc) throw new Error("Documento no encontrado en este caso");
    if (doc.drive_file_id && driveConfigurado()) {
      try {
        const a = await leerArchivo(doc.drive_file_id);
        documentos.push({ titulo: doc.nombre, pdfBase64: a.pdfBase64, texto: a.texto });
      } catch (e) {
        if (!doc.contenido_texto) throw new Error(`No se pudo leer desde Drive: ${e}`);
      }
    }
    if (!documentos.length && doc.contenido_texto) documentos.push({ titulo: doc.nombre, texto: doc.contenido_texto });
    if (!documentos.length) throw new Error("El documento no tiene texto ni acceso por Drive");
  }

  const instruccion = INSTRUCCIONES[tipo] + (pregunta ? `\n\nPregunta específica del abogado: ${pregunta}` : "");
  const { resultado, modelo } = await analizar({ instruccion, contexto, documentos, esfuerzo: tipo === "informe" ? "medium" : "high" });
  const { error } = await db.from("analisis_ia").insert({
    caso_id,
    documento_id: doc?.id ?? null,
    tipo,
    pregunta: pregunta || (doc ? `Análisis de: ${doc.nombre}` : null),
    resultado,
    modelo,
    creado_por: usuario,
  });
  if (error) throw new Error(error.message);
  if (doc) await db.from("documentos").update({ resumen_ia: resultado.slice(0, 4000) }).eq("id", doc.id);
  return { resultado };
}

async function procesarBusqueda(db: Db, p: { consulta: string; sala?: string }, usuario: string) {
  const r = await buscarJurisprudenciaTSJ(String(p.consulta), p.sala || undefined);
  await db.from("analisis_ia").insert({
    tipo: "busqueda_tsj",
    pregunta: p.consulta,
    resultado: r.comentario || `${r.resultados.length} resultado(s)`,
    datos: r.resultados,
    modelo: r.modelo,
    creado_por: usuario,
  });
  return r;
}

async function procesarImportacion(
  db: Db,
  p: { url: string; caso_id?: string; datos?: Record<string, string | undefined> },
  usuario: string,
) {
  const { url, caso_id, datos } = p;
  const { data: existente } = await db.from("sentencias").select("id").eq("url", url).maybeSingle();
  let sentenciaId = existente?.id as string | undefined;

  if (!sentenciaId) {
    let texto: string | null = null;
    let extra: Awaited<ReturnType<typeof extraerSentencia>> = null;
    try {
      texto = await descargarSentencia(url);
      extra = await extraerSentencia(texto.slice(0, 400_000));
    } catch (e) {
      // Si el TSJ no responde, se guarda con los datos que trajo la búsqueda
      if (!datos) throw new Error(`No se pudo descargar la sentencia: ${e}`);
    }
    const fechaValida = (v?: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null);
    const fila = {
      sala: extra?.sala ?? salaDesdeUrl(url) ?? "constitucional",
      numero: extra?.numero || datos?.numero || null,
      expediente: extra?.expediente || datos?.expediente || null,
      fecha: fechaValida(extra?.fecha) ?? fechaValida(datos?.fecha),
      ponente: extra?.ponente || datos?.ponente || null,
      partes: extra?.partes || null,
      materia: extra?.materia ?? null,
      asunto: extra?.asunto || datos?.asunto || null,
      resumen: extra?.resumen || datos?.resumen || null,
      doctrina: extra?.doctrina || null,
      url,
      texto,
      fuente: extra ? "tsj" : "ia_busqueda",
    };
    const { data, error } = await db.from("sentencias").insert(fila).select("id").single();
    if (error) throw new Error(error.message);
    sentenciaId = data.id;
  }

  if (caso_id) {
    await db.from("caso_sentencias").upsert({ caso_id, sentencia_id: sentenciaId, relevancia: 3, vinculado_por: usuario });
  }
  return { id: sentenciaId };
}
