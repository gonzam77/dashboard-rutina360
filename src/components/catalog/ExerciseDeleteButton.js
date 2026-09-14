"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

function buildConfirmationMessage({ exerciseName, routineCount, routineUsageVerified }) {
  if (routineUsageVerified && routineCount > 0) {
    return `El ejercicio "${exerciseName}" esta vinculado a ${routineCount} rutina${
      routineCount === 1 ? "" : "s"
    }. Si continuas, el backend eliminara tambien la relacion con esas rutinas.`;
  }

  if (routineUsageVerified) {
    return `Vas a eliminar el ejercicio "${exerciseName}" de este grupo muscular.`;
  }

  return `No se pudo verificar si "${exerciseName}" esta vinculado a rutinas. Si lo eliminas y existe una relacion, el backend tambien la quitara.`;
}

export default function ExerciseDeleteButton({
  exerciseId,
  exerciseName,
  routineCount,
  routineUsageVerified,
  canDelete = true,
  blockedReason = "",
}) {
  const router = useRouter();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/exercises/${exerciseId}`, { method: "DELETE" });
      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(json?.message || "No se pudo eliminar el ejercicio.");
        return;
      }

      router.refresh();
    } catch {
      setError("Error de conexion al eliminar el ejercicio.");
    } finally {
      setLoading(false);
      setIsConfirmOpen(false);
    }
  }

  return (
    <div className="flex flex-col items-end">
      <button
        type="button"
        onClick={() => setIsConfirmOpen(true)}
        disabled={loading || !canDelete}
        aria-label={`Eliminar ejercicio ${exerciseName}`}
        title={
          !canDelete
            ? blockedReason || "No puedes eliminar este ejercicio."
            : loading
              ? "Eliminando ejercicio"
              : "Eliminar ejercicio"
        }
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-300/40 bg-rose-900/20 text-rose-100 transition hover:bg-rose-900/35 hover:text-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <TrashIcon />
        <span className="sr-only">{loading ? "Eliminando ejercicio" : "Eliminar ejercicio"}</span>
      </button>
      {error ? <p className="mt-2 max-w-44 text-right text-xs text-rose-200">{error}</p> : null}

      <ConfirmDialog
        open={isConfirmOpen}
        title="Eliminar ejercicio"
        description={buildConfirmationMessage({
          exerciseName,
          routineCount: Number(routineCount) || 0,
          routineUsageVerified,
        })}
        confirmLabel="Eliminar ejercicio"
        pendingLabel="Eliminando..."
        loading={loading}
        onConfirm={handleDelete}
        onCancel={() => {
          if (!loading) {
            setIsConfirmOpen(false);
          }
        }}
      />
    </div>
  );
}
