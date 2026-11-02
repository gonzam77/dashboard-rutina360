"use client";

import { useState } from "react";
import CoachRoutineForm from "@/components/roles/CoachRoutineForm";
import FunctionalRoutineForm from "@/components/roles/FunctionalRoutineForm";
import Modal from "@/components/ui/Modal";

/**
 * Boton de alta. Con kind="functional" abre el formulario de entrenamientos
 * por tiempo; sin kind se comporta exactamente como antes (rutina de fuerza).
 */
export default function CoachCreateRoutineButton({ coachId, kind = "strength" }) {
  const functional = kind === "functional";
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="r360-btn r360-btn-accent"
      >
        {functional ? "Crear funcional" : "Crear rutina"}
      </button>

      <Modal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        size="xl"
        title={functional ? "Crear funcional" : "Crear rutina"}
        description={
          functional
            ? "Bloques por tiempo que se repiten en vueltas. Queda registrado a tu nombre."
            : "La rutina queda registrada a tu nombre."
        }
      >
        {functional ? (
          <FunctionalRoutineForm coachId={coachId} isInModal onSaved={() => setIsOpen(false)} />
        ) : (
          <CoachRoutineForm coachId={coachId} isInModal onSaved={() => setIsOpen(false)} />
        )}
      </Modal>
    </>
  );
}
