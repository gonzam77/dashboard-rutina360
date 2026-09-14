"use client";

import { useEffect } from "react";
import Icon from "@/components/ui/Icon";

/**
 * Limite de error de /inicio. Evita que una falla al leer el backend termine en
 * la pantalla generica de Next sin forma de reintentar.
 */
export default function InicioError({ error, reset }) {
  useEffect(() => {
    console.error("Error en el panel:", error);
  }, [error]);

  return (
    <section className="r360-card p-6 sm:p-8">
      <span className="grid h-12 w-12 place-items-center rounded-xl bg-peligro/15 text-2xl text-peligro">
        <Icon name="alerta" />
      </span>
      <h1 className="mt-4 text-2xl font-extrabold text-texto">No se pudo cargar esta seccion</h1>
      <p className="mt-2 max-w-xl text-sm text-texto-2">
        Ocurrio un error al consultar el servidor. Podes reintentar; si el problema persiste, volve
        a iniciar sesion.
      </p>
      {error?.digest ? (
        <p className="mt-2 text-xs text-texto-3">Referencia: {error.digest}</p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <button type="button" onClick={reset} className="r360-btn r360-btn-accent">
          Reintentar
        </button>
        <a href="/inicio" className="r360-btn r360-btn-ghost">
          <Icon name="panel" />
          Ir al panel
        </a>
      </div>
    </section>
  );
}
