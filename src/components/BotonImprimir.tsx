"use client";
export function BotonImprimir({ texto = "🖨 Imprimir / PDF" }: { texto?: string }) {
  return (
    <button type="button" className="btn-sec no-imprimir" onClick={() => window.print()}>
      {texto}
    </button>
  );
}
