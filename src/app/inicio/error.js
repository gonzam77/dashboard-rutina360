"use client";

import { useEffect } from "react";

/**
 * Limite de error de /inicio. Evita que una falla al leer el backend termine en
 * la pantalla generica de Next sin forma de reintentar.
 */
export default function InicioError({ error, reset }) {
  useEffect(() => {
    console.error("Error en el panel:", error);
  }, [error]);

  return (
    <section className="rounded-3xl border border-red-300/40 bg-red-950/40 p-8 text-red-100">
      <h1 className="text-2xl font-semibold">No se pudo cargar esta seccion</h1>
      <p className="mt-3 text-sm text-red-200/90">
        Ocurrio un error al consultar el servidor. Podes reintentar; si el problema persiste,
        volve a iniciar sesion.
      </p>
      {error?.digest ? (
        <p className="mt-2 text-xs text-red-200/70">Referencia: {error.digest}</p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
        >
          Reintentar
        </button>
        <a
          href="/inicio"
          className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
        >
          Ir al panel
        </a>
      </div>
    </section>
  );
}
