import "server-only";
import { redirect } from "next/navigation";
import { crearClienteServidor } from "./supabase/server";
import type { Perfil } from "./tipos";

/** Devuelve el cliente Supabase y el perfil del abogado autenticado (o redirige a /login). */
export async function sesion() {
  const supabase = await crearClienteServidor();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: perfil } = await supabase.from("perfiles").select("*").eq("id", user.id).single();
  if (!perfil) redirect("/login?error=sin_perfil");
  return { supabase, perfil: perfil as Perfil, esGerente: ["admin", "socio"].includes(perfil.rol) };
}
