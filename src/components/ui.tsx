import Link from "next/link";
import { ESTADOS_CASO, ESTADOS_FACTURA } from "@/lib/tipos";

export function Titulo({ children, accion }: { children: React.ReactNode; accion?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-semibold text-marca-900">{children}</h1>
      {accion}
    </div>
  );
}

export function Kpi({ titulo, valor, detalle, href }: { titulo: string; valor: React.ReactNode; detalle?: string; href?: string }) {
  const c = (
    <div className="tarjeta h-full">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{titulo}</div>
      <div className="mt-1 text-2xl font-semibold text-marca-900">{valor}</div>
      {detalle && <div className="mt-1 text-xs text-slate-500">{detalle}</div>}
    </div>
  );
  return href ? <Link href={href}>{c}</Link> : c;
}

const COLOR_ESTADO: Record<string, string> = {
  prospecto: "bg-slate-100 text-slate-700",
  abierto: "bg-sky-100 text-sky-800",
  en_tramite: "bg-indigo-100 text-indigo-800",
  en_sentencia: "bg-amber-100 text-amber-800",
  apelacion: "bg-orange-100 text-orange-800",
  casacion: "bg-rose-100 text-rose-800",
  ejecucion: "bg-teal-100 text-teal-800",
  cerrado: "bg-emerald-100 text-emerald-800",
  archivado: "bg-slate-200 text-slate-600",
  borrador: "bg-slate-100 text-slate-700",
  emitida: "bg-sky-100 text-sky-800",
  pagada: "bg-emerald-100 text-emerald-800",
  parcial: "bg-amber-100 text-amber-800",
  vencida: "bg-red-100 text-red-800",
  anulada: "bg-slate-200 text-slate-500 line-through",
};

export function ChipEstado({ estado }: { estado: string }) {
  return <span className={`chip ${COLOR_ESTADO[estado] ?? "bg-slate-100"}`}>{ESTADOS_CASO[estado] ?? ESTADOS_FACTURA[estado] ?? estado}</span>;
}

export function ChipDias({ dias }: { dias: number }) {
  const c = dias < 0 ? "bg-red-600 text-white" : dias <= 1 ? "bg-red-100 text-red-800" : dias <= 3 ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700";
  const t = dias < 0 ? `vencido ${-dias} d` : dias === 0 ? "hoy" : dias === 1 ? "mañana" : `${dias} días`;
  return <span className={`chip ${c}`}>{t}</span>;
}

export function Prioridad({ p }: { p: number }) {
  return <span title="Prioridad" className={`chip ${p === 1 ? "bg-red-50 text-red-700" : p === 2 ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-slate-500"}`}>{p === 1 ? "Alta" : p === 2 ? "Media" : "Baja"}</span>;
}

export function Vacio({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-slate-400">{children}</p>;
}

export function Select({ name, opciones, defecto, vacio, className = "input", required }: { name: string; opciones: Record<string, string>; defecto?: string; vacio?: string; className?: string; required?: boolean }) {
  return (
    <select name={name} defaultValue={defecto ?? ""} className={className} required={required}>
      {vacio !== undefined && <option value="">{vacio}</option>}
      {Object.entries(opciones).map(([k, v]) => (
        <option key={k} value={k}>
          {v}
        </option>
      ))}
    </select>
  );
}
