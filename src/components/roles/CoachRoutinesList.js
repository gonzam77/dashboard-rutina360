"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import CoachRoutineForm from "@/components/roles/CoachRoutineForm";
import RoutineEditButton from "@/components/roles/RoutineEditButton";

export default function CoachRoutinesList({ roleId, userId, coachId, routines }) {
  const router = useRouter();
  const [loadingRoutineId, setLoadingRoutineId] = useState(null);
  const [error, setError] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  async function handleDeleteRoutine(routineId) {
    setLoadingRoutineId(routineId);
    setError("");

    try {
      const response = await fetch(`/api/routines/${routineId}`, { method: "DELETE" });
      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(json?.message || "No se pudo eliminar la rutina.");
        return;
      }

      router.refresh();
    } catch {
      setError("Error de conexion al eliminar rutina.");
    } finally {
      setLoadingRoutineId(null);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/75">Gestiona las rutinas creadas para este coach.</p>
        <button
          type="button"
          onClick={() => setIsCreateModalOpen(true)}
          className="rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/20"
        >
          Crear rutina
        </button>
      </div>
      {error ? <p className="text-sm text-rose-200">{error}</p> : null}
      {routines.length === 0 ? (
        <p className="mt-3 text-sm text-white/75">Este coach aun no tiene rutinas creadas.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {routines.map((routine) => (
            <article key={routine.id} className="rounded-2xl border border-white/15 bg-[#0f2a46] p-4">
              <p className="text-xs uppercase tracking-wide text-white/60">Rutina #{routine.id}</p>
              <p className="mt-1 font-semibold text-white">{routine.name}</p>
              <p className="mt-2 text-sm text-white/80">Orden: {routine.order || "-"}</p>
              <p className="text-sm text-white/80">Tiempo: {routine.time || "-"} min</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  href={`/inicio/roles-usuarios/${roleId}/${userId}/rutinas/${routine.id}`}
                  className="rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/20"
                >
                  Ver rutina
                </Link>
                <RoutineEditButton routine={routine} />
                <button
                  type="button"
                  onClick={() => handleDeleteRoutine(routine.id)}
                  disabled={loadingRoutineId === routine.id}
                  className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-60"
                >
                  {loadingRoutineId === routine.id ? "Eliminando..." : "Eliminar rutina"}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {isCreateModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#071a2f]/70 p-4"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/15 bg-[#0f2a46] p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-white">Crear rutina</h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-lg border border-white/20 px-3 py-1.5 text-sm font-medium text-white/85 hover:bg-white/10"
              >
                Cerrar
              </button>
            </div>
            <CoachRoutineForm
              coachId={coachId}
              isInModal
              onSaved={() => setIsCreateModalOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
