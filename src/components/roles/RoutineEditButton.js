"use client";

import { useState } from "react";
import FunctionalRoutineForm from "@/components/roles/FunctionalRoutineForm";
import RoutineEditor from "@/components/roles/RoutineEditor";
import Modal from "@/components/ui/Modal";
import { isFunctional } from "@/lib/functional";

export default function RoutineEditButton({
  routine,
  buttonLabel,
  className = "r360-btn r360-btn-ghost r360-btn-sm",
}) {
  const [isOpen, setIsOpen] = useState(false);
  // Un funcional se edita con su propio formulario: no tiene series sino tiempos.
  const functional = isFunctional(routine);
  const label = buttonLabel || (functional ? "Editar funcional" : "Editar rutina");

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className={className}>
        {label}
      </button>

      <Modal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        size="xl"
        title={functional ? "Editar funcional" : "Editar rutina"}
        description={routine?.name || `Rutina #${routine?.id}`}
      >
        {functional ? (
          <FunctionalRoutineForm
            coachId={routine?.idUser}
            routine={routine}
            isInModal
            onSaved={() => setIsOpen(false)}
          />
        ) : (
          <RoutineEditor routine={routine} isInModal onSaved={() => setIsOpen(false)} />
        )}
      </Modal>
    </>
  );
}
