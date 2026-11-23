"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Archivo {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  webViewLink: string;
}

export function ArchivosDrive({ carpetaUrl, casoId, configurado }: { carpetaUrl: string; casoId?: string; configurado: boolean }) {
  const router = useRouter();
  const [archivos, setArchivos] = useState<Archivo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vinculando, setVinculando] = useState<string | null>(null);

  useEffect(() => {
    if (!configurado) return;
    fetch(`/api/drive/archivos?carpeta=${encodeURIComponent(carpetaUrl)}`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        setArchivos(j.archivos);
      })
      .catch((e) => setError(String(e.message ?? e)));
  }, [carpetaUrl, configurado]);

  async function vincular(a: Archivo) {
    if (!casoId) return;
    setVinculando(a.id);
    const r = await fetch("/api/drive/vincular", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caso_id: casoId, archivo: a }),
    });
    setVinculando(null);
    if (r.ok) router.refresh();
    else setError((await r.json()).error);
  }

  return (
    <div className="text-sm">
      <a href={carpetaUrl} target="_blank" className="text-marca-700 hover:underline">
        📁 Abrir carpeta en Google Drive
      </a>
      {!configurado && (
        <p className="mt-2 text-xs text-slate-500">
          Para listar y analizar archivos desde aquí, configura GOOGLE_SERVICE_ACCOUNT_JSON y comparte la carpeta (solo lectura) con el correo de la cuenta de servicio.
        </p>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
      {configurado && !archivos && !error && <p className="mt-2 text-xs text-slate-400">Cargando archivos…</p>}
      {archivos && (
        <ul className="mt-3 divide-y divide-slate-100">
          {archivos.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2 py-2">
              <a href={a.webViewLink} target="_blank" className="truncate hover:underline">
                {a.name}
              </a>
              {casoId && (
                <button onClick={() => vincular(a)} disabled={vinculando === a.id} className="btn-sec shrink-0 px-2 py-1 text-xs">
                  {vinculando === a.id ? "…" : "Vincular al caso"}
                </button>
              )}
            </li>
          ))}
          {!archivos.length && <li className="py-2 text-xs text-slate-400">Carpeta vacía o sin acceso.</li>}
        </ul>
      )}
    </div>
  );
}
