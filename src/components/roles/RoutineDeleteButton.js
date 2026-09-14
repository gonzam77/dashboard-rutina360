"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

/**
 * Eliminacion de una rutina.
 *
 * El backend borra en cascada dentro de una transaccion: primero los ejercicios
 * de la rutina, despues las asignaciones a atletas, y por ultimo la rutina. Por
 * eso, antes de confirmar, se avisa a quien elimina cuantos atletas la van a
 * perder de su plan y quienes son.
 */
export default function RoutineDeleteButton({
  routineId,
  routineName,
  assignedCount = 0,
  athleteNames = [],
  className = "r360-btn r360-btn-danger r360-btn-sm",
}) {
  const router = useRouter();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const normalizedCount = Number(assignedCount) || 0;
  const shownNames = athleteNames.slice(0, 3).join(", ");
  const remaining = athleteNames.length - 3;

  const description =
    normalizedCount > 0
      ? `"${routineName}" esta asignada a ${normalizedCount} atleta${
          normalizedCount === 1 ? "" : "s"
        }${shownNames ? ` (${shownNames}${remaining > 0 ? ` y ${remaining} mas` : ""})` : ""}. ` +
        `Al eliminarla se quitara tambien de su plan y se borraran sus ejercicios. Esta accion no se puede deshacer.`
      : `Vas a eliminar "${routineName}" y todos sus ejercicios. Esta accion no se puede deshacer.`;

  async function handleDelete() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/routines/${routineId}`, { method: "DELETE" });
      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(json?.message || "No se pudo eliminar la rutina.");
        return;
      }

      setIsConfirmOpen(false);
      router.refresh();
    } catch {
      setError("Error de conexion al eliminar la rutina.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setIsConfirmOpen(true);
        }}
        disabled={loading}
        className={className}
      >
        {loading ? "Eliminando..." : "Eliminar"}
      </button>

      {error ? <p className="mt-2 text-xs text-peligro">{error}</p> : null}

      <ConfirmDialog
        open={isConfirmOpen}
        title={normalizedCount > 0 ? "Eliminar rutina asignada" : "Eliminar rutina"}
        description={description}
        confirmLabel="Eliminar rutina"
        pendingLabel="Eliminando..."
        loading={loading}
        onConfirm={handleDelete}
        onCancel={() => {
          if (!loading) {
            setIsConfirmOpen(false);
          }
        }}
      />
    </>
  );
}
