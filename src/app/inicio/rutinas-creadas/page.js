import Link from "next/link";
import { cookies } from "next/headers";
import { normalizeRoleKey, parseSessionUserCookie } from "@/lib/session";
import CoachCreateRoutineButton from "@/components/roles/CoachCreateRoutineButton";

const ROUTINES_URL = "https://rutina360-server.onrender.com/routine/";
const USERS_URL = "https://rutina360-server.onrender.com/users";
const ASSIGNMENTS_URL = "https://rutina360-server.onrender.com/routine/assign";

async function fetchList(url, fallbackMessage, token) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(json?.message || fallbackMessage);
  }

  return Array.isArray(json?.data) ? json.data : [];
}

function getRoutineExercises(routine) {
  if (Array.isArray(routine?.exercises)) {
    return routine.exercises;
  }

  if (Array.isArray(routine?.Routine_Ejercices)) {
    return routine.Routine_Ejercices;
  }

  if (Array.isArray(routine?.Ejercices)) {
    return routine.Ejercices;
  }

  if (Array.isArray(routine?.RoutineEjercices)) {
    return routine.RoutineEjercices;
  }

  return [];
}

function isActiveAssignment(assignment) {
  return assignment?.isDeleted !== true && assignment?.isActive !== false;
}

function getCreatorLabel(creator, creatorId) {
  if (creator?.username) {
    return creator.username;
  }

  if (creator?.email) {
    return creator.email;
  }

  if (creatorId) {
    return `Usuario #${creatorId}`;
  }

  return "Sin creador";
}

function getAthleteLabel(assignment) {
  const athlete = assignment?.athlete;

  if (athlete?.username) {
    return athlete.username;
  }

  if (athlete?.email) {
    return athlete.email;
  }

  if (assignment?.idAthlete) {
    return `Usuario #${assignment.idAthlete}`;
  }

  return "Usuario sin dato";
}

function filterDataByViewerRole(routines, users, assignments, roleKey, viewerId) {
  if (roleKey === "super_admin") {
    return { routines, users, assignments };
  }

  if (roleKey === "coach") {
    const coachRoutines = routines.filter((routine) => Number(routine?.idUser) === Number(viewerId));
    const visibleRoutineIds = new Set(coachRoutines.map((routine) => String(routine?.id)));
    const visibleAssignments = assignments.filter((assignment) => {
      const routineId = assignment?.idRoutine || assignment?.Routine?.id;
      return visibleRoutineIds.has(String(routineId));
    });
    const visibleUsers = users.filter((user) => Number(user?.id) === Number(viewerId));

    return { routines: coachRoutines, users: visibleUsers, assignments: visibleAssignments };
  }

  if (roleKey === "admin") {
    const gymUsers = users.filter(
      (user) => Number(user?.id) === Number(viewerId) || Number(user?.idAdminOwner) === Number(viewerId)
    );
    const gymUserIds = new Set(gymUsers.map((user) => String(user?.id)));
    const gymRoutines = routines.filter((routine) => gymUserIds.has(String(routine?.idUser)));
    const gymRoutineIds = new Set(gymRoutines.map((routine) => String(routine?.id)));
    const gymAssignments = assignments.filter((assignment) => {
      const routineId = assignment?.idRoutine || assignment?.Routine?.id;
      return gymRoutineIds.has(String(routineId));
    });

    return { routines: gymRoutines, users: gymUsers, assignments: gymAssignments };
  }

  return { routines, users, assignments };
}

