"use client";

import { useState } from "react";
import CoachRoutineForm from "@/components/roles/CoachRoutineForm";

export default function CoachCreateRoutineButton({ coachId }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        Crear rutina
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#071a2f]/70 p-4"
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/15 bg-[#0f2a46] p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-white">Crear rutina</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg border border-white/20 px-3 py-1.5 text-sm font-medium text-white/85 hover:bg-white/10"
              >
                Cerrar
              </button>
            </div>
            <CoachRoutineForm coachId={coachId} isInModal onSaved={() => setIsOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
