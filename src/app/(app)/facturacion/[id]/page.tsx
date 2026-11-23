import Link from "next/link";
import { notFound } from "next/navigation";
import { sesion } from "@/lib/auth";
import { ChipEstado, Select } from "@/components/ui";
import { BotonImprimir } from "@/components/BotonImprimir";
import { dinero, fecha } from "@/lib/formato";
import { METODOS_PAGO } from "@/lib/tipos";
import { actualizarFactura, agregarItem, cambiarEstadoFactura, eliminarItem, registrarPago } from "../../acciones";

export default async function Factura({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, perfil, esGerente } = await sesion();
  const { data: f } = await supabase.from("v_facturas_saldo").select("*").eq("id", id).single();
  if (!f) notFound();
  const [{ data: items }, { data: pagos }, { data: cliente }, { data: despacho }] = await Promise.all([
    supabase.from("factura_items").select("*").eq("factura_id", id),
    supabase.from("pagos").select("*").eq("factura_id", id).order("fecha"),
    supabase.from("clientes").select("*").eq("id", f.cliente_id).single(),
    supabase.from("despachos").select("*").eq("id", perfil.despacho_id).single(),
  ]);
  const borrador = f.estado === "borrador";
  const ves = (n: number) => (f.tasa_bcv && f.moneda === "USD" ? dinero(n * Number(f.tasa_bcv), "VES") : null);

  return (
    <>
      <div className="no-imprimir mb-4 flex flex-wrap items-center gap-2">
        <Link href="/facturacion" className="text-sm text-slate-500 hover:underline">
          ← Facturación
        </Link>
        <div className="ml-auto flex gap-2">
          {borrador && esGerente && (
            <form action={cambiarEstadoFactura.bind(null, id, "emitida")}>
              <button className="btn">Emitir factura</button>
            </form>
          )}
          {!["anulada", "pagada"].includes(f.estado) && esGerente && (
            <form action={cambiarEstadoFactura.bind(null, id, "anulada")}>
              <button className="btn-sec text-red-600">Anular</button>
            </form>
          )}
          <BotonImprimir />
        </div>
      </div>

      <article className="tarjeta mx-auto max-w-3xl">
        <header className="mb-6 flex justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <div className="text-lg font-bold text-marca-900">{despacho?.nombre}</div>
            <div className="text-xs text-slate-500">RIF {despacho?.rif}</div>
            <div className="text-xs text-slate-500">{despacho?.direccion}</div>
            <div className="text-xs text-slate-500">
              {despacho?.telefono} · {despacho?.email}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xl font-semibold">FACTURA</div>
            <div className="text-sm">N.º {f.numero}</div>
            <div className="text-xs text-slate-500">N.º de control: {f.numero_control ?? "—"}</div>
            <div className="mt-1">
              <ChipEstado estado={f.estado} />
            </div>
          </div>
        </header>
        <div className="mb-6 grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="etiqueta">Cliente</div>
            <div className="font-medium">{cliente?.nombre}</div>
            <div>{cliente?.cedula_rif}</div>
            <div className="text-slate-500">{cliente?.direccion}</div>
          </div>
          <div className="text-right">
            <div>Emisión: {fecha(f.fecha_emision)}</div>
            <div>Vencimiento: {fecha(f.fecha_vencimiento)}</div>
            {f.caso_codigo && <div>Caso: {f.caso_codigo}</div>}
            {f.tasa_bcv && <div>Tasa BCV: Bs. {Number(f.tasa_bcv).toLocaleString("es-VE")} / USD</div>}
          </div>
        </div>
        <table className="tabla">
          <thead>
            <tr>
              <th>Descripción</th>
              <th className="text-right">Cant.</th>
              <th className="text-right">Precio</th>
              <th className="text-right">Total</th>
              {borrador && <th className="no-imprimir" />}
            </tr>
          </thead>
          <tbody>
            {items?.map((i) => (
              <tr key={i.id}>
                <td>{i.descripcion}</td>
                <td className="text-right">{Number(i.cantidad)}</td>
                <td className="text-right">{dinero(i.precio_unitario, f.moneda)}</td>
                <td className="text-right">{dinero(i.total, f.moneda)}</td>
                {borrador && (
                  <td className="no-imprimir">
                    <form action={eliminarItem.bind(null, id, i.id)}>
                      <button className="text-xs text-red-600">✕</button>
                    </form>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {borrador && (
          <form action={agregarItem.bind(null, id)} className="no-imprimir mt-2 flex gap-2">
            <input name="descripcion" required placeholder="Concepto" className="input" />
            <input name="cantidad" type="number" step="0.25" defaultValue="1" className="input w-20" />
            <input name="precio_unitario" type="number" step="0.01" placeholder="Precio" className="input w-28" />
            <button className="btn-sec">Añadir</button>
          </form>
        )}
        <div className="mt-4 ml-auto w-72 space-y-1 text-sm">
          {[
            ["Subtotal (base imponible)", f.subtotal],
            [`IVA ${Number(f.iva_porcentaje)}%`, f.iva_monto],
            ...(Number(f.igtf_monto) > 0 ? [["IGTF 3% (pago en divisas)", f.igtf_monto]] : []),
          ].map(([k, v]) => (
            <div key={String(k)} className="flex justify-between">
              <span>{k}</span>
              <span>{dinero(Number(v), f.moneda)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-slate-200 pt-1 text-base font-semibold">
            <span>Total</span>
            <span>{dinero(f.total, f.moneda)}</span>
          </div>
          {ves(Number(f.total)) && (
            <div className="flex justify-between text-xs text-slate-500">
              <span>Equivalente en bolívares</span>
              <span>{ves(Number(f.total))}</span>
            </div>
          )}
          <div className="flex justify-between text-emerald-700">
            <span>Pagado</span>
            <span>{dinero(f.pagado, f.moneda)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Saldo</span>
            <span>{dinero(f.saldo, f.moneda)}</span>
          </div>
        </div>
        {f.notas && <p className="mt-6 text-sm text-slate-600">{f.notas}</p>}
      </article>

      <div className="no-imprimir mx-auto mt-6 grid max-w-3xl gap-6 md:grid-cols-2">
        <form action={actualizarFactura.bind(null, id)} className="tarjeta space-y-3">
          <h2 className="font-semibold text-marca-900">Datos fiscales</h2>
          <div>
            <label className="etiqueta">Tasa BCV (Bs/USD)</label>
            <input name="tasa_bcv" type="number" step="0.0001" defaultValue={f.tasa_bcv ?? ""} className="input" />
          </div>
          <div>
            <label className="etiqueta">N.º de control</label>
            <input name="numero_control" defaultValue={f.numero_control ?? ""} className="input" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="hidden" name="igtf" value="off" />
            <input type="checkbox" name="igtf" defaultChecked={Number(f.igtf_monto) > 0} /> Aplicar IGTF 3% (pago en divisas)
          </label>
          <textarea name="notas" defaultValue={f.notas ?? ""} rows={2} className="input" placeholder="Notas" />
          <button className="btn-sec">Guardar</button>
        </form>
        <div className="tarjeta space-y-3">
          <h2 className="font-semibold text-marca-900">Pagos</h2>
          <ul className="text-sm">
            {pagos?.map((p) => (
              <li key={p.id} className="flex justify-between border-b border-slate-100 py-1">
                <span>
                  {fecha(p.fecha)} · {METODOS_PAGO[p.metodo]} {p.referencia ? `· ${p.referencia}` : ""}
                </span>
                <span>{dinero(p.monto, p.moneda)}</span>
              </li>
            ))}
            {!pagos?.length && <li className="text-slate-400">Sin pagos.</li>}
          </ul>
          {esGerente && !["borrador", "anulada", "pagada"].includes(f.estado) && (
            <form action={registrarPago.bind(null, id)} className="space-y-2">
              <div className="flex gap-2">
                <input name="monto" type="number" step="0.01" required defaultValue={Number(f.saldo).toFixed(2)} className="input" />
                <Select name="metodo" opciones={METODOS_PAGO} defecto="transferencia" />
              </div>
              <div className="flex gap-2">
                <input name="fecha" type="date" defaultValue={new Date().toISOString().slice(0, 10)} className="input" />
                <input name="referencia" placeholder="Referencia" className="input" />
              </div>
              <button className="btn">Registrar pago</button>
            </form>
          )}
        </div>
      </div>
    </>
  );
}
