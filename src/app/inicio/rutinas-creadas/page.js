import Link from "next/link";
import { redirect } from "next/navigation";
import CoachCreateRoutineButton from "@/components/roles/CoachCreateRoutineButton";
import RoutineDeleteButton from "@/components/roles/RoutineDeleteButton";
import { getAssignmentsStrict, getRoutinesStrict, getUsersStrict } from "@/lib/backend";
import { getUserRoleName, isAdminOrGymRoleName, resolveGymOwnerId, sameId } from "@/lib/roles";
import {
  getAssignmentRoutineId,
  getRoutineExercises,
  getRoutineOwnerCandidate,
  getRoutineOwnerId,
  isActiveRecord,
} from "@/lib/routines";
import { canManageRoutine, getViewer, getViewerGymOwnerId, isSuperAdmin } from "@/lib/viewer";

export const metadata = {
  title: "Rutinas creadas",
};

function getCreatorLabel(creator, creatorId) {
  return (
    creator?.username || creator?.email || (creatorId ? `Usuario #${creatorId}` : "Sin creador")
  );
}

function getAthleteLabel(assignment) {
  return (
    assignment?.athlete?.username ||
    assignment?.athlete?.email ||
    (assignment?.idAthlete ? `Usuario #${assignment.idAthlete}` : "Usuario sin dato")
  );
}

function buildRoutineRows(routines, assignments, users) {
  const routinesById = new Map();
  const usersById = new Map(users.map((user) => [String(user.id), user]));
  const athleteNamesByRoutineId = new Map();

  for (const routine of routines) {
    if (routine?.id) {
      routinesById.set(String(routine.id), routine);
    }
  }

  for (const assignment of assignments) {
    const nestedRoutine = assignment?.Routine;

    if (nestedRoutine?.id && !routinesById.has(String(nestedRoutine.id))) {
      routinesById.set(String(nestedRoutine.id), nestedRoutine);
    }

    const routineId = getAssignmentRoutineId(assignment);

    if (!routineId || !isActiveRecord(assignment)) {
      continue;
    }

    const key = String(routineId);
    const athleteKey = assignment?.idAthlete
      ? String(assignment.idAthlete)
      : `assignment-${assignment.id}`;

    if (!athleteNamesByRoutineId.has(key)) {
      athleteNamesByRoutineId.set(key, new Map());
    }
    athleteNamesByRoutineId.get(key).set(athleteKey, getAthleteLabel(assignment));
  }

  return Array.from(routinesById.values())
    .map((routine) => {
      const ownerId = getRoutineOwnerId(routine);
      const creator = usersById.get(String(ownerId)) || getRoutineOwnerCandidate(routine) || null;
      const athleteNames = Array.from(
        (athleteNamesByRoutineId.get(String(routine.id)) || new Map()).values()
      );

      return {
        routine,
        ownerId,
        creator,
        creatorLabel: getCreatorLabel(creator, ownerId),
        creatorGymOwnerId: resolveGymOwnerId(creator),
        assignedCount: athleteNames.length,
        athleteNames,
        exerciseCount: getRoutineExercises(routine).length,
      };
    })
    .sort((a, b) => {
      const creatorCompare = a.creatorLabel.localeCompare(b.creatorLabel, "es");

      if (creatorCompare !== 0) {
        return creatorCompare;
      }

      return String(a.routine?.name || "").localeCompare(String(b.routine?.name || ""), "es");
    });
}

/**
 * Alcance real de cada rol. Antes esta funcion devolvia todo sin filtrar, con
 * lo cual cualquier perfil veia las rutinas de todos los gimnasios.
 */
function isRowVisibleFor(row, viewer, viewerGymOwnerId) {
  if (isSuperAdmin(viewer)) {
    return true;
  }

  if (sameId(row.ownerId, viewer.id)) {
    return true;
  }

  if (viewer.roleKey === "admin") {
    return sameId(row.creatorGymOwnerId, viewer.id);
  }

  if (viewer.roleKey === "coach") {
    return (
      sameId(row.creatorGymOwnerId, viewerGymOwnerId) || sameId(row.ownerId, viewerGymOwnerId)
    );
  }

  return false;
}

