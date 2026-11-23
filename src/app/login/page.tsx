"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { crearClienteNavegador } from "@/lib/supabase/client";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("socia@lexve.demo");
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    const { error } = await crearClienteNavegador().auth.signInWithPassword({ email, password: clave });
    setCargando(false);
    if (error) return setError("Correo o contraseña incorrectos");
    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-marca-900 to-marca-600 p-4">
      <form onSubmit={entrar} className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="text-3xl font-bold text-marca-900">
            Lex<span className="text-oro">VE</span>
          </div>
          <p className="mt-1 text-sm text-slate-500">Backoffice jurídico para despachos venezolanos</p>
        </div>
        <label className="etiqueta">Correo</label>
        <input className="input mb-4" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label className="etiqueta">Contraseña</label>
        <input className="input mb-4" type="password" value={clave} onChange={(e) => setClave(e.target.value)} required />
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        <button className="btn w-full justify-center" disabled={cargando}>
          {cargando ? "Entrando…" : "Entrar"}
        </button>
        <p className="mt-4 text-center text-xs text-slate-400">Demo: socia@lexve.demo · LexVE-Demo-2026!</p>
      </form>
    </main>
  );
}
