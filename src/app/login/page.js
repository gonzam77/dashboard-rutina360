"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: username.trim().toUpperCase(), password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data?.message || "No se pudo iniciar sesion.");
        return;
      }

      router.push("/inicio");
      router.refresh();
    } catch {
      setError("Ocurrio un error de conexion.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-[#071a2f] via-[#0f2a46] to-[#17385a] p-6">
      <div className="pointer-events-none absolute -left-20 top-8 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 right-0 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl" />

      <section className="relative w-full max-w-md rounded-3xl border border-white/15 bg-[#17385a]/90 p-8 text-white shadow-[0_18px_45px_rgba(0,0,0,0.35)] backdrop-blur">
        <h1 className="text-2xl font-semibold text-white">Ingreso administrativo</h1>
        <p className="mt-2 text-sm text-white/75">
          Inicia sesion para acceder al dashboard.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-white/85" htmlFor="username">
              Usuario
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="w-full rounded-xl border border-white/20 bg-[#0f2a46]/90 px-3 py-2 text-white placeholder:text-white/45 outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/30"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-white/85" htmlFor="password">
              Contrasena
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-white/20 bg-[#0f2a46]/90 px-3 py-2 text-white placeholder:text-white/45 outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/30"
            />
          </div>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl border border-cyan-300/40 bg-cyan-300/10 px-4 py-2 font-medium text-cyan-100 transition hover:bg-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Ingresando..." : "Iniciar sesion"}
          </button>
        </form>
      </section>
    </main>
  );
}
