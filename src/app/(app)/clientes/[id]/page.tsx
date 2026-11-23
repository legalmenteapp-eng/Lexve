import Link from "next/link";
import { notFound } from "next/navigation";
import { sesion } from "@/lib/auth";
import { ChipEstado, Titulo, Vacio } from "@/components/ui";
import { ArchivosDrive } from "@/components/ArchivosDrive";
import { cuentaServicioEmail, driveConfigurado } from "@/lib/drive";
import { dinero, fecha } from "@/lib/formato";
import { MATERIAS } from "@/lib/tipos";
import { actualizarDriveCliente } from "../../acciones";

export default async function Cliente({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await sesion();
  const { data: c } = await supabase.from("clientes").select("*").eq("id", id).single();
  if (!c) notFound();
  const [{ data: casos }, { data: facturas }] = await Promise.all([
    supabase.from("v_casos_resumen").select("id, codigo, titulo, estado, materia").eq("cliente_id", id).order("fecha_inicio", { ascending: false }),
    supabase.from("v_facturas_saldo").select("id, numero, fecha_emision, estado, total, saldo, moneda").eq("cliente_id", id).order("fecha_emision", { ascending: false }),
  ]);
  const saldo = (facturas ?? []).filter((f) => f.estado !== "anulada" && f.estado !== "borrador").reduce((s, f) => s + Number(f.saldo), 0);
  const correoSA = cuentaServicioEmail();
  return (
    <>
      <Link href="/clientes" className="text-sm text-slate-500 hover:underline">
        ← Clientes
      </Link>
      <Titulo accion={<Link href={`/casos/nuevo?cliente=${id}`} className="btn">+ Nuevo caso</Link>}>{c.nombre}</Titulo>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="tarjeta overflow-x-auto p-0">
            <div className="p-4 font-semibold text-marca-900">Casos</div>
            <table className="tabla">
              <tbody>
                {casos?.map((k) => (
                  <tr key={k.id}>
                    <td>
                      <Link href={`/casos/${k.id}`} className="font-medium text-marca-700 hover:underline">
                        {k.codigo}
                      </Link>
                      <div className="text-xs text-slate-500">{k.titulo}</div>
                    </td>
                    <td>{MATERIAS[k.materia]}</td>
                    <td>
                      <ChipEstado estado={k.estado} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!casos?.length && <Vacio>Sin casos.</Vacio>}
          </section>
          <section className="tarjeta overflow-x-auto p-0">
            <div className="flex justify-between p-4">
              <span className="font-semibold text-marca-900">Estado de cuenta</span>
              <span className="text-sm">Saldo pendiente: <strong>{dinero(saldo)}</strong></span>
            </div>
            <table className="tabla">
              <tbody>
                {facturas?.map((f) => (
                  <tr key={f.id}>
                    <td>
                      <Link href={`/facturacion/${f.id}`} className="text-marca-700 hover:underline">
                        {f.numero}
                      </Link>
                    </td>
                    <td>{fecha(f.fecha_emision)}</td>
                    <td>
                      <ChipEstado estado={f.estado} />
                    </td>
                    <td className="text-right">{dinero(f.total, f.moneda)}</td>
                    <td className="text-right">{dinero(f.saldo, f.moneda)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!facturas?.length && <Vacio>Sin facturas.</Vacio>}
          </section>
        </div>
        <div className="space-y-6">
          <section className="tarjeta text-sm">
            <h2 className="mb-2 font-semibold text-marca-900">Datos</h2>
            <p>{c.tipo === "juridica" ? "Persona jurídica" : "Persona natural"} · {c.cedula_rif}</p>
            <p>{c.email}</p>
            <p>{c.telefono}</p>
            <p className="text-slate-500">
              {c.direccion}
              {c.ciudad ? `, ${c.ciudad}` : ""}
              {c.estado_region ? `, ${c.estado_region}` : ""}
            </p>
            {c.notas && <p className="mt-2 text-slate-600">{c.notas}</p>}
          </section>
          <section className="tarjeta">
            <h2 className="mb-2 font-semibold text-marca-900">Google Drive</h2>
            {c.drive_folder_url && <ArchivosDrive carpetaUrl={c.drive_folder_url} configurado={driveConfigurado()} />}
            <form action={actualizarDriveCliente.bind(null, id)} className="mt-3 space-y-2">
              <input name="drive_folder_url" defaultValue={c.drive_folder_url ?? ""} placeholder="https://drive.google.com/drive/folders/…" className="input" />
              <button className="btn-sec">Guardar carpeta</button>
            </form>
            {correoSA && (
              <p className="mt-2 text-xs text-slate-500">
                Pide al cliente que comparta su carpeta (lector) con <strong>{correoSA}</strong>.
              </p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
