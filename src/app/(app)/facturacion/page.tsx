import Link from "next/link";
import { sesion } from "@/lib/auth";
import { ChipEstado, Kpi, Select, Titulo, Vacio } from "@/components/ui";
import { dinero, fecha } from "@/lib/formato";
import { ESTADOS_FACTURA } from "@/lib/tipos";
import { crearFacturaManual } from "../acciones";

export default async function Facturacion({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  const { estado } = await searchParams;
  const { supabase } = await sesion();
  let q = supabase.from("v_facturas_saldo").select("*").order("fecha_emision", { ascending: false });
  if (estado) q = q.eq("estado", estado);
  const [{ data: facturas }, { data: todas }, { data: clientes }, { data: porFacturar }] = await Promise.all([
    q,
    supabase.from("v_facturas_saldo").select("estado, total, saldo, pagado, fecha_emision"),
    supabase.from("clientes").select("id, nombre").order("nombre"),
    supabase.from("v_casos_resumen").select("por_facturar"),
  ]);
  const vigentes = (todas ?? []).filter((f) => !["anulada", "borrador"].includes(f.estado));
  const porCobrar = vigentes.reduce((s, f) => s + Number(f.saldo), 0);
  const vencido = vigentes.filter((f) => f.estado === "vencida").reduce((s, f) => s + Number(f.saldo), 0);
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const facturadoMes = vigentes.filter((f) => f.fecha_emision >= inicioMes).reduce((s, f) => s + Number(f.total), 0);
  const pendiente = (porFacturar ?? []).reduce((s, c) => s + Number(c.por_facturar), 0);

  return (
    <>
      <Titulo>Facturación</Titulo>
      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi titulo="Por cobrar" valor={dinero(porCobrar)} />
        <Kpi titulo="Vencido" valor={dinero(vencido)} href="/facturacion?estado=vencida" />
        <Kpi titulo="Facturado este mes" valor={dinero(facturadoMes)} />
        <Kpi titulo="Trabajo sin facturar" valor={dinero(pendiente)} detalle="Horas y gastos pendientes" href="/casos" />
      </div>
      <div className="grid gap-6 lg:grid-cols-4">
        <section className="lg:col-span-3">
          <form className="mb-3 flex gap-2">
            <Select name="estado" opciones={ESTADOS_FACTURA} defecto={estado} vacio="Todos los estados" className="input w-56" />
            <button className="btn-sec">Filtrar</button>
            <a href="/api/informes/csv?tipo=facturas" className="btn-sec ml-auto">
              ⤓ Exportar CSV
            </a>
          </form>
          <div className="tarjeta overflow-x-auto p-0">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Factura</th>
                  <th>Cliente</th>
                  <th>Caso</th>
                  <th>Emisión</th>
                  <th>Vence</th>
                  <th>Estado</th>
                  <th className="text-right">Total</th>
                  <th className="text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {facturas?.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <Link href={`/facturacion/${f.id}`} className="font-medium text-marca-700 hover:underline">
                        {f.numero}
                      </Link>
                    </td>
                    <td>{f.cliente_nombre}</td>
                    <td className="text-xs">{f.caso_codigo}</td>
                    <td className="whitespace-nowrap">{fecha(f.fecha_emision)}</td>
                    <td className="whitespace-nowrap">{fecha(f.fecha_vencimiento)}</td>
                    <td>
                      <ChipEstado estado={f.estado} />
                    </td>
                    <td className="text-right">{dinero(f.total, f.moneda)}</td>
                    <td className="text-right font-medium">{dinero(f.saldo, f.moneda)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!facturas?.length && <Vacio>Sin facturas.</Vacio>}
          </div>
        </section>
        <form action={crearFacturaManual} className="tarjeta h-fit space-y-3">
          <h2 className="font-semibold text-marca-900">Factura manual</h2>
          <p className="text-xs text-slate-500">Para facturar horas registradas usa “Generar factura” desde la pestaña Facturación del caso.</p>
          <select name="cliente_id" required className="input">
            <option value="">Cliente…</option>
            {clientes?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
          <Select name="moneda" opciones={{ USD: "Dólares (USD)", VES: "Bolívares (VES)", EUR: "Euros (EUR)" }} defecto="USD" />
          <button className="btn">Crear borrador</button>
        </form>
      </div>
    </>
  );
}
