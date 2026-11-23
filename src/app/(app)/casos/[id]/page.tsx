import Link from "next/link";
import { notFound } from "next/navigation";
import { sesion } from "@/lib/auth";
import { ChipDias, ChipEstado, Prioridad, Select, Vacio } from "@/components/ui";
import { Markdown } from "@/components/Markdown";
import { PanelIA } from "@/components/PanelIA";
import { ArchivosDrive } from "@/components/ArchivosDrive";
import { dinero, diasHasta, fecha } from "@/lib/formato";
import { ESTADOS_CASO, MATERIAS, ROLES_EN_CASO, SALAS_TSJ, TIPOS_ACTUACION, TIPOS_PLAZO } from "@/lib/tipos";
import { driveConfigurado } from "@/lib/drive";
import {
  actualizarCaso,
  agregarDocumento,
  asignarAbogado,
  completarPlazo,
  crearActuacion,
  crearPlazo,
  facturarCaso,
  quitarAbogado,
  registrarGasto,
  registrarTiempo,
  vincularSentencia,
} from "../../acciones";

const PESTANAS = [
  ["resumen", "Resumen"],
  ["actuaciones", "Seguimiento"],
  ["plazos", "Plazos"],
  ["documentos", "Documentos"],
  ["jurisprudencia", "Jurisprudencia"],
  ["ia", "Análisis IA"],
  ["tiempo", "Horas y gastos"],
  ["facturacion", "Facturación"],
] as const;

type Params = { params: Promise<{ id: string }>; searchParams: Promise<{ tab?: string }> };

