"use client";

import { useEffect, useId, useRef } from "react";
import Icon from "@/components/ui/Icon";

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

  /*
    onClose y closeDisabled cambian de identidad en cada render del formulario
    que abre el modal. Si el efecto dependiera de ellos, cada tecleo lo volveria
    a montar y el foco saltaria al boton de cerrar. Los leemos desde refs para
    que el efecto solo reaccione a `open`.
  */
  const onCloseRef = useRef(onClose);
  const closeDisabledRef = useRef(closeDisabled);

  useEffect(() => {
    onCloseRef.current = onClose;
    closeDisabledRef.current = closeDisabled;
  });

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    previouslyFocusedRef.current = document.activeElement;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    /*
      El boton de cerrar es el primero en el DOM, pero enfocarlo al abrir hace
      que el usuario empiece sobre la X en vez del primer campo del formulario.
    */
    const focusables = Array.from(
      dialogRef.current?.querySelectorAll(FOCUSABLE_SELECTOR) || []
    );
    const firstFocusable =
      focusables.find((element) => !element.hasAttribute("data-modal-close")) || focusables[0];
    (firstFocusable || dialogRef.current)?.focus();

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        if (!closeDisabledRef.current) {
          event.preventDefault();
          onCloseRef.current?.();
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
  }, [open]);

  if (!open) {
    return null;
  }

  const maxWidth = { md: "max-w-md", lg: "max-w-2xl", xl: "max-w-4xl" }[size] || "max-w-2xl";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-fondo/80 p-4"
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
        className={`max-h-[90vh] w-full ${maxWidth} overflow-y-auto rounded-xl border border-linea bg-superficie-alta p-6 shadow-flotante outline-none`}
      >
        {title ? (
          <div className="mb-5 flex items-start justify-between gap-3 border-b border-linea-suave pb-4">
            <div>
              <h3 id={titleId} className="text-lg font-semibold text-texto">
                {title}
              </h3>
              {description ? (
                <p id={descriptionId} className="mt-1 text-sm text-texto-2">
                  {description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={closeDisabled}
              aria-label="Cerrar"
              data-modal-close=""
              className="r360-btn r360-btn-ghost r360-btn-sm min-h-0 h-9 w-9 p-0"
            >
              <Icon name="cerrar" />
            </button>
          </div>
        ) : null}

        {children}
      </div>
    </div>
  );
}
