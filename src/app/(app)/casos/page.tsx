import Link from "next/link";
import { sesion } from "@/lib/auth";
import { ChipDias, ChipEstado, Prioridad, Select, Titulo, Vacio } from "@/components/ui";
import { dinero, diasHasta } from "@/lib/formato";
import { ESTADOS_CASO, MATERIAS } from "@/lib/tipos";

export default async function Casos({ searchParams }: { searchParams: Promise<{ q?: string; estado?: string; materia?: string; mios?: string }> }) {
  const sp = await searchParams;
  const { supabase, perfil } = await sesion();
  let q = supabase.from("v_casos_resumen").select("*").order("prioridad").order("actualizado_en", { ascending: false });
  if (sp.estado) q = q.eq("estado", sp.estado);
  else q = q.not("estado", "in", "(cerrado,archivado)");
  if (sp.materia) q = q.eq("materia", sp.materia);
  if (sp.q) q = q.or(`titulo.ilike.%${sp.q.replace(/[,()]/g, " ")}%,codigo.ilike.%${sp.q.replace(/[,()]/g, " ")}%,numero_expediente.ilike.%${sp.q.replace(/[,()]/g, " ")}%,cliente_nombre.ilike.%${sp.q.replace(/[,()]/g, " ")}%`);
  if (sp.mios) {
    const { data: mios } = await supabase.from("caso_abogados").select("caso_id").eq("abogado_id", perfil.id);
    q = q.in("id", (mios ?? []).map((m) => m.caso_id));
  }
  const { data: casos, error } = await q;

  return (
    <>
      <Titulo accion={<Link href="/casos/nuevo" className="btn">+ Nuevo caso</Link>}>Casos</Titulo>
      <form className="tarjeta mb-4 grid gap-3 md:grid-cols-5">
        <input name="q" defaultValue={sp.q} placeholder="Buscar por título, código, expediente o cliente" className="input md:col-span-2" />
        <Select name="estado" opciones={ESTADOS_CASO} defecto={sp.estado} vacio="Activos (todos)" />
        <Select name="materia" opciones={MATERIAS} defecto={sp.materia} vacio="Todas las materias" />
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" name="mios" defaultChecked={!!sp.mios} /> Solo míos
          </label>
          <button className="btn-sec">Filtrar</button>
        </div>
      </form>
      {error && <p className="mb-3 text-sm text-red-600">{error.message}</p>}
      <div className="tarjeta overflow-x-auto p-0">
        <table className="tabla">
          <thead>
            <tr>
              <th>Caso</th>
              <th>Cliente</th>
              <th>Materia</th>
              <th>Estado</th>
              <th>Equipo</th>
              <th>Próximo plazo</th>
              <th className="text-right">Por facturar</th>
            </tr>
          </thead>
          <tbody>
            {casos?.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td>
                  <Link href={`/casos/${c.id}`} className="font-medium text-marca-700 hover:underline">
                    {c.codigo}
                  </Link>{" "}
                  <Prioridad p={c.prioridad} />
                  <div className="max-w-sm text-xs text-slate-600">{c.titulo}</div>
                  {c.numero_expediente && <div className="text-xs text-slate-400">Exp. {c.numero_expediente}</div>}
                </td>
                <td>{c.cliente_nombre}</td>
                <td>{MATERIAS[c.materia]}</td>
                <td>
                  <ChipEstado estado={c.estado} />
                  {c.etapa && <div className="mt-1 text-xs text-slate-500">{c.etapa}</div>}
                </td>
                <td className="max-w-[12rem] text-xs">{c.abogados}</td>
                <td>{c.proximo_plazo ? <ChipDias dias={diasHasta(c.proximo_plazo)} /> : "—"}</td>
                <td className="text-right">{dinero(c.por_facturar)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!casos?.length && <Vacio>No hay casos con esos filtros.</Vacio>}
      </div>
    </>
  );
}
