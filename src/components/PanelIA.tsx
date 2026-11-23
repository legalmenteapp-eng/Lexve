"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ejecutarYEsperar } from "@/lib/esperar-trabajo";

const TIPOS = {
  caso: "Análisis integral del caso",
  estrategia: "Estrategia procesal y próximos pasos",
  riesgo: "Evaluación de riesgos y probabilidad",
  documento: "Analizar un documento",
  informe: "Informe para el cliente (lenguaje sencillo)",
} as const;

export function PanelIA({ casoId, documentos }: { casoId: string; documentos: { id: string; nombre: string; analizable: boolean }[] }) {
  const router = useRouter();
  const docInicial = useSearchParams().get("doc") ?? "";
  const [tipo, setTipo] = useState<keyof typeof TIPOS>(docInicial ? "documento" : "caso");
  const [documento, setDocumento] = useState(docInicial);
  const [pregunta, setPregunta] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    try {
      await ejecutarYEsperar("/api/ia/analizar", { caso_id: casoId, tipo, pregunta, documento_id: tipo === "documento" ? documento : undefined });
      setPregunta("");
      router.refresh();
    } catch (err) {
      setError(String(err instanceof Error ? err.message : err));
    } finally {
      setCargando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="tarjeta space-y-3 lg:sticky lg:top-6">
      <h2 className="font-semibold text-marca-900">✦ Asistente jurídico IA</h2>
      <p className="text-xs text-slate-500">
        Usa los datos del expediente, el seguimiento, los plazos, los documentos y la jurisprudencia vinculada. Verifica siempre las citas antes de usarlas.
      </p>
      <select value={tipo} onChange={(e) => setTipo(e.target.value as keyof typeof TIPOS)} className="input">
        {Object.entries(TIPOS).map(([k, v]) => (
          <option key={k} value={k}>
            {v}
          </option>
        ))}
      </select>
      {tipo === "documento" && (
        <select value={documento} onChange={(e) => setDocumento(e.target.value)} className="input" required>
          <option value="">Seleccione documento…</option>
          {documentos.map((d) => (
            <option key={d.id} value={d.id} disabled={!d.analizable}>
              {d.nombre}
              {d.analizable ? "" : " (sin texto ni Drive)"}
            </option>
          ))}
        </select>
      )}
      <textarea
        value={pregunta}
        onChange={(e) => setPregunta(e.target.value)}
        rows={4}
        className="input"
        placeholder="Pregunta específica (opcional). Ej.: ¿Procede la perención de la instancia? ¿Qué pruebas promover?"
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button className="btn w-full justify-center" disabled={cargando}>
        {cargando ? "Analizando… (puede tardar unos minutos)" : "Analizar"}
      </button>
    </form>
  );
}
