"use client";

import { useState } from "react";
import RoutineEditor from "@/components/roles/RoutineEditor";
import Modal from "@/components/ui/Modal";

export default function RoutineEditButton({
  routine,
  buttonLabel = "Editar rutina",
  className = "rounded-lg border border-amber-200/40 bg-amber-900/20 px-3 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-900/35",
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
