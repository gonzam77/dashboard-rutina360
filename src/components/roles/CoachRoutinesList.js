"use client";

import Link from "next/link";
import RoutineDeleteButton from "@/components/roles/RoutineDeleteButton";
import RoutineEditButton from "@/components/roles/RoutineEditButton";

export default function CoachRoutinesList({
  roleId,
  userId,
  routines,
  assignmentsByRoutineId = {},
}) {
  return (
    <div className="mt-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/75">Gestiona las rutinas creadas para este coach.</p>
      </div>
      {routines.length === 0 ? (
        <p className="mt-3 text-sm text-white/75">Este coach aun no tiene rutinas creadas.</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {routines.map((routine) => {
            const assignment = assignmentsByRoutineId[String(routine.id)] || {};
            const athleteNames = assignment.athleteNames || [];

            return (
              <article
                key={routine.id}
                className="rounded-2xl border border-white/15 bg-[#0f2a46] p-4"
              >
                <p className="text-xs uppercase tracking-wide text-white/60">Rutina #{routine.id}</p>
                <p className="mt-1 font-semibold text-white">{routine.name}</p>
                <p className="mt-2 text-sm text-white/80">Orden: {routine.order || "-"}</p>
                <p className="text-sm text-white/80">Tiempo: {routine.time || "-"} min</p>
                <p className="text-sm text-white/80">
                  Atletas asignados: {athleteNames.length}
                  {athleteNames.length > 0 ? ` (${athleteNames.slice(0, 2).join(", ")}${
                    athleteNames.length > 2 ? ` y ${athleteNames.length - 2} mas` : ""
                  })` : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    href={`/inicio/roles-usuarios/${roleId}/${userId}/rutinas/${routine.id}`}
                    className="rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/20"
                  >
                    Ver rutina
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
      )}
    </div>
  );
}