export default async function Caso({ params, searchParams }: Params) {
  const { id } = await params;
  const tab = (await searchParams).tab ?? "resumen";
  const { supabase, perfil, esGerente } = await sesion();
  const { data: caso } = await supabase.from("v_casos_resumen").select("*").eq("id", id).single();
  if (!caso) notFound();
  const { data: cliente } = await supabase.from("clientes").select("*").eq("id", caso.cliente_id).single();

  return (
    <>
      <div className="mb-4">
        <Link href="/casos" className="text-sm text-slate-500 hover:underline">
          ← Casos
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-marca-900">{caso.codigo}</h1>
          <ChipEstado estado={caso.estado} />
          <Prioridad p={caso.prioridad} />
          <span className="chip bg-marca-50 text-marca-700">{MATERIAS[caso.materia]}</span>
          <Link href={`/casos/${id}/informe`} className="btn-sec ml-auto">
            🖨 Informe del caso
          </Link>
        </div>
        <p className="mt-1 text-slate-700">{caso.titulo}</p>
        <p className="text-sm text-slate-500">
          Cliente:{" "}
          <Link href={`/clientes/${caso.cliente_id}`} className="hover:underline">
            {caso.cliente_nombre}
          </Link>
          {caso.numero_expediente ? ` · Exp. ${caso.numero_expediente}` : ""} {caso.tribunal ? ` · ${caso.tribunal}` : ""}
        </p>
      </div>

      <nav className="mb-5 flex gap-1 overflow-x-auto border-b border-slate-200">
        {PESTANAS.map(([k, t]) => (
          <Link
            key={k}
            href={`/casos/${id}?tab=${k}`}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm ${tab === k ? "border-marca-600 font-semibold text-marca-700" : "border-transparent text-slate-500 hover:text-slate-800"}`}
          >
            {t}
          </Link>
        ))}
      </nav>

      {tab === "resumen" && <Resumen caso={caso} cliente={cliente} supabase={supabase} esGerente={esGerente} />}
      {tab === "actuaciones" && <Actuaciones casoId={id} supabase={supabase} />}
      {tab === "plazos" && <Plazos casoId={id} supabase={supabase} perfilId={perfil.id} />}
      {tab === "documentos" && <Documentos caso={caso} cliente={cliente} supabase={supabase} />}
      {tab === "jurisprudencia" && <Jurisprudencia casoId={id} supabase={supabase} />}
      {tab === "ia" && <IA casoId={id} supabase={supabase} />}
      {tab === "tiempo" && <Tiempo casoId={id} supabase={supabase} tarifa={perfil.tarifa_hora ?? 0} />}
      {tab === "facturacion" && <Facturacion caso={caso} supabase={supabase} />}
    </>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = Awaited<ReturnType<typeof sesion>>["supabase"];

async function Resumen({ caso, cliente, supabase, esGerente }: { caso: any; cliente: any; supabase: Db; esGerente: boolean }) {
  const { data: equipo } = await supabase.from("caso_abogados").select("rol, abogado:perfiles(id, nombre, email, inpreabogado)").eq("caso_id", caso.id);
  const { data: abogados } = await supabase.from("perfiles").select("id, nombre").eq("activo", true).order("nombre");
  const actualizar = actualizarCaso.bind(null, caso.id);
  const asignar = asignarAbogado.bind(null, caso.id);
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="tarjeta lg:col-span-2">
        <h2 className="mb-3 font-semibold text-marca-900">Datos del caso</h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          {[
            ["Tribunal", caso.tribunal],
            ["Circunscripción", caso.circunscripcion],
            ["Juez", caso.juez],
            ["Contraparte", caso.contraparte],
            ["Abogado contraparte", caso.abogado_contraparte],
            ["Cuantía", caso.cuantia ? dinero(caso.cuantia, caso.moneda) : "—"],
            ["Inicio", fecha(caso.fecha_inicio)],
            ["Honorarios", `${caso.tarifa_tipo.replace("_", " ")}${caso.tarifa_monto ? ` · ${caso.tarifa_tipo === "cuota_litis" ? caso.tarifa_monto + "%" : dinero(caso.tarifa_monto)}` : ""}`],
            ["Horas registradas", Number(caso.horas_totales).toFixed(1)],
            ["Por facturar", dinero(caso.por_facturar)],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs uppercase tracking-wide text-slate-500">{k}</dt>
              <dd>{v || "—"}</dd>
            </div>
          ))}
        </dl>
        {caso.descripcion && (
          <>
            <h3 className="mt-5 mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Hechos</h3>
            <p className="whitespace-pre-line text-sm">{caso.descripcion}</p>
          </>
        )}
        <details className="mt-5">
          <summary className="cursor-pointer text-sm font-medium text-marca-700">Actualizar estado, etapa y datos</summary>
          <form action={actualizar} className="mt-3 grid gap-3 md:grid-cols-2">
            <div>
              <label className="etiqueta">Estado</label>
              <Select name="estado" opciones={ESTADOS_CASO} defecto={caso.estado} />
            </div>
            <div>
              <label className="etiqueta">Etapa</label>
              <input name="etapa" defaultValue={caso.etapa ?? ""} className="input" />
            </div>
            <div>
              <label className="etiqueta">N.º expediente</label>
              <input name="numero_expediente" defaultValue={caso.numero_expediente ?? ""} className="input" />
            </div>
            <div>
              <label className="etiqueta">Tribunal</label>
              <input name="tribunal" defaultValue={caso.tribunal ?? ""} className="input" />
            </div>
            <div>
              <label className="etiqueta">Juez</label>
              <input name="juez" defaultValue={caso.juez ?? ""} className="input" />
            </div>
            <div>
              <label className="etiqueta">Prioridad</label>
              <Select name="prioridad" opciones={{ "1": "Alta", "2": "Media", "3": "Baja" }} defecto={String(caso.prioridad)} />
            </div>
            <div className="md:col-span-2">
              <label className="etiqueta">Carpeta de Drive del caso</label>
              <input name="drive_folder_url" defaultValue={caso.drive_folder_url ?? ""} className="input" />
            </div>
            <div className="md:col-span-2">
              <label className="etiqueta">Descripción</label>
              <textarea name="descripcion" defaultValue={caso.descripcion ?? ""} rows={4} className="input" />
            </div>
            <button className="btn w-fit">Guardar</button>
          </form>
        </details>
      </section>

      <div className="space-y-6">
        <section className="tarjeta">
          <h2 className="mb-3 font-semibold text-marca-900">Equipo del caso</h2>
          <ul className="space-y-2 text-sm">
            {equipo?.map((e: any) => (
              <li key={e.abogado.id} className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{e.abogado.nombre}</div>
                  <div className="text-xs text-slate-500">
                    {ROLES_EN_CASO[e.rol]}
                    {e.abogado.inpreabogado ? ` · Inpre. ${e.abogado.inpreabogado}` : ""}
                  </div>
                </div>
                {e.rol !== "responsable" && (
                  <form action={quitarAbogado.bind(null, caso.id, e.abogado.id)}>
                    <button className="text-xs text-red-600 hover:underline">Quitar</button>
                  </form>
                )}
              </li>
            ))}
          </ul>
          <form action={asignar} className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
            <select name="abogado_id" className="input flex-1" required>
              <option value="">Añadir abogado…</option>
              {abogados?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre}
                </option>
              ))}
            </select>
            <Select name="rol" opciones={ROLES_EN_CASO} defecto="colaborador" className="input w-36" />
            <button className="btn-sec">Añadir</button>
          </form>
          {!esGerente && <p className="mt-2 text-xs text-slate-400">Solo el responsable del caso o un socio pueden modificar el equipo.</p>}
        </section>
        <section className="tarjeta text-sm">
          <h2 className="mb-2 font-semibold text-marca-900">Cliente</h2>
          <div className="font-medium">{cliente?.nombre}</div>
          <div className="text-slate-500">{cliente?.cedula_rif}</div>
          <div className="text-slate-500">{cliente?.email}</div>
          <div className="text-slate-500">{cliente?.telefono}</div>
          {(caso.drive_folder_url || cliente?.drive_folder_url) && (
            <a href={caso.drive_folder_url ?? cliente.drive_folder_url} target="_blank" className="mt-2 inline-block text-marca-700 hover:underline">
              📁 Abrir carpeta en Google Drive
            </a>
          )}
        </section>
      </div>
    </div>
  );
}

async function Actuaciones({ casoId, supabase }: { casoId: string; supabase: Db }) {
  const { data } = await supabase.from("actuaciones").select("*, autor:perfiles(nombre)").eq("caso_id", casoId).order("fecha", { ascending: false });
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="tarjeta lg:col-span-2">
        <h2 className="mb-4 font-semibold text-marca-900">Línea de tiempo del expediente</h2>
        {!data?.length && <Vacio>Sin actuaciones registradas.</Vacio>}
        <ol className="relative ml-2 border-l-2 border-marca-100">
          {data?.map((a: any) => (
            <li key={a.id} className="mb-5 ml-5">
              <span className="absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full bg-marca-600" />
              <div className="text-xs text-slate-500">
                {fecha(a.fecha)} · {TIPOS_ACTUACION[a.tipo]} {a.autor ? `· ${a.autor.nombre}` : ""}
              </div>
              <div className="font-medium">{a.titulo}</div>
              {a.descripcion && <p className="text-sm text-slate-600">{a.descripcion}</p>}
            </li>
          ))}
        </ol>
      </section>
      <form action={crearActuacion.bind(null, casoId)} className="tarjeta h-fit space-y-3">
        <h2 className="font-semibold text-marca-900">Registrar actuación</h2>
        <Select name="tipo" opciones={TIPOS_ACTUACION} defecto="escrito" />
        <input name="titulo" required placeholder="Título" className="input" />
        <input name="fecha" type="date" className="input" defaultValue={new Date().toISOString().slice(0, 10)} />
        <textarea name="descripcion" rows={4} placeholder="Detalle (opcional)" className="input" />
        <button className="btn">Guardar</button>
      </form>
    </div>
  );
}

async function Plazos({ casoId, supabase, perfilId }: { casoId: string; supabase: Db; perfilId: string }) {
  const { data } = await supabase.from("plazos").select("*, responsable:perfiles(nombre)").eq("caso_id", casoId).order("completado").order("fecha_vencimiento");
  const { data: equipo } = await supabase.from("caso_abogados").select("abogado:perfiles(id, nombre)").eq("caso_id", casoId);
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="tarjeta overflow-x-auto p-0 lg:col-span-2">
        <table className="tabla">
          <thead>
            <tr>
              <th>Plazo</th>
              <th>Vence</th>
              <th>Responsable</th>
              <th>Avisos</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {data?.map((p: any) => (
              <tr key={p.id} className={p.completado ? "opacity-50" : ""}>
                <td>
                  <div className="font-medium">{p.titulo}</div>
                  <div className="text-xs text-slate-500">
                    {TIPOS_PLAZO[p.tipo]}
                    {p.descripcion ? ` · ${p.descripcion}` : ""}
                  </div>
                </td>
                <td className="whitespace-nowrap">
                  {fecha(p.fecha_vencimiento, true)}
                  <div>{p.completado ? <span className="chip bg-emerald-100 text-emerald-800">cumplido</span> : <ChipDias dias={diasHasta(p.fecha_vencimiento)} />}</div>
                </td>
                <td className="text-xs">{p.responsable?.nombre}</td>
                <td className="text-xs">{p.dias_aviso?.join(", ")} d</td>
                <td>
                  {!p.completado && (
                    <form action={completarPlazo.bind(null, p.id, casoId)}>
                      <button className="btn-sec px-2 py-1 text-xs">✓ Cumplido</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data?.length && <Vacio>Sin plazos.</Vacio>}
      </section>
      <form action={crearPlazo.bind(null, casoId)} className="tarjeta h-fit space-y-3">
        <h2 className="font-semibold text-marca-900">Nuevo plazo / audiencia</h2>
        <input name="titulo" required placeholder="Ej.: Lapso de contestación" className="input" />
        <Select name="tipo" opciones={TIPOS_PLAZO} defecto="lapso_procesal" />
        <div className="flex gap-2">
          <input name="fecha" type="date" required className="input" />
          <input name="hora" type="time" defaultValue="09:00" className="input w-28" />
        </div>
        <select name="responsable_id" defaultValue={perfilId} className="input">
          {equipo?.map((e: any) => (
            <option key={e.abogado.id} value={e.abogado.id}>
              {e.abogado.nombre}
            </option>
          ))}
        </select>
        <div>
          <label className="etiqueta">Avisar por correo (días antes)</label>
          <input name="dias_aviso" defaultValue="7,3,1" className="input" />
        </div>
        <textarea name="descripcion" rows={2} placeholder="Notas (base legal, días de despacho…)" className="input" />
        <button className="btn">Crear plazo</button>
      </form>
    </div>
  );
}

async function Documentos({ caso, cliente, supabase }: { caso: any; cliente: any; supabase: Db }) {
  const { data } = await supabase.from("documentos").select("*, autor:perfiles(nombre)").eq("caso_id", caso.id).order("creado_en", { ascending: false });
  const carpeta = caso.drive_folder_url ?? cliente?.drive_folder_url;
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <section className="tarjeta overflow-x-auto p-0">
          <table className="tabla">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Tipo</th>
                <th>Origen</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data?.map((d: any) => (
                <tr key={d.id}>
                  <td>
                    {d.url ? (
                      <a href={d.url} target="_blank" className="font-medium text-marca-700 hover:underline">
                        {d.nombre}
                      </a>
                    ) : (
                      <span className="font-medium">{d.nombre}</span>
                    )}
                    <div className="text-xs text-slate-500">
                      {fecha(d.creado_en)} · {d.autor?.nombre}
                      {d.contenido_texto ? " · texto disponible" : ""}
                    </div>
                  </td>
                  <td className="text-xs">{d.tipo}</td>
                  <td className="text-xs">{d.origen}</td>
                  <td>
                    <Link href={`/casos/${caso.id}?tab=ia&doc=${d.id}`} className="btn-sec px-2 py-1 text-xs">
                      ✦ Analizar con IA
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!data?.length && <Vacio>Sin documentos vinculados.</Vacio>}
        </section>
        <section className="tarjeta">
          <h2 className="mb-2 font-semibold text-marca-900">Google Drive del cliente</h2>
          {carpeta ? (
            <ArchivosDrive carpetaUrl={carpeta} casoId={caso.id} configurado={driveConfigurado()} />
          ) : (
            <p className="text-sm text-slate-500">
              Este caso no tiene carpeta de Drive. Añádela en la pestaña Resumen o en la ficha del cliente.
            </p>
          )}
        </section>
      </div>
      <form action={agregarDocumento.bind(null, caso.id)} className="tarjeta h-fit space-y-3">
        <h2 className="font-semibold text-marca-900">Vincular documento</h2>
        <input name="nombre" required placeholder="Nombre" className="input" />
        <input name="tipo" placeholder="Tipo (demanda, poder, contrato, prueba…)" className="input" />
        <input name="url" placeholder="Enlace de Google Drive u otra URL" className="input" />
        <textarea name="contenido_texto" rows={6} placeholder="O pega aquí el texto del documento para analizarlo con IA" className="input" />
        <button className="btn">Guardar</button>
      </form>
    </div>
  );
}

async function Jurisprudencia({ casoId, supabase }: { casoId: string; supabase: Db }) {
  const { data } = await supabase.from("caso_sentencias").select("*, sentencia:sentencias(*)").eq("caso_id", casoId).order("relevancia", { ascending: false });
  const { data: todas } = await supabase.from("sentencias").select("id, sala, numero, asunto").order("creado_en", { ascending: false }).limit(200);
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <section className="space-y-4 lg:col-span-2">
        {!data?.length && (
          <div className="tarjeta">
            <Vacio>Sin sentencias vinculadas. Búscalas en Jurisprudencia TSJ.</Vacio>
          </div>
        )}
        {data?.map((v: any) => (
          <article key={v.sentencia.id} className="tarjeta">
            <div className="text-xs text-slate-500">
              {SALAS_TSJ[v.sentencia.sala]} · Sent. {v.sentencia.numero} · {fecha(v.sentencia.fecha)} · Relevancia {v.relevancia}/5
            </div>
            <h3 className="font-semibold">{v.sentencia.asunto}</h3>
            {v.sentencia.doctrina && <p className="mt-1 text-sm italic text-slate-700">“{v.sentencia.doctrina}”</p>}
            {v.nota && <p className="mt-1 text-sm text-slate-600">Nota: {v.nota}</p>}
            {v.sentencia.url && (
              <a href={v.sentencia.url} target="_blank" className="mt-1 inline-block text-sm text-marca-700 hover:underline">
                Ver en tsj.gob.ve
              </a>
            )}
          </article>
        ))}
      </section>
      <div className="space-y-4">
        <form action={vincularSentencia.bind(null, casoId)} className="tarjeta space-y-3">
          <h2 className="font-semibold text-marca-900">Vincular sentencia guardada</h2>
          <select name="sentencia_id" required className="input">
            <option value="">Seleccione…</option>
            {todas?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.numero} — {s.asunto?.slice(0, 60)}
              </option>
            ))}
          </select>
          <Select name="relevancia" opciones={{ "5": "5 — Determinante", "4": "4 — Alta", "3": "3 — Media", "2": "2 — Baja", "1": "1 — Referencial" }} defecto="3" />
          <textarea name="nota" rows={2} placeholder="¿Por qué es relevante?" className="input" />
          <button className="btn">Vincular</button>
        </form>
        <Link href={`/tsj?caso=${casoId}`} className="btn-sec w-full justify-center">
          🏛 Buscar en el TSJ para este caso
        </Link>
      </div>
    </div>
  );
}

async function IA({ casoId, supabase }: { casoId: string; supabase: Db }) {
  const { data: historial } = await supabase
    .from("analisis_ia")
    .select("id, tipo, pregunta, resultado, modelo, creado_en, autor:perfiles(nombre)")
    .eq("caso_id", casoId)
    .order("creado_en", { ascending: false })
    .limit(20);
  const { data: docs } = await supabase.from("documentos").select("id, nombre, drive_file_id, contenido_texto").eq("caso_id", casoId);
  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <PanelIA casoId={casoId} documentos={(docs ?? []).map((d) => ({ id: d.id, nombre: d.nombre, analizable: Boolean(d.contenido_texto || d.drive_file_id) }))} />
      </div>
      <section className="space-y-4 lg:col-span-3">
        {!historial?.length && (
          <div className="tarjeta">
            <Vacio>Aún no hay análisis guardados para este caso.</Vacio>
          </div>
        )}
        {historial?.map((h: any) => (
          <article key={h.id} className="tarjeta">
            <div className="mb-2 text-xs text-slate-500">
              {fecha(h.creado_en, true)} · {h.tipo} · {h.autor?.nombre} · {h.modelo}
            </div>
            {h.pregunta && <div className="mb-2 font-medium">{h.pregunta}</div>}
            <Markdown texto={h.resultado} />
          </article>
        ))}
      </section>
    </div>
  );
}

async function Tiempo({ casoId, supabase, tarifa }: { casoId: string; supabase: Db; tarifa: number }) {
  const [{ data: horas }, { data: gastos }] = await Promise.all([
    supabase.from("registros_tiempo").select("*, abogado:perfiles(nombre)").eq("caso_id", casoId).order("fecha", { ascending: false }),
    supabase.from("gastos").select("*").eq("caso_id", casoId).order("fecha", { ascending: false }),
  ]);
  const totalH = (horas ?? []).reduce((s: number, h: any) => s + Number(h.horas), 0);
  const totalV = (horas ?? []).reduce((s: number, h: any) => s + (h.facturable ? Number(h.horas) * Number(h.tarifa) : 0), 0);
  const hoy = new Date().toISOString().slice(0, 10);
  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <section className="tarjeta overflow-x-auto p-0">
          <div className="flex justify-between p-4 text-sm">
            <span className="font-semibold text-marca-900">Horas registradas</span>
            <span>
              {totalH.toFixed(1)} h · {dinero(totalV)} facturables
            </span>
          </div>
          <table className="tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Abogado</th>
                <th>Descripción</th>
                <th className="text-right">Horas</th>
                <th className="text-right">Monto</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {horas?.map((h: any) => (
                <tr key={h.id}>
                  <td className="whitespace-nowrap">{fecha(h.fecha)}</td>
                  <td className="text-xs">{h.abogado?.nombre}</td>
                  <td>{h.descripcion}</td>
                  <td className="text-right">{Number(h.horas).toFixed(1)}</td>
                  <td className="text-right">{h.facturable ? dinero(Number(h.horas) * Number(h.tarifa)) : "—"}</td>
                  <td className="text-xs">{h.factura_id ? "Facturado" : h.facturable ? "Pendiente" : "No facturable"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="tarjeta overflow-x-auto p-0">
          <div className="p-4 text-sm font-semibold text-marca-900">Gastos del caso</div>
          <table className="tabla">
            <tbody>
              {gastos?.map((g: any) => (
                <tr key={g.id}>
                  <td className="whitespace-nowrap">{fecha(g.fecha)}</td>
                  <td>{g.descripcion}</td>
                  <td className="text-right">{dinero(g.monto, g.moneda)}</td>
                  <td className="text-xs">{g.factura_id ? "Facturado" : g.reembolsable ? "Reembolsable" : "Interno"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!gastos?.length && <Vacio>Sin gastos.</Vacio>}
        </section>
      </div>
      <div className="space-y-4">
        <form action={registrarTiempo.bind(null, casoId)} className="tarjeta space-y-3">
          <h2 className="font-semibold text-marca-900">Registrar horas</h2>
          <div className="flex gap-2">
            <input name="fecha" type="date" defaultValue={hoy} className="input" />
            <input name="horas" type="number" step="0.25" min="0.25" required placeholder="Horas" className="input w-24" />
          </div>
          <input name="descripcion" required placeholder="Actividad realizada" className="input" />
          <div className="flex items-center gap-2">
            <input name="tarifa" type="number" step="0.01" defaultValue={tarifa} className="input w-28" />
            <span className="text-xs text-slate-500">USD/h</span>
            <label className="ml-auto flex items-center gap-1 text-sm">
              <input type="checkbox" name="facturable" defaultChecked /> Facturable
            </label>
          </div>
          <button className="btn">Registrar</button>
        </form>
        <form action={registrarGasto.bind(null, casoId)} className="tarjeta space-y-3">
          <h2 className="font-semibold text-marca-900">Registrar gasto</h2>
          <input name="fecha" type="date" defaultValue={hoy} className="input" />
          <input name="descripcion" required placeholder="Aranceles, copias, traslados…" className="input" />
          <input name="monto" type="number" step="0.01" required placeholder="Monto USD" className="input" />
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" name="reembolsable" defaultChecked /> Reembolsable por el cliente
          </label>
          <button className="btn">Registrar</button>
        </form>
      </div>
    </div>
  );
}

async function Facturacion({ caso, supabase }: { caso: any; supabase: Db }) {
  const { data: facturas } = await supabase.from("v_facturas_saldo").select("*").eq("caso_id", caso.id).order("fecha_emision", { ascending: false });
  return (
    <div className="space-y-4">
      <div className="tarjeta flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm text-slate-500">Horas y gastos pendientes por facturar</div>
          <div className="text-2xl font-semibold text-marca-900">{dinero(caso.por_facturar)}</div>
        </div>
        <form action={facturarCaso.bind(null, caso.id)}>
          <button className="btn">Generar factura borrador</button>
        </form>
      </div>
      <section className="tarjeta overflow-x-auto p-0">
        <table className="tabla">
          <thead>
            <tr>
              <th>Factura</th>
              <th>Emisión</th>
              <th>Estado</th>
              <th className="text-right">Total</th>
              <th className="text-right">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {facturas?.map((f: any) => (
              <tr key={f.id}>
                <td>
                  <Link href={`/facturacion/${f.id}`} className="font-medium text-marca-700 hover:underline">
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
        {!facturas?.length && <Vacio>Sin facturas para este caso.</Vacio>}
      </section>
    </div>
  );
}
