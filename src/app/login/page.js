"use client";

import { useState } from "react";
import { Alert } from "@/components/ui/Feedback";

export default function LoginPage() {
  const [email, setEmail] = useState("");
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
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data?.message || "No se pudo iniciar sesion.");
        return;
      }

      window.location.assign("/inicio");
    } catch {
      setError("Ocurrio un error de conexion.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-fondo p-4 sm:p-6">
      <div
        className="pointer-events-none absolute -left-24 top-0 h-72 w-72 rounded-full bg-acento/10 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute -bottom-24 right-0 h-80 w-80 rounded-full bg-principal/10 blur-3xl"
        aria-hidden="true"
      />

      <section className="r360-card relative w-full max-w-md p-6 sm:p-8">
        <div className="flex flex-col items-center text-center">
          <span className="grid h-14 w-14 place-items-center rounded-xl bg-principal text-2xl font-black text-fondo">
            R
          </span>
          <h1 className="mt-4 text-2xl font-extrabold text-texto">Rutina360</h1>
          <p className="mt-1 text-sm text-texto-2">Panel administrativo</p>
        </div>

        <form className="mt-7 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="r360-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="r360-input"
            />
          </div>

          <div>
            <label className="r360-label" htmlFor="password">
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
              className="r360-input"
            />
          </div>

          {error ? <Alert>{error}</Alert> : null}

          <button type="submit" disabled={loading} className="r360-btn r360-btn-primary w-full">
            {loading ? "Ingresando..." : "Iniciar sesion"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-texto-3">
          Si sos atleta, entra desde la app movil de Rutina360.
        </p>
      </section>
    </main>
  );
}
