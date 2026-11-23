import Link from "next/link";
import { sesion } from "@/lib/auth";
import { ChipDias, ChipEstado, Kpi, Titulo, Vacio } from "@/components/ui";
import { dinero, diasHasta, fecha } from "@/lib/formato";
import { TIPOS_ACTUACION } from "@/lib/tipos";

export default async function Panel() {
  const { supabase, perfil, esGerente } = await sesion();
  const en14 = new Date(Date.now() + 14 * 86_400_000).toISOString();
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const [{ data: casos }, { data: plazos }, { data: actuaciones }, { data: horasMes }, { data: facturas }] = await Promise.all([
    supabase.from("v_casos_resumen").select("id, codigo, titulo, estado, cliente_nombre, proximo_plazo, prioridad, por_facturar").not("estado", "in", "(cerrado,archivado)"),
    supabase.from("plazos").select("id, titulo, fecha_vencimiento, tipo, caso:casos(id, codigo, titulo)").eq("completado", false).lte("fecha_vencimiento", en14).order("fecha_vencimiento"),
    supabase.from("actuaciones").select("id, titulo, tipo, fecha, caso:casos(id, codigo), autor:perfiles(nombre)").order("fecha", { ascending: false }).limit(8),
    supabase.from("registros_tiempo").select("horas, tarifa, abogado_id").gte("fecha", inicioMes),
    supabase.from("v_facturas_saldo").select("saldo, estado").in("estado", ["emitida", "parcial", "vencida"]),
  ]);

  const misHoras = (horasMes ?? []).filter((h) => h.abogado_id === perfil.id).reduce((s, h) => s + Number(h.horas), 0);
  const porCobrar = (facturas ?? []).reduce((s, f) => s + Number(f.saldo), 0);
  const porFacturar = (casos ?? []).reduce((s, c) => s + Number(c.por_facturar), 0);
  const vencidos = (plazos ?? []).filter((p) => diasHasta(p.fecha_vencimiento) < 0).length;

  return (
    <>
      <Titulo>Buen día, {perfil.nombre.split(" ")[0]}</Titulo>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi titulo="Casos activos" valor={casos?.length ?? 0} href="/casos" />
        <Kpi titulo="Plazos 14 días" valor={plazos?.length ?? 0} detalle={vencidos ? `${vencidos} vencido(s)` : "Ninguno vencido"} href="/alertas" />
        <Kpi titulo="Mis horas este mes" valor={misHoras.toFixed(1)} />
        {esGerente ? (
          <Kpi titulo="Por cobrar" valor={dinero(porCobrar)} detalle={`${dinero(porFacturar)} por facturar`} href="/facturacion" />
        ) : (
          <Kpi titulo="Por facturar (mis casos)" valor={dinero(porFacturar)} />
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="tarjeta">
          <h2 className="mb-3 font-semibold text-marca-900">Próximos plazos y audiencias</h2>
          {!plazos?.length && <Vacio>Sin plazos en los próximos 14 días.</Vacio>}
          <ul className="divide-y divide-slate-100">
            {plazos?.map((p) => {
              const caso = p.caso as unknown as { id: string; codigo: string; titulo: string };
              return (
                <li key={p.id} className="flex items-start justify-between gap-3 py-2.5">
                  <div>
                    <Link href={`/casos/${caso.id}?tab=plazos`} className="font-medium hover:underline">
                      {p.titulo}
                    </Link>
                    <div className="text-xs text-slate-500">
                      {caso.codigo} · {fecha(p.fecha_vencimiento, true)}
                    </div>
                  </div>
                  <ChipDias dias={diasHasta(p.fecha_vencimiento)} />
                </li>
              );
            })}
          </ul>
        </section>

        <section className="tarjeta">
          <h2 className="mb-3 font-semibold text-marca-900">Actividad reciente</h2>
          <ul className="divide-y divide-slate-100">
            {actuaciones?.map((a) => {
              const caso = a.caso as unknown as { id: string; codigo: string };
              const autor = a.autor as unknown as { nombre: string } | null;
              return (
                <li key={a.id} className="py-2.5">
                  <Link href={`/casos/${caso.id}?tab=actuaciones`} className="font-medium hover:underline">
                    {a.titulo}
                  </Link>
                  <div className="text-xs text-slate-500">
                    {TIPOS_ACTUACION[a.tipo]} · {caso.codigo} · {fecha(a.fecha)} {autor ? `· ${autor.nombre}` : ""}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="tarjeta lg:col-span-2">
          <h2 className="mb-3 font-semibold text-marca-900">Casos de alta prioridad</h2>
          <table className="tabla">
            <thead>
              <tr>
                <th>Caso</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Próximo plazo</th>
              </tr>
            </thead>
            <tbody>
              {casos
                ?.filter((c) => c.prioridad === 1)
                .map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/casos/${c.id}`} className="font-medium text-marca-700 hover:underline">
                        {c.codigo}
                      </Link>
                      <div className="text-xs text-slate-500">{c.titulo}</div>
                    </td>
                    <td>{c.cliente_nombre}</td>
                    <td>
                      <ChipEstado estado={c.estado} />
                    </td>
                    <td>{c.proximo_plazo ? <ChipDias dias={diasHasta(c.proximo_plazo)} /> : "—"}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
