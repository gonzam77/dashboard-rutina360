"use client";

import { useState } from "react";
import RoutineEditor from "@/components/roles/RoutineEditor";
import Modal from "@/components/ui/Modal";

export default function RoutineEditButton({
  routine,
  buttonLabel = "Editar rutina",
  className = "r360-btn r360-btn-ghost r360-btn-sm",
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)} className={className}>
        {buttonLabel}
      </button>

      <Modal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        size="xl"
        title="Editar rutina"
        description={routine?.name || `Rutina #${routine?.id}`}
      >
        <RoutineEditor routine={routine} isInModal onSaved={() => setIsOpen(false)} />
      </Modal>
    </>
  );
}
