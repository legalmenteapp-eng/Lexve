"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ENLACES = [
  { href: "/", texto: "Panel", icono: "◧" },
  { href: "/casos", texto: "Casos", icono: "⚖" },
  { href: "/clientes", texto: "Clientes", icono: "👥" },
  { href: "/tsj", texto: "Jurisprudencia TSJ", icono: "🏛" },
  { href: "/facturacion", texto: "Facturación", icono: "＄" },
  { href: "/informes", texto: "Informes", icono: "📊" },
  { href: "/alertas", texto: "Alertas", icono: "🔔" },
];

export function Nav() {
  const ruta = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto md:flex-col">
      {ENLACES.map((e) => {
        const activo = e.href === "/" ? ruta === "/" : ruta.startsWith(e.href);
        return (
          <Link
            key={e.href}
            href={e.href}
            className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm ${
              activo ? "bg-white/15 font-semibold text-white" : "text-marca-100 hover:bg-white/10"
            }`}
          >
            <span className="w-5 text-center">{e.icono}</span>
            {e.texto}
          </Link>
        );
      })}
    </nav>
  );
}
