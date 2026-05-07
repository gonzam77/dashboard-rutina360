"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

function formatDate(value) {
  if (!value) {
    return "Sin dato";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sin dato";
  }

  return date.toLocaleDateString("es-AR");
}

export default function AthleteAssignedRoutinesList({ roleId, athleteId, coachId, assignments }) {
  const router = useRouter();
  const [loadingKey, setLoadingKey] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleRemoveRoutine(idRoutine) {
    const key = `${idRoutine}-${athleteId}`;
    setLoadingKey(key);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/routines/assign/remove", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idRoutine: Number(idRoutine),
          idAthlete: Number(athleteId),
        }),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(json?.message || "No se pudo quitar la rutina asignada.");
        return;
      }

      setMessage("Asignacion eliminada correctamente.");
      router.refresh();
    } catch {
      setError("Error de conexion al quitar la rutina.");
    } finally {
      setLoadingKey("");
    }
  }

  if (assignments.length === 0) {
    return <p className="mt-3 text-sm text-white/75">Este atleta aun no tiene rutinas asignadas.</p>;
  }

  return (
    <div className="mt-4">
      {message ? <p className="mb-3 text-sm text-cyan-100">{message}</p> : null}
      {error ? <p className="mb-3 text-sm text-rose-200">{error}</p> : null}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {assignments.map((assignment) => {
          const routine = assignment?.Routine;
          const routineExercises = Array.isArray(routine?.Routine_Ejercices)
            ? routine.Routine_Ejercices
            : [];
          const idRoutine = routine?.id || assignment?.idRoutine;
          const key = `${idRoutine}-${athleteId}`;

          return (
            <article key={assignment.id} className="rounded-2xl border border-white/15 bg-[#0f2a46] p-4">
              <p className="text-xs uppercase tracking-wide text-white/60">Asignacion #{assignment.id}</p>
              <p className="mt-1 font-semibold text-white">
                {routine?.name || `Rutina #${assignment?.idRoutine || "-"}`}
              </p>
              <p className="mt-2 text-sm text-white/80">ID rutina: {idRoutine || "-"}</p>
              <p className="text-sm text-white/80">Orden: {routine?.order || "-"}</p>
              <p className="text-sm text-white/80">Tiempo: {routine?.time || "-"} min</p>
              <p className="text-sm text-white/80">Ejercicios: {routineExercises.length}</p>
              <p className="text-sm text-white/80">Asignada: {formatDate(assignment?.createdAt)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {routine?.id ? (
                  <Link
                    href={
                      coachId
                        ? `/inicio/roles-usuarios/${roleId}/${athleteId}/rutinas/${routine.id}?source=athlete-profile&coachId=${coachId}`
                        : `/inicio/roles-usuarios/${roleId}/${athleteId}/rutinas/${routine.id}?source=athlete-profile`
                    }
                    className="inline-block rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/20"
                  >
                    Ver rutina
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => handleRemoveRoutine(idRoutine)}
                  disabled={!idRoutine || loadingKey === key}
                  className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-60"
                >
                  {loadingKey === key ? "Quitando..." : "Quitar asignacion"}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
