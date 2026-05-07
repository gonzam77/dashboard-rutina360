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

function getCoachLabel(coach, coachId) {
  if (coach?.username) {
    return coach.username;
  }

  if (coach?.email) {
    return coach.email;
  }

  if (coachId) {
    return `Coach #${coachId}`;
  }

  return "Sin coach";
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
      const coach = usersById.get(String(routine?.idUser));
      const athleteIds = assignmentAthletesByRoutineId.get(routineId) || new Set();
      const athleteNames = Array.from((assignmentNamesByRoutineId.get(routineId) || new Map()).values());

      return {
        routine,
        coach,
        coachLabel: getCoachLabel(coach, routine?.idUser),
        assignedCount: athleteIds.size,
        athleteNames,
        exerciseCount: getRoutineExercises(routine).length,
      };
    })
    .sort((a, b) => {
      const coachCompare = a.coachLabel.localeCompare(b.coachLabel, "es");

      if (coachCompare !== 0) {
        return coachCompare;
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
      <header className="rounded-2xl bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Rutinas creadas</h1>
            <p className="mt-3 text-slate-600">Listado de rutinas visibles segun tu perfil, coach propietario y asignaciones.</p>
          </div>
          {roleKey === "coach" && viewerId ? <CoachCreateRoutineButton coachId={viewerId} /> : null}
        </div>
      </header>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{errorMessage}</div>
      ) : null}

      {!errorMessage ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Rutinas creadas</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{rows.length}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Rutinas asignadas</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{assignedRoutinesCount}</p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">Usuarios asignados</p>
            <p className="mt-2 text-3xl font-semibold text-slate-900">{totalAssignments}</p>
          </article>
        </div>
      ) : null}

      {!errorMessage && rows.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-slate-600 shadow-sm">No hay rutinas visibles para tu perfil.</div>
      ) : null}

      {!errorMessage && rows.length > 0 ? (
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3 font-semibold">Rutina</th>
                  <th className="px-3 py-3 font-semibold">Coach</th>
                  <th className="px-3 py-3 font-semibold">Usuarios asignados</th>
                  <th className="px-3 py-3 font-semibold">Ejercicios</th>
                  <th className="px-3 py-3 font-semibold">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {rows.map((row) => {
                  const routine = row.routine;
                  const coachRoleId = row.coach?.idRole || row.coach?.Rol?.id;

                  return (
                    <tr key={routine.id} className="align-top">
                      <td className="px-3 py-4">
                        <p className="font-semibold text-slate-900">{routine?.name || `Rutina #${routine.id}`}</p>
                        <p className="mt-1 text-xs text-slate-500">ID {routine.id}</p>
                        <p className="mt-1 text-xs text-slate-500">Orden {routine?.order || "-"} - {routine?.time || "-"} min</p>
                      </td>
                      <td className="px-3 py-4">
                        <p className="font-medium text-slate-900">{row.coachLabel}</p>
                        <p className="mt-1 text-xs text-slate-500">{row.coach?.email || `ID ${routine?.idUser || "-"}`}</p>
                      </td>
                      <td className="px-3 py-4">
                        <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                          {row.assignedCount} usuario{row.assignedCount === 1 ? "" : "s"}
                        </span>
                        {row.athleteNames.length > 0 ? (
                          <p className="mt-2 max-w-xs text-xs text-slate-500">
                            {row.athleteNames.slice(0, 3).join(", ")}
                            {row.athleteNames.length > 3 ? ` y ${row.athleteNames.length - 3} mas` : ""}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-4">{row.exerciseCount}</td>
                      <td className="px-3 py-4">
                        {routine?.id && row.coach?.id && coachRoleId ? (
                          <Link
                            href={`/inicio/roles-usuarios/${coachRoleId}/${row.coach.id}/rutinas/${routine.id}`}
                            className="inline-block rounded-lg border border-indigo-300 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
                          >
                            Ver rutina
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-500">Sin enlace</span>
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
