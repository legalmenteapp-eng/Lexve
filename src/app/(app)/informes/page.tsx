import { sesion } from "@/lib/auth";
import { Kpi, Titulo } from "@/components/ui";
import { dinero } from "@/lib/formato";
import { ESTADOS_CASO, MATERIAS } from "@/lib/tipos";

function Barra({ valor, max }: { valor: number; max: number }) {
  return (
    <div className="h-2 w-full rounded bg-slate-100">
      <div className="h-2 rounded bg-marca-600" style={{ width: `${max ? Math.max(2, (valor / max) * 100) : 0}%` }} />
    </div>
  );
}

export default async function Informes({ searchParams }: { searchParams: Promise<{ desde?: string; hasta?: string }> }) {
  const sp = await searchParams;
  const hoy = new Date();
  const desde = sp.desde ?? new Date(hoy.getFullYear(), hoy.getMonth() - 2, 1).toISOString().slice(0, 10);
  const hasta = sp.hasta ?? hoy.toISOString().slice(0, 10);
  const { supabase } = await sesion();
  const [{ data: horas }, { data: casos }, { data: facturas }, { data: perfiles }] = await Promise.all([
    supabase.from("registros_tiempo").select("abogado_id, horas, tarifa, facturable, factura_id").gte("fecha", desde).lte("fecha", hasta),
    supabase.from("v_casos_resumen").select("materia, estado, cliente_nombre, por_facturar"),
    supabase.from("v_facturas_saldo").select("cliente_nombre, total, pagado, saldo, estado, fecha_emision").not("estado", "in", "(anulada,borrador)"),
    supabase.from("perfiles").select("id, nombre, rol").eq("activo", true),
  ]);

  const porAbogado = (perfiles ?? [])
    .map((p) => {
      const h = (horas ?? []).filter((x) => x.abogado_id === p.id);
      const total = h.reduce((s, x) => s + Number(x.horas), 0);
      const fact = h.filter((x) => x.facturable).reduce((s, x) => s + Number(x.horas), 0);
      const valor = h.filter((x) => x.facturable).reduce((s, x) => s + Number(x.horas) * Number(x.tarifa), 0);
      return { ...p, total, fact, valor, util: total ? (fact / total) * 100 : 0 };
    })
    .sort((a, b) => b.valor - a.valor);
  const maxValor = Math.max(...porAbogado.map((a) => a.valor), 0);

  const contar = (campo: "materia" | "estado") => {
    const m = new Map<string, number>();
    (casos ?? []).forEach((c) => m.set(c[campo], (m.get(c[campo]) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const cartera = new Map<string, { facturado: number; cobrado: number; saldo: number }>();
  (facturas ?? []).forEach((f) => {
    const c = cartera.get(f.cliente_nombre) ?? { facturado: 0, cobrado: 0, saldo: 0 };
    c.facturado += Number(f.total);
    c.cobrado += Number(f.pagado);
    c.saldo += Number(f.saldo);
    cartera.set(f.cliente_nombre, c);
  });
  const facturadoPeriodo = (facturas ?? []).filter((f) => f.fecha_emision >= desde && f.fecha_emision <= hasta).reduce((s, f) => s + Number(f.total), 0);
  const cobrado = (facturas ?? []).reduce((s, f) => s + Number(f.pagado), 0);
  const totalFact = (facturas ?? []).reduce((s, f) => s + Number(f.total), 0);

  return (
    <>
      <Titulo
        accion={
          <div className="flex gap-2">
            <a href="/api/informes/csv?tipo=casos" className="btn-sec">⤓ Casos</a>
            <a href="/api/informes/csv?tipo=horas" className="btn-sec">⤓ Horas</a>
            <a href="/api/informes/csv?tipo=facturas" className="btn-sec">⤓ Facturas</a>
          </div>
        }
      >
        Informes
      </Titulo>
      <form className="tarjeta mb-6 flex flex-wrap items-end gap-3">
        <div>
          <label className="etiqueta">Desde</label>
          <input type="date" name="desde" defaultValue={desde} className="input" />
        </div>
        <div>
          <label className="etiqueta">Hasta</label>
          <input type="date" name="hasta" defaultValue={hasta} className="input" />
        </div>
        <button className="btn-sec">Aplicar</button>
      </form>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi titulo="Horas del período" valor={porAbogado.reduce((s, a) => s + a.total, 0).toFixed(1)} />
        <Kpi titulo="Valor facturable" valor={dinero(porAbogado.reduce((s, a) => s + a.valor, 0))} />
        <Kpi titulo="Facturado en el período" valor={dinero(facturadoPeriodo)} />
        <Kpi titulo="Tasa de cobro histórica" valor={`${totalFact ? ((cobrado / totalFact) * 100).toFixed(0) : 0}%`} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="tarjeta lg:col-span-2">
          <h2 className="mb-3 font-semibold text-marca-900">Productividad por abogado</h2>
          <table className="tabla">
            <thead>
              <tr>
                <th>Abogado</th>
                <th className="text-right">Horas</th>
                <th className="text-right">Facturables</th>
                <th className="text-right">Utilización</th>
                <th className="text-right">Valor</th>
                <th className="w-1/4" />
              </tr>
            </thead>
            <tbody>
              {porAbogado.map((a) => (
                <tr key={a.id}>
                  <td>
                    {a.nombre} <span className="text-xs capitalize text-slate-400">{a.rol}</span>
                  </td>
                  <td className="text-right">{a.total.toFixed(1)}</td>
                  <td className="text-right">{a.fact.toFixed(1)}</td>
                  <td className="text-right">{a.util.toFixed(0)}%</td>
                  <td className="text-right">{dinero(a.valor)}</td>
                  <td>
                    <Barra valor={a.valor} max={maxValor} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        {(["materia", "estado"] as const).map((campo) => {
          const filas = contar(campo);
          const max = Math.max(...filas.map((f) => f[1]), 0);
          return (
            <section key={campo} className="tarjeta">
              <h2 className="mb-3 font-semibold text-marca-900">Casos por {campo}</h2>
              <ul className="space-y-2 text-sm">
                {filas.map(([k, n]) => (
                  <li key={k} className="grid grid-cols-[10rem_1fr_2rem] items-center gap-3">
                    <span className="truncate">{campo === "materia" ? MATERIAS[k] : ESTADOS_CASO[k]}</span>
                    <Barra valor={n} max={max} />
                    <span className="text-right">{n}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        <section className="tarjeta lg:col-span-2">
          <h2 className="mb-3 font-semibold text-marca-900">Cartera por cliente</h2>
          <table className="tabla">
            <thead>
              <tr>
                <th>Cliente</th>
                <th className="text-right">Facturado</th>
                <th className="text-right">Cobrado</th>
                <th className="text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {[...cartera.entries()]
                .sort((a, b) => b[1].saldo - a[1].saldo)
                .map(([cliente, c]) => (
                  <tr key={cliente}>
                    <td>{cliente}</td>
                    <td className="text-right">{dinero(c.facturado)}</td>
                    <td className="text-right">{dinero(c.cobrado)}</td>
                    <td className={`text-right font-medium ${c.saldo > 0 ? "text-red-700" : ""}`}>{dinero(c.saldo)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}
