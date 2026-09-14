"use client";

import { useActionState } from "react";

const INITIAL_STATE = { error: "", message: "" };

/**
 * Form de alta del catalogo. Usa useActionState para mostrar el error al lado
 * del campo: antes la server action lanzaba y el usuario veia la pantalla de
 * error generica de Next sin saber que habia fallado.
 */
export default function CatalogCreateForm({
  action,
  placeholder,
  submitLabel,
  pendingLabel,
  hiddenFields = {},
  className = "",
  inputClassName = "",
}) {
  const [state, formAction, isPending] = useActionState(action, INITIAL_STATE);

  return (
    <div className={className}>
      <form action={formAction} className="flex flex-col gap-3 sm:flex-row">
        {Object.entries(hiddenFields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <input
          type="text"
          name="name"
          required
          disabled={isPending}
          placeholder={placeholder}
          className={`w-full rounded-lg border border-white/20 px-3 py-2 text-sm text-white outline-none ring-cyan-300/35 placeholder:text-white/55 focus:ring disabled:opacity-60 ${inputClassName}`}
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-60"
        >
          {isPending ? pendingLabel : submitLabel}
        </button>
      </form>

      {state?.error ? <p className="mt-2 text-sm text-rose-200">{state.error}</p> : null}
      {state?.message ? <p className="mt-2 text-sm text-cyan-100">{state.message}</p> : null}
    </div>
  );
}
