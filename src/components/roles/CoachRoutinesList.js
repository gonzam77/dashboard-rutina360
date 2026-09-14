"use client";

import Link from "next/link";
import RoutineDeleteButton from "@/components/roles/RoutineDeleteButton";
import RoutineEditButton from "@/components/roles/RoutineEditButton";
import Icon from "@/components/ui/Icon";
import { EmptyState } from "@/components/ui/Feedback";

export default function CoachRoutinesList({
  roleId,
  userId,
  routines,
  assignmentsByRoutineId = {},
}) {
  if (routines.length === 0) {
    return (
      <EmptyState
        icon="rutinas"
        title="Este coach aun no tiene rutinas creadas"
        description="Las rutinas se crean desde la seccion Rutinas del menu lateral."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {routines.map((routine) => {
        const assignment = assignmentsByRoutineId[String(routine.id)] || {};
        const athleteNames = assignment.athleteNames || [];

        return (
          <article key={routine.id} className="r360-card-inset flex flex-col p-4">
            <p className="font-bold text-texto">{routine.name}</p>

            {/*
              Los datos sueltos (orden, tiempo, atletas) eran cuatro parrafos
              seguidos y costaba distinguirlos; como chips se leen de un vistazo.
            */}
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="r360-badge r360-badge-neutro">ID {routine.id}</span>
              <span className="r360-badge r360-badge-neutro">Orden {routine.order || "-"}</span>
              <span className="r360-badge r360-badge-neutro">{routine.time || "-"} min</span>
              <span
                className={`r360-badge ${
                  athleteNames.length > 0 ? "r360-badge-exito" : "r360-badge-neutro"
                }`}
              >
                {athleteNames.length} atleta{athleteNames.length === 1 ? "" : "s"}
              </span>
            </div>

            {athleteNames.length > 0 ? (
              <p className="mt-2 text-xs text-texto-3">
                {athleteNames.slice(0, 2).join(", ")}
                {athleteNames.length > 2 ? ` y ${athleteNames.length - 2} mas` : ""}
              </p>
            ) : null}

            <div className="mt-auto flex flex-wrap gap-2 pt-3">
              <Link
                href={`/inicio/roles-usuarios/${roleId}/${userId}/rutinas/${routine.id}`}
                className="r360-btn r360-btn-accent r360-btn-sm"
              >
                Ver rutina
                <Icon name="chevron" />
              </Link>
              <RoutineEditButton routine={routine} />
              <RoutineDeleteButton
                routineId={routine.id}
                routineName={routine.name || `Rutina #${routine.id}`}
                assignedCount={athleteNames.length}
                athleteNames={athleteNames}
              />
            </div>
          </article>
        );
      })}
    </div>
  );
}