function buildRoutineRows(routines, assignments, users) {
  const routinesById = new Map();
  const usersById = new Map(users.map((user) => [String(user.id), user]));
  const assignmentAthletesByRoutineId = new Map();
  const assignmentNamesByRoutineId = new Map();

  for (const routine of routines) {
    if (routine?.id) {
      routinesById.set(String(routine.id), routine);
    }
  }

  for (const assignment of assignments) {
    const routine = assignment?.Routine;
    const routineId = assignment?.idRoutine || routine?.id;

    if (routine?.id && !routinesById.has(String(routine.id))) {
      routinesById.set(String(routine.id), routine);
    }

    if (!routineId || !isActiveAssignment(assignment)) {
      continue;
    }

    const key = String(routineId);
    const athleteKey = assignment?.idAthlete ? String(assignment.idAthlete) : `assignment-${assignment.id}`;

    if (!assignmentAthletesByRoutineId.has(key)) {
      assignmentAthletesByRoutineId.set(key, new Set());
      assignmentNamesByRoutineId.set(key, new Map());
    }

    assignmentAthletesByRoutineId.get(key).add(athleteKey);
    assignmentNamesByRoutineId.get(key).set(athleteKey, getAthleteLabel(assignment));
  }

  return Array.from(routinesById.values())
    .map((routine) => {
      const routineId = String(routine.id);
      const creator = usersById.get(String(routine?.idUser));
      const athleteIds = assignmentAthletesByRoutineId.get(routineId) || new Set();
      const athleteNames = Array.from((assignmentNamesByRoutineId.get(routineId) || new Map()).values());

      return {
        routine,
        creator,
        creatorLabel: getCreatorLabel(creator, routine?.idUser),
        assignedCount: athleteIds.size,
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

export default async function RutinasCreadasPage() {
  let rows = [];
  let errorMessage = "";
  let roleKey = "unknown";
  let viewerId = null;

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    const sessionUser = parseSessionUserCookie(cookieStore.get("session_user")?.value);
    roleKey = normalizeRoleKey(sessionUser?.roleName);
    viewerId = Number(sessionUser?.id) || null;

    const [routines, users, assignments] = await Promise.all([
      fetchList(ROUTINES_URL, "No se pudieron cargar las rutinas.", token),
      fetchList(USERS_URL, "No se pudieron cargar los usuarios.", token),
      fetchList(ASSIGNMENTS_URL, "No se pudieron cargar las asignaciones de rutinas.", token),
    ]);

    const filtered = filterDataByViewerRole(routines, users, assignments, roleKey, viewerId);
    rows = buildRoutineRows(filtered.routines, filtered.assignments, filtered.users);
  } catch (error) {
    errorMessage = error.message;
  }

  const assignedRoutinesCount = rows.filter((row) => row.assignedCount > 0).length;
  const totalAssignments = rows.reduce((total, row) => total + row.assignedCount, 0);

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-white/15 bg-[#0f2a46] p-8 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white">Rutinas creadas</h1>
            <p className="mt-3 text-white/80">Listado de rutinas visibles segun tu perfil, coach propietario y asignaciones.</p>
          </div>
          {(roleKey === "coach" || roleKey === "admin") && viewerId ? <CoachCreateRoutineButton coachId={viewerId} /> : null}
        </div>
      </header>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-300/40 bg-red-950/40 p-4 text-red-200">{errorMessage}</div>
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
        <div className="rounded-2xl border border-white/15 bg-[#17385a] p-6 text-white/80 shadow-sm">No hay rutinas visibles para tu perfil.</div>
      ) : null}

      {!errorMessage && rows.length > 0 ? (
        <section className="rounded-3xl border border-white/15 bg-[#17385a] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-white/60">
                  <th className="px-3 py-3 font-semibold">Rutina</th>
                  <th className="px-3 py-3 font-semibold">Creador</th>
                  <th className="px-3 py-3 font-semibold">Usuarios asignados</th>
                  <th className="px-3 py-3 font-semibold">Ejercicios</th>
                  <th className="px-3 py-3 font-semibold">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-white/85">
                {rows.map((row) => {
                  const routine = row.routine;
                  const creatorRoleId = row.creator?.idRole || row.creator?.Rol?.id;

                  return (
                    <tr key={routine.id} className="align-top">
                      <td className="px-3 py-4">
                        <p className="font-semibold text-white">{routine?.name || `Rutina #${routine.id}`}</p>
                        <p className="mt-1 text-xs text-white/60">ID {routine.id}</p>
                        <p className="mt-1 text-xs text-white/60">Orden {routine?.order || "-"} - {routine?.time || "-"} min</p>
                      </td>
                      <td className="px-3 py-4">
                        <p className="font-medium text-white">{row.creatorLabel}</p>
                        <p className="mt-1 text-xs text-white/60">{row.creator?.email || `ID ${routine?.idUser || "-"}`}</p>
                      </td>
                      <td className="px-3 py-4">
                        <span className="inline-flex rounded-full border border-cyan-300/35 bg-cyan-300/10 px-3 py-1 text-xs font-semibold text-cyan-100">
                          {row.assignedCount} usuario{row.assignedCount === 1 ? "" : "s"}
                        </span>
                        {row.athleteNames.length > 0 ? (
                          <p className="mt-2 max-w-xs text-xs text-white/65">
                            {row.athleteNames.slice(0, 3).join(", ")}
                            {row.athleteNames.length > 3 ? ` y ${row.athleteNames.length - 3} mas` : ""}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-4">{row.exerciseCount}</td>
                      <td className="px-3 py-4">
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
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </section>
  );
}
