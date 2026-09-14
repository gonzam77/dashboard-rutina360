"use client";

import { useActionState } from "react";
import { Alert } from "@/components/ui/Feedback";

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
          className={`r360-input ${inputClassName}`}
        />
        <button
          type="submit"
          disabled={isPending}
          className="r360-btn r360-btn-accent"
        >
          {isPending ? pendingLabel : submitLabel}
        </button>
      </form>

      {state?.error ? <Alert className="mt-3">{state.error}</Alert> : null}
      {state?.message ? (
        <Alert tone="exito" className="mt-3">
          {state.message}
        </Alert>
      ) : null}
    </div>
  );
}
