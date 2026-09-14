"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Icon from "@/components/ui/Icon";
import { Alert, EmptyState } from "@/components/ui/Feedback";
import { getRoutineExercises } from "@/lib/routines";

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
  const [removeTarget, setRemoveTarget] = useState(null);

  async function handleRemoveRoutine() {
    if (!removeTarget?.idRoutine) {
      return;
    }

    const key = `${removeTarget.idRoutine}-${athleteId}`;
    setLoadingKey(key);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/routines/assign/remove", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idRoutine: Number(removeTarget.idRoutine),
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
      setRemoveTarget(null);
    }
  }

  if (assignments.length === 0) {
    return (
      <EmptyState
        icon="rutinas"
        title="Este atleta aun no tiene rutinas asignadas"
        description="Asignale una rutina desde el bloque de arriba para que la vea en la app."
      />
    );
  }

  return (
    <div>
      {message ? (
        <Alert tone="exito" className="mb-3">
          {message}
        </Alert>
      ) : null}
      {error ? <Alert className="mb-3">{error}</Alert> : null}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {assignments.map((assignment) => {
          const routine = assignment?.Routine;
          // La coleccion de ejercicios cambia de nombre segun el endpoint.
          const routineExercises = getRoutineExercises(routine);
          const idRoutine = routine?.id || assignment?.idRoutine;
          const key = `${idRoutine}-${athleteId}`;
          const routineName = routine?.name || `Rutina #${assignment?.idRoutine || "-"}`;

          return (
            <article key={assignment.id ?? key} className="r360-card-inset flex flex-col p-4">
              <p className="font-bold text-texto">{routineName}</p>

              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="r360-badge r360-badge-neutro">ID {idRoutine || "-"}</span>
                <span className="r360-badge r360-badge-neutro">Orden {routine?.order || "-"}</span>
                <span className="r360-badge r360-badge-neutro">{routine?.time || "-"} min</span>
                <span className="r360-badge r360-badge-acento">
                  {routineExercises.length} ejercicio{routineExercises.length === 1 ? "" : "s"}
                </span>
              </div>

              <p className="mt-2 text-xs text-texto-3">
                Asignada el {formatDate(assignment?.createdAt)}
              </p>

              <div className="mt-auto flex flex-wrap gap-2 pt-3">
                {routine?.id ? (
                  <Link
                    href={
                      coachId
                        ? `/inicio/roles-usuarios/${roleId}/${athleteId}/rutinas/${routine.id}?source=athlete-profile&coachId=${coachId}`
                        : `/inicio/roles-usuarios/${roleId}/${athleteId}/rutinas/${routine.id}?source=athlete-profile`
                    }
                    className="r360-btn r360-btn-accent r360-btn-sm"
                  >
                    Ver rutina
                    <Icon name="chevron" />
                  </Link>
                ) : null}
                <button
                  type="button"
                  onClick={() => setRemoveTarget({ idRoutine, routineName })}
                  disabled={!idRoutine || loadingKey === key}
                  className="r360-btn r360-btn-danger r360-btn-sm"
                >
                  {loadingKey === key ? "Quitando..." : "Quitar asignacion"}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {/*
        Quitar una rutina saca el plan de la app del atleta sin aviso previo.
        Era la unica accion destructiva del panel que no pedia confirmacion.
      */}
      <ConfirmDialog
        open={Boolean(removeTarget)}
        title="Quitar rutina asignada"
        description={`Vas a quitarle "${removeTarget?.routineName}" a este atleta. Dejara de verla en la app, pero la rutina no se elimina y podes volver a asignarsela.`}
        confirmLabel="Quitar asignacion"
        pendingLabel="Quitando..."
        loading={Boolean(loadingKey)}
        onConfirm={handleRemoveRoutine}
        onCancel={() => {
          if (!loadingKey) {
            setRemoveTarget(null);
          }
        }}
      />
    </div>
  );
}
