import { sesion } from "@/lib/auth";
import { Nav } from "@/components/Nav";
import { cerrarSesion } from "./acciones";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { perfil, supabase } = await sesion();
  const { data: despacho } = await supabase.from("despachos").select("nombre").eq("id", perfil.despacho_id).single();
  return (
    <div className="min-h-screen md:flex">
      <aside className="no-imprimir bg-marca-900 p-4 md:fixed md:inset-y-0 md:w-60 md:p-5">
        <div className="mb-1 text-2xl font-bold text-white">
          Lex<span className="text-oro">VE</span>
        </div>
        <div className="mb-5 text-xs text-marca-100/80">{despacho?.nombre}</div>
        <Nav />
        <div className="mt-6 border-t border-white/10 pt-4 text-xs text-marca-100 md:absolute md:bottom-5 md:left-5 md:right-5">
          <div className="font-medium text-white">{perfil.nombre}</div>
          <div className="capitalize">
            {perfil.rol}
            {perfil.inpreabogado ? ` · Inpre. ${perfil.inpreabogado}` : ""}
          </div>
          <form action={cerrarSesion}>
            <button className="mt-2 underline hover:text-white">Cerrar sesión</button>
          </form>
        </div>
      </aside>
      <main className="flex-1 p-4 md:ml-60 md:p-8">{children}</main>
    </div>
  );
}
