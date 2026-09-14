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
        className="rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
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
