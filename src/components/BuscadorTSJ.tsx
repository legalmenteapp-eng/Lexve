"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Markdown } from "./MarkdownCliente";
import { ejecutarYEsperar } from "@/lib/esperar-trabajo";

interface Resultado {
  sala: string;
  numero: string;
  expediente: string;
  fecha: string;
  ponente: string;
  asunto: string;
  resumen: string;
  url: string;
}

const SALAS = ["Sala Constitucional", "Sala Político-Administrativa", "Sala de Casación Civil", "Sala de Casación Penal", "Sala de Casación Social", "Sala Electoral", "Sala Plena"];

export function BuscadorTSJ({ casoId }: { casoId?: string }) {
  const router = useRouter();
  const [consulta, setConsulta] = useState("");
  const [sala, setSala] = useState("");
  const [cargando, setCargando] = useState(false);
  const [res, setRes] = useState<{ resultados: Resultado[]; comentario: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [guardados, setGuardados] = useState<Record<string, boolean>>({});
  const [url, setUrl] = useState("");

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    setRes(null);
    try {
      setRes(await ejecutarYEsperar<{ resultados: Resultado[]; comentario: string }>("/api/tsj/buscar", { consulta, sala }));
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setCargando(false);
    }
  }

  async function importar(u: string, datos?: Resultado) {
    setGuardados((g) => ({ ...g, [u]: false }));
    try {
      await ejecutarYEsperar("/api/tsj/importar", { url: u, caso_id: casoId, datos });
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
      setGuardados((g) => {
        const n = { ...g };
        delete n[u];
        return n;
      });
      return;
    }
    setGuardados((g) => ({ ...g, [u]: true }));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={buscar} className="tarjeta space-y-3">
        <h2 className="font-semibold text-marca-900">🏛 Buscar en el TSJ con IA</h2>
        <p className="text-xs text-slate-500">
          Busca en tsj.gob.ve y resume las decisiones encontradas. Solo se muestran resultados con enlace al TSJ.
          {casoId && " Las sentencias que guardes quedarán vinculadas al caso."}
        </p>
        <textarea value={consulta} onChange={(e) => setConsulta(e.target.value)} rows={3} required className="input" placeholder="Ej.: perención breve de la instancia por falta de impulso de la citación" />
        <div className="flex gap-2">
          <select value={sala} onChange={(e) => setSala(e.target.value)} className="input">
            <option value="">Todas las salas</option>
            {SALAS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <button className="btn shrink-0" disabled={cargando}>
            {cargando ? "Buscando…" : "Buscar"}
          </button>
        </div>
      </form>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          importar(url);
        }}
        className="tarjeta flex gap-2"
      >
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Importar por URL: http://historico.tsj.gob.ve/decisiones/scon/…" className="input" />
        <button className="btn-sec shrink-0">{guardados[url] === false ? "Importando…" : "Importar"}</button>
      </form>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {res && (
        <div className="space-y-3">
          {res.comentario && (
            <div className="tarjeta">
              <Markdown texto={res.comentario} />
            </div>
          )}
          {!res.resultados.length && <p className="text-sm text-slate-500">No se encontraron sentencias con enlace verificable.</p>}
          {res.resultados.map((r) => (
            <article key={r.url} className="tarjeta">
              <div className="text-xs text-slate-500">
                {r.sala} · {r.numero && `Sent. ${r.numero}`} {r.expediente && `· Exp. ${r.expediente}`} {r.fecha && `· ${r.fecha}`} {r.ponente && `· Ponente: ${r.ponente}`}
              </div>
              <h3 className="font-semibold">{r.asunto}</h3>
              <p className="mt-1 text-sm text-slate-700">{r.resumen}</p>
              <div className="mt-2 flex gap-3">
                <a href={r.url} target="_blank" className="text-sm text-marca-700 hover:underline">
                  Ver en tsj.gob.ve ↗
                </a>
                <button onClick={() => importar(r.url, r)} disabled={r.url in guardados} className="btn-sec px-2 py-1 text-xs">
                  {guardados[r.url] ? "✓ Guardada" : guardados[r.url] === false ? "Guardando…" : casoId ? "Guardar y vincular al caso" : "Guardar en mi jurisprudencia"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
