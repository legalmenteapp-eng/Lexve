import Link from "next/link";
import { sesion } from "@/lib/auth";
import { ChipDias, Titulo, Vacio } from "@/components/ui";
import { diasHasta, fecha } from "@/lib/formato";
import { TIPOS_PLAZO } from "@/lib/tipos";
import { ENVIO_REAL } from "@/lib/correo";
import { ejecutarAlertasAhora } from "../acciones";

export default async function Alertas() {
  const { supabase, esGerente } = await sesion();
  const en30 = new Date(Date.now() + 30 * 86_400_000).toISOString();
  const [{ data: plazos }, { data: correos }] = await Promise.all([
    supabase.from("plazos").select("id, titulo, tipo, fecha_vencimiento, dias_aviso, caso:casos(id, codigo, titulo), responsable:perfiles(nombre)").eq("completado", false).lte("fecha_vencimiento", en30).order("fecha_vencimiento"),
    supabase.from("alertas_correo").select("*").order("creado_en", { ascending: false }).limit(50),
  ]);
  return (
    <>
      <Titulo
        accion={
          esGerente && (
            <form action={ejecutarAlertasAhora}>
              <button className="btn">Generar y enviar alertas ahora</button>
            </form>
          )
        }
      >
        Alertas y vencimientos
      </Titulo>
      <p className={`mb-4 rounded-lg p-3 text-sm ${ENVIO_REAL ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
        {ENVIO_REAL
          ? "Envío real activado: los correos se envían a los abogados de cada caso."
          : "Modo simulación: las alertas se generan y registran, pero NO se envían correos. Activa ALERTAS_ENVIO_REAL=true y RESEND_API_KEY para enviarlas."}{" "}
        El aviso automático corre a diario a las 7:00 a. m. (hora de Caracas) según los días configurados en cada plazo.
      </p>
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="tarjeta">
          <h2 className="mb-3 font-semibold text-marca-900">Próximos 30 días</h2>
          <ul className="divide-y divide-slate-100">
            {plazos?.map((p) => {
              const caso = p.caso as unknown as { id: string; codigo: string; titulo: string };
              const resp = p.responsable as unknown as { nombre: string } | null;
              return (
                <li key={p.id} className="flex items-start justify-between gap-3 py-2.5">
                  <div>
                    <Link href={`/casos/${caso.id}?tab=plazos`} className="font-medium hover:underline">
                      {p.titulo}
                    </Link>
                    <div className="text-xs text-slate-500">
                      {caso.codigo} · {TIPOS_PLAZO[p.tipo]} · {fecha(p.fecha_vencimiento, true)} · {resp?.nombre} · avisos {p.dias_aviso?.join("/")} d
                    </div>
                  </div>
                  <ChipDias dias={diasHasta(p.fecha_vencimiento)} />
                </li>
              );
            })}
          </ul>
          {!plazos?.length && <Vacio>Sin vencimientos próximos.</Vacio>}
        </section>
        <section className="tarjeta">
          <h2 className="mb-3 font-semibold text-marca-900">Historial de correos</h2>
          <ul className="divide-y divide-slate-100 text-sm">
            {correos?.map((c) => (
              <li key={c.id} className="py-2">
                <div className="font-medium">{c.asunto}</div>
                <div className="text-xs text-slate-500">
                  Para {c.destinatario} · {c.estado}
                  {c.enviado_en ? ` · ${fecha(c.enviado_en, true)}` : ""}
                  {c.error ? ` · ${c.error}` : ""}
                </div>
              </li>
            ))}
          </ul>
          {!correos?.length && <Vacio>Aún no se han generado alertas.</Vacio>}
        </section>
      </div>
    </>
  );
}
