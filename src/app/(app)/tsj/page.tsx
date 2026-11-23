import Link from "next/link";
import { sesion } from "@/lib/auth";
import { Select, Titulo, Vacio } from "@/components/ui";
import { BuscadorTSJ } from "@/components/BuscadorTSJ";
import { fecha } from "@/lib/formato";
import { SALAS_TSJ } from "@/lib/tipos";

export default async function TSJ({ searchParams }: { searchParams: Promise<{ q?: string; sala?: string; caso?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await sesion();
  let q = supabase.from("sentencias").select("id, sala, numero, expediente, fecha, ponente, asunto, resumen, doctrina, url, fuente").order("fecha", { ascending: false }).limit(50);
  if (sp.q) q = q.textSearch("busqueda", sp.q, { type: "websearch", config: "spanish" });
  if (sp.sala) q = q.eq("sala", sp.sala);
  const [{ data: sentencias }, { data: caso }] = await Promise.all([
    q,
    sp.caso ? supabase.from("casos").select("id, codigo, titulo").eq("id", sp.caso).single() : Promise.resolve({ data: null }),
  ]);
  return (
    <>
      <Titulo>Jurisprudencia del TSJ</Titulo>
      {caso && (
        <p className="-mt-4 mb-4 text-sm text-slate-600">
          Buscando para el caso{" "}
          <Link href={`/casos/${caso.id}?tab=jurisprudencia`} className="font-medium text-marca-700 hover:underline">
            {caso.codigo}
          </Link>{" "}
          — {caso.titulo}
        </p>
      )}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <BuscadorTSJ casoId={caso?.id} />
        </div>
        <section className="lg:col-span-3">
          <form className="tarjeta mb-4 flex flex-wrap gap-2">
            {sp.caso && <input type="hidden" name="caso" value={sp.caso} />}
            <input name="q" defaultValue={sp.q} placeholder="Buscar en la jurisprudencia guardada" className="input flex-1" />
            <Select name="sala" opciones={SALAS_TSJ} defecto={sp.sala} vacio="Todas las salas" className="input w-56" />
            <button className="btn-sec">Buscar</button>
          </form>
          <div className="space-y-3">
            {sentencias?.map((s) => (
              <article key={s.id} className="tarjeta">
                <div className="text-xs text-slate-500">
                  {SALAS_TSJ[s.sala]} · Sent. {s.numero ?? "—"} · Exp. {s.expediente ?? "—"} · {fecha(s.fecha)}
                  {s.ponente ? ` · Ponente: ${s.ponente}` : ""}
                  {s.fuente === "manual" && <span className="chip ml-2 bg-amber-100 text-amber-800">ejemplo / manual</span>}
                </div>
                <h3 className="font-semibold">{s.asunto}</h3>
                {s.resumen && <p className="mt-1 text-sm text-slate-700">{s.resumen}</p>}
                {s.doctrina && <p className="mt-1 text-sm italic text-slate-600">Doctrina: {s.doctrina}</p>}
                {s.url && (
                  <a href={s.url} target="_blank" className="mt-1 inline-block text-sm text-marca-700 hover:underline">
                    Ver en tsj.gob.ve ↗
                  </a>
                )}
              </article>
            ))}
            {!sentencias?.length && (
              <div className="tarjeta">
                <Vacio>No hay sentencias guardadas que coincidan.</Vacio>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
