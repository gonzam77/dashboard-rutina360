"use client";

import { useState } from "react";
import RoutineEditor from "@/components/roles/RoutineEditor";

export default function RoutineEditButton({
  routine,
  buttonLabel = "Editar rutina",
  className = "rounded-lg border border-amber-300 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50",
}) {
  const [isOpen, setIsOpen] = useState(false);

  function closeModal() {
    setIsOpen(false);
  }

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className={className}>
        {buttonLabel}
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`edit-routine-title-${routine.id}`}
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 id={`edit-routine-title-${routine.id}`} className="text-lg font-semibold text-slate-900">
                  Editar rutina
                </h3>
                <p className="mt-1 text-sm text-slate-600">
                  {routine?.name || `Rutina #${routine.id}`}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>
            <RoutineEditor routine={routine} isInModal onSaved={closeModal} />
          </div>
        </div>
      ) : null}
    </>
  );
}