/** Cada fila visible cae en exactamente un grupo mostrado, para que los totales cierren. */
function classifyRow(row, viewer, viewerGymOwnerId) {
  if (isSuperAdmin(viewer)) {
    return "all";
  }

  if (sameId(row.ownerId, viewer.id)) {
    return "own";
  }

  if (viewer.roleKey === "admin") {
    return "coaches";
  }

  if (sameId(row.ownerId, viewerGymOwnerId) || isAdminOrGymRoleName(getUserRoleName(row.creator))) {
    return "gym";
  }

  return "other_coaches";
}

function getDisplayGroups(roleKey) {
  if (roleKey === "coach") {
    return [
      { key: "own", label: "Rutinas del coach" },
      { key: "other_coaches", label: "Rutinas de otros coaches del gym" },
      { key: "gym", label: "Rutinas del gym" },
    ];
  }

  if (roleKey === "admin") {
    return [
      { key: "own", label: "Rutinas del gym" },
      { key: "coaches", label: "Rutinas de coaches del gym" },
    ];
  }

  return [{ key: "all", label: "Todas las rutinas visibles" }];
}

export default async function RutinasCreadasPage() {
  const viewer = await getViewer();

  if (!viewer) {
    redirect("/login");
  }

  let rows = [];
  let errorMessage = "";
  const groupedRows = { own: [], other_coaches: [], gym: [], coaches: [], all: [] };

  try {
    const [routines, users, assignments, viewerGymOwnerId] = await Promise.all([
      getRoutinesStrict(viewer.token),
      getUsersStrict(viewer.token),
      getAssignmentsStrict(viewer.token),
      getViewerGymOwnerId(),
    ]);

    rows = buildRoutineRows(routines, assignments, users).filter((row) =>
      isRowVisibleFor(row, viewer, viewerGymOwnerId)
    );

    for (const row of rows) {
      // Mismo criterio que /api/routines/[routineId]: no se ofrece lo que la API rechaza.
      row.canManage = canManageRoutine({
        viewer,
        routine: row.routine,
        routineOwner: row.creator,
      });
      groupedRows[classifyRow(row, viewer, viewerGymOwnerId)].push(row);
    }
  } catch (error) {
    errorMessage = error?.message || "No se pudieron cargar las rutinas.";
  }

  const assignedRoutinesCount = rows.filter((row) => row.assignedCount > 0).length;
  const totalAssignments = rows.reduce((total, row) => total + row.assignedCount, 0);
  const displayGroups = getDisplayGroups(viewer.roleKey);

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-white/15 bg-[#0f2a46] p-8 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white">Rutinas creadas</h1>
            <p className="mt-3 text-white/80">
              Listado de rutinas visibles segun tu perfil, coach propietario y asignaciones.
            </p>
          </div>
          {viewer.roleKey === "coach" || viewer.roleKey === "admin" ? (
            <CoachCreateRoutineButton coachId={viewer.id} />
          ) : null}
        </div>
      </header>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-300/40 bg-red-950/40 p-4 text-red-200">
          {errorMessage}
        </div>
      ) : null}

      {!errorMessage ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-white/15 bg-[#17385a] p-5 shadow-sm">
            <p className="text-sm font-medium text-white/70">Rutinas creadas</p>
            <p className="mt-2 text-3xl font-semibold text-white">{rows.length}</p>
          </article>
          <article className="rounded-2xl border border-white/15 bg-[#17385a] p-5 shadow-sm">
            <p className="text-sm font-medium text-white/70">Rutinas asignadas</p>
            <p className="mt-2 text-3xl font-semibold text-white">{assignedRoutinesCount}</p>
          </article>
          <article className="rounded-2xl border border-white/15 bg-[#17385a] p-5 shadow-sm">
            <p className="text-sm font-medium text-white/70">Usuarios asignados</p>
            <p className="mt-2 text-3xl font-semibold text-white">{totalAssignments}</p>
          </article>
        </div>
      ) : null}

      {!errorMessage && rows.length === 0 ? (
        <div className="rounded-2xl border border-white/15 bg-[#17385a] p-6 text-white/80 shadow-sm">
          No hay rutinas visibles para tu perfil.
        </div>
      ) : null}

      {!errorMessage && rows.length > 0 ? (
        <div className="space-y-4">
          {displayGroups.map((group) => {
            const groupRows = groupedRows[group.key] || [];

            if (groupRows.length === 0) {
              return null;
            }

            return (
              <section
                key={group.key}
                className="rounded-3xl border border-white/15 bg-[#17385a] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.28)]"
              >
                <h2 className="mb-4 text-base font-semibold text-white">
                  {group.label} ({groupRows.length})
                </h2>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                    <thead>
                      <tr className="text-xs uppercase tracking-wide text-white/60">
                        <th className="px-3 py-3 font-semibold">Rutina</th>
                        <th className="px-3 py-3 font-semibold">Creador</th>
                        <th className="px-3 py-3 font-semibold">Usuarios asignados</th>
                        <th className="px-3 py-3 font-semibold">Ejercicios</th>
                        <th className="px-3 py-3 font-semibold">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10 text-white/85">
                      {groupRows.map((row) => {
                        const routine = row.routine;
                        const creatorRoleId = row.creator?.idRole || row.creator?.Rol?.id;

                        return (
                          <tr key={`${group.key}-${routine.id}`} className="align-top">
                            <td className="px-3 py-4">
                              <p className="font-semibold text-white">
                                {routine?.name || `Rutina #${routine.id}`}
                              </p>
                              <p className="mt-1 text-xs text-white/60">ID {routine.id}</p>
                              <p className="mt-1 text-xs text-white/60">
                                Orden {routine?.order || "-"} - {routine?.time || "-"} min
                              </p>
                            </td>
                            <td className="px-3 py-4">
                              <p className="font-medium text-white">{row.creatorLabel}</p>
                              <p className="mt-1 text-xs text-white/60">
                                {row.creator?.email || `ID ${row.ownerId || "-"}`}
                              </p>
                            </td>
                            <td className="px-3 py-4">
                              <span className="inline-flex rounded-full border border-cyan-300/35 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                                {row.assignedCount} usuario{row.assignedCount === 1 ? "" : "s"}
                              </span>
                              {row.athleteNames.length > 0 ? (
                                <p className="mt-2 max-w-xs text-xs text-white/65">
                                  {row.athleteNames.slice(0, 3).join(", ")}
                                  {row.athleteNames.length > 3
                                    ? ` y ${row.athleteNames.length - 3} mas`
                                    : ""}
                                </p>
                              ) : null}
                            </td>
                            <td className="px-3 py-4">{row.exerciseCount}</td>
                            <td className="px-3 py-4">
                              <div className="flex flex-wrap items-start gap-2">
                                {routine?.id && row.creator?.id && creatorRoleId ? (
                                  <Link
                                    href={`/inicio/roles-usuarios/${creatorRoleId}/${row.creator.id}/rutinas/${routine.id}`}
                                    className="inline-block rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/20"
                                  >
                                    Ver rutina
                                  </Link>
                                ) : (
                                  <span className="text-xs text-white/60">Sin enlace</span>
                                )}
                                {row.canManage ? (
                                  <RoutineDeleteButton
                                    routineId={routine.id}
                                    routineName={routine?.name || `Rutina #${routine.id}`}
                                    assignedCount={row.assignedCount}
                                    athleteNames={row.athleteNames}
                                  />
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
