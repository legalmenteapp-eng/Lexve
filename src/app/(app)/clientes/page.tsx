import Link from "next/link";
import { sesion } from "@/lib/auth";
import { Titulo, Vacio } from "@/components/ui";
import { crearCliente } from "../acciones";

export default async function Clientes({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const { supabase } = await sesion();
  let consulta = supabase.from("clientes").select("*, casos(count)").order("nombre");
  if (q) consulta = consulta.or(`nombre.ilike.%${q.replace(/[,()]/g, " ")}%,cedula_rif.ilike.%${q.replace(/[,()]/g, " ")}%`);
  const { data: clientes } = await consulta;
  return (
    <>
      <Titulo>Clientes</Titulo>
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <form className="mb-3 flex gap-2">
            <input name="q" defaultValue={q} placeholder="Buscar por nombre, cédula o RIF" className="input" />
            <button className="btn-sec">Buscar</button>
          </form>
          <div className="tarjeta overflow-x-auto p-0">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Cédula / RIF</th>
                  <th>Contacto</th>
                  <th>Casos</th>
                  <th>Drive</th>
                </tr>
              </thead>
              <tbody>
                {clientes?.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link href={`/clientes/${c.id}`} className="font-medium text-marca-700 hover:underline">
                        {c.nombre}
                      </Link>
                      <div className="text-xs text-slate-500">{c.tipo === "juridica" ? "Persona jurídica" : "Persona natural"} · {c.ciudad}</div>
                    </td>
                    <td>{c.cedula_rif}</td>
                    <td className="text-xs">
                      {c.email}
                      <br />
                      {c.telefono}
                    </td>
                    <td>{(c.casos as unknown as { count: number }[])?.[0]?.count ?? 0}</td>
                    <td>{c.drive_folder_url ? <a href={c.drive_folder_url} target="_blank" title="Carpeta de Drive">📁</a> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!clientes?.length && <Vacio>Sin clientes.</Vacio>}
          </div>
        </section>
        <form action={crearCliente} className="tarjeta h-fit space-y-3">
          <h2 className="font-semibold text-marca-900">Nuevo cliente</h2>
          <select name="tipo" className="input">
            <option value="natural">Persona natural</option>
            <option value="juridica">Persona jurídica</option>
          </select>
          <input name="nombre" required placeholder="Nombre o razón social" className="input" />
          <input name="cedula_rif" placeholder="V-12.345.678 / J-12345678-9" className="input" />
          <input name="email" type="email" placeholder="Correo" className="input" />
          <input name="telefono" placeholder="Teléfono" className="input" />
          <input name="direccion" placeholder="Dirección" className="input" />
          <div className="flex gap-2">
            <input name="ciudad" placeholder="Ciudad" className="input" />
            <input name="estado_region" placeholder="Estado" className="input" />
          </div>
          <input name="drive_folder_url" placeholder="Carpeta de Google Drive del cliente" className="input" />
          <textarea name="notas" rows={2} placeholder="Notas" className="input" />
          <button className="btn">Crear cliente</button>
        </form>
      </div>
    </>
  );
}
