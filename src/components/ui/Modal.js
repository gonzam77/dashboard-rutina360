"use client";

import { useEffect, useId, useRef } from "react";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Dialogo modal accesible, compartido por todos los formularios del panel.
 *
 * Cubre lo que faltaba en los modales sueltos: cierre con Escape y con click en
 * el fondo, foco atrapado adentro, foco devuelto al elemento que lo abrio y
 * bloqueo del scroll de la pagina mientras esta abierto.
 */
export default function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "lg",
  closeDisabled = false,
}) {
  const dialogRef = useRef(null);
  const previouslyFocusedRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    previouslyFocusedRef.current = document.activeElement;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const firstFocusable = dialogRef.current?.querySelector(FOCUSABLE_SELECTOR);
    (firstFocusable || dialogRef.current)?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        if (!closeDisabled) {
          event.preventDefault();
          onClose?.();
        }
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const focusables = Array.from(
        dialogRef.current?.querySelectorAll(FOCUSABLE_SELECTOR) || []
      ).filter((element) => element.offsetParent !== null);

      if (focusables.length === 0) {
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocusedRef.current?.focus?.();
    };
  }, [closeDisabled, onClose, open]);

  if (!open) {
    return null;
  }

  const maxWidth = { md: "max-w-md", lg: "max-w-2xl", xl: "max-w-4xl" }[size] || "max-w-2xl";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#071a2f]/70 p-4"
      onClick={() => {
        if (!closeDisabled) {
          onClose?.();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className={`max-h-[90vh] w-full ${maxWidth} overflow-y-auto rounded-2xl border border-white/15 bg-[#0f2a46] p-6 shadow-xl outline-none`}
      >
        {title ? (
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <h3 id={titleId} className="text-lg font-semibold text-white">
                {title}
              </h3>
              {description ? (
                <p id={descriptionId} className="mt-1 text-sm text-white/75">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={closeDisabled}
              className="rounded-lg border border-white/20 px-3 py-1.5 text-sm font-medium text-white/85 transition hover:bg-white/10 disabled:opacity-60"
            >
              Cerrar
            </button>
          </div>
        ) : null}

        {children}
      </div>
    </div>
  );
}
