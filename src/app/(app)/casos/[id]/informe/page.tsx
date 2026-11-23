import Link from "next/link";
import { notFound } from "next/navigation";
import { sesion } from "@/lib/auth";
import { Markdown } from "@/components/Markdown";
import { BotonImprimir } from "@/components/BotonImprimir";
import { dinero, fecha } from "@/lib/formato";
import { ESTADOS_CASO, MATERIAS, ROLES_EN_CASO, SALAS_TSJ, TIPOS_ACTUACION } from "@/lib/tipos";

/** Informe imprimible del caso (Imprimir → Guardar como PDF). */
export default async function InformeCaso({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, perfil } = await sesion();
  const { data: c } = await supabase.from("v_casos_resumen").select("*").eq("id", id).single();
  if (!c) notFound();
  const [{ data: equipo }, { data: act }, { data: plazos }, { data: sent }, { data: ia }, { data: despacho }] = await Promise.all([
    supabase.from("caso_abogados").select("rol, abogado:perfiles(nombre, inpreabogado)").eq("caso_id", id),
    supabase.from("actuaciones").select("fecha, tipo, titulo, descripcion").eq("caso_id", id).order("fecha"),
    supabase.from("plazos").select("titulo, fecha_vencimiento, completado").eq("caso_id", id).eq("completado", false).order("fecha_vencimiento"),
    supabase.from("caso_sentencias").select("nota, sentencia:sentencias(sala, numero, fecha, asunto, doctrina)").eq("caso_id", id),
    supabase.from("analisis_ia").select("tipo, resultado, creado_en").eq("caso_id", id).in("tipo", ["caso", "informe", "estrategia"]).order("creado_en", { ascending: false }).limit(1),
    supabase.from("despachos").select("nombre").eq("id", perfil.despacho_id).single(),
  ]);
  return (
    <>
      <div className="no-imprimir mb-4 flex gap-2">
        <Link href={`/casos/${id}`} className="text-sm text-slate-500 hover:underline">
          ← Volver al caso
        </Link>
        <div className="ml-auto flex gap-2">
          <Link href={`/casos/${id}?tab=ia`} className="btn-sec">
            ✦ Generar resumen IA
          </Link>
          <BotonImprimir texto="🖨 Imprimir / Guardar PDF" />
        </div>
      </div>
      <article className="tarjeta mx-auto max-w-3xl space-y-6 text-sm">
        <header className="border-b border-slate-200 pb-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">{despacho?.nombre} · Informe del caso · {fecha(new Date())}</div>
          <h1 className="mt-1 text-xl font-semibold text-marca-900">
            {c.codigo} — {c.titulo}
          </h1>
          <p className="text-slate-600">
            Cliente: {c.cliente_nombre} · {MATERIAS[c.materia]} · {ESTADOS_CASO[c.estado]}
            {c.etapa ? ` (${c.etapa})` : ""}
          </p>
          <p className="text-slate-600">
            Expediente {c.numero_expediente ?? "—"} · {c.tribunal ?? "—"} · Contraparte: {c.contraparte ?? "—"}
          </p>
        </header>
        <section>
          <h2 className="mb-1 font-semibold text-marca-900">Equipo</h2>
          <p>
            {equipo
              ?.map((e) => {
                const a = e.abogado as unknown as { nombre: string; inpreabogado: string | null };
                return `${a.nombre} (${ROLES_EN_CASO[e.rol]}${a.inpreabogado ? `, Inpre. ${a.inpreabogado}` : ""})`;
              })
              .join(" · ")}
          </p>
        </section>
        {c.descripcion && (
          <section>
            <h2 className="mb-1 font-semibold text-marca-900">Hechos</h2>
            <p className="whitespace-pre-line">{c.descripcion}</p>
          </section>
        )}
        <section>
          <h2 className="mb-1 font-semibold text-marca-900">Cronología procesal</h2>
          <table className="tabla">
            <tbody>
              {act?.map((a, i) => (
                <tr key={i}>
                  <td className="whitespace-nowrap">{fecha(a.fecha)}</td>
                  <td>{TIPOS_ACTUACION[a.tipo]}</td>
                  <td>
                    {a.titulo}
                    {a.descripcion ? <div className="text-xs text-slate-500">{a.descripcion}</div> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section>
          <h2 className="mb-1 font-semibold text-marca-900">Próximos plazos</h2>
          <ul className="list-disc pl-5">
            {plazos?.map((p, i) => (
              <li key={i}>
                {fecha(p.fecha_vencimiento, true)} — {p.titulo}
              </li>
            ))}
            {!plazos?.length && <li>Sin plazos pendientes.</li>}
          </ul>
        </section>
        {!!sent?.length && (
          <section>
            <h2 className="mb-1 font-semibold text-marca-900">Jurisprudencia de apoyo</h2>
            <ul className="list-disc pl-5">
              {sent.map((s, i) => {
                const x = s.sentencia as unknown as { sala: string; numero: string; fecha: string; asunto: string; doctrina: string };
                return (
                  <li key={i}>
                    {SALAS_TSJ[x.sala]}, sent. {x.numero} ({fecha(x.fecha)}): {x.asunto}
                    {x.doctrina ? <div className="text-xs italic text-slate-500">{x.doctrina}</div> : null}
                  </li>
                );
              })}
            </ul>
          </section>
        )}
        <section>
          <h2 className="mb-1 font-semibold text-marca-900">Resumen económico</h2>
          <p>
            Horas registradas: {Number(c.horas_totales).toFixed(1)} · Pendiente por facturar: {dinero(c.por_facturar)}
            {c.cuantia ? ` · Cuantía: ${dinero(c.cuantia, c.moneda)}` : ""}
          </p>
        </section>
        {ia?.[0] && (
          <section>
            <h2 className="mb-1 font-semibold text-marca-900">Último análisis ({fecha(ia[0].creado_en)})</h2>
            <Markdown texto={ia[0].resultado} />
          </section>
        )}
        <footer className="border-t border-slate-200 pt-3 text-xs text-slate-400">Documento confidencial — secreto profesional abogado-cliente.</footer>
      </article>
    </>
  );
}
