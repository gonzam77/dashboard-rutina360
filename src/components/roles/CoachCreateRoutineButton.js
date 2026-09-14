"use client";

import { useState } from "react";
import CoachRoutineForm from "@/components/roles/CoachRoutineForm";
import Modal from "@/components/ui/Modal";

export default function CoachCreateRoutineButton({ coachId }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="r360-btn r360-btn-accent"
      >
        Crear rutina
      </button>

      <Modal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        size="xl"
        title="Crear rutina"
        description="La rutina queda registrada a tu nombre."
      >
        <CoachRoutineForm coachId={coachId} isInModal onSaved={() => setIsOpen(false)} />
      </Modal>
    </>
  );
}
