import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { normalizeRoleKey, parseSessionUserCookie } from "@/lib/session";
import CoachCreateRoutineButton from "@/components/roles/CoachCreateRoutineButton";
import { getServerAccessToken } from "@/lib/auth-service";
import { apiUrl } from "@/lib/api-url";

const ROUTINES_URL = apiUrl("/routine");
const USERS_URL = apiUrl("/users");
const ASSIGNMENTS_URL = apiUrl("/routine/assign");

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

function isAdminOrGymRoleName(value) {
  return ["admin", "administrador", "gym", "gimnasio"].includes(
    String(value || "").trim().toLowerCase()
  );
}

function resolveGymOwnerId(candidate) {
  if (!candidate) {
    return null;
  }

  const roleName =
    candidate?.Rol?.name ||
    candidate?.role?.name ||
    candidate?.Role?.name ||
    candidate?.rol?.name ||
    "";
  if (isAdminOrGymRoleName(roleName)) {
    const ownId = Number(candidate?.id);
    return Number.isFinite(ownId) && ownId > 0 ? ownId : null;
  }

  const ownerId = Number(candidate?.idAdminOwner);
  if (Number.isFinite(ownerId) && ownerId > 0) {
    return ownerId;
  }

  const nestedOwnerId = Number(candidate?.adminOwner?.id);
  return Number.isFinite(nestedOwnerId) && nestedOwnerId > 0 ? nestedOwnerId : null;
}

function getRoutineOwnerCandidate(routine) {
  return (
    routine?.creator ||
    routine?.Creator ||
    routine?.User ||
    routine?.user ||
    routine?.Owner ||
    routine?.owner ||
    routine?.Coach ||
    routine?.coach ||
    null
  );
}

function filterDataByViewerRole(routines, users, assignments, roleKey, viewerId) {
  return { routines, users, assignments };
}

function classifyRoutineSource(row, roleKey, viewerId, viewerGymOwnerId = null) {
  const ownerId = Number(row?.routine?.idUser);
  const ownerRoleName = String(
    row?.creator?.Rol?.name ||
    row?.creator?.role?.name ||
    row?.creator?.Role?.name ||
    ""
  ).trim().toLowerCase();
  const ownerGymOwnerId = resolveGymOwnerId(row?.creator || null);

  if (roleKey === "coach") {
    if (ownerId === Number(viewerId)) {
      return "own";
    }

    if (isAdminOrGymRoleName(ownerRoleName)) {
      return "gym";
    }

    if (ownerRoleName === "coach") {
      return "other_coaches";
    }

    if (viewerGymOwnerId && ownerGymOwnerId && Number(ownerGymOwnerId) === Number(viewerGymOwnerId)) {
      if (ownerId === Number(viewerGymOwnerId)) {
        return "gym";
      }

      return "other_coaches";
    }

    // Si llego hasta aca y es visible para el coach, mantenerla en el grupo de otros coaches
    // para no ocultar rutinas por falta de metadatos del creador.
    return "other_coaches";
  }

  if (roleKey === "admin") {
    if (ownerId === Number(viewerId)) {
      return "gym";
    }

    if (ownerRoleName === "coach") {
      return "coaches";
    }
  }

  return "all";
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
      const creator =
        usersById.get(String(routine?.idUser)) ||
        routine?.creator ||
        routine?.Creator ||
        routine?.User ||
        routine?.user ||
        routine?.Coach ||
        routine?.coach ||
        null;
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
  const cookieStore = await cookies();
  const token = await getServerAccessToken();
  const sessionUser = parseSessionUserCookie(cookieStore.get("session_user")?.value);

  if (!token) {
    redirect("/login");
  }

  let rows = [];
  let errorMessage = "";
  let roleKey = normalizeRoleKey(sessionUser?.roleName);
  let viewerId = Number(sessionUser?.id) || null;
  let viewerGymOwnerId = null;

  try {
    const [routines, users, assignments] = await Promise.all([
      fetchList(ROUTINES_URL, "No se pudieron cargar las rutinas.", token),
      fetchList(USERS_URL, "No se pudieron cargar los usuarios.", token),
      fetchList(ASSIGNMENTS_URL, "No se pudieron cargar las asignaciones de rutinas.", token),
    ]);

    const filtered = filterDataByViewerRole(routines, users, assignments, roleKey, viewerId);
    const viewerUser = filtered.users.find((item) => Number(item?.id) === Number(viewerId)) || null;
    viewerGymOwnerId = resolveGymOwnerId(viewerUser);
    rows = buildRoutineRows(filtered.routines, filtered.assignments, filtered.users);
  } catch (error) {
    errorMessage = error.message;
  }

  const assignedRoutinesCount = rows.filter((row) => row.assignedCount > 0).length;
  const totalAssignments = rows.reduce((total, row) => total + row.assignedCount, 0);
  const groupedRows = rows.reduce(
    (accumulator, row) => {
      const source = classifyRoutineSource(row, roleKey, viewerId, viewerGymOwnerId);
      if (!accumulator[source]) {
        accumulator[source] = [];
      }
      accumulator[source].push(row);
      return accumulator;
    },
    { own: [], other_coaches: [], gym: [], coaches: [], all: [] }
  );

  const displayGroups =
    roleKey === "coach"
      ? [
          { key: "own", label: "Rutinas del coach" },
          { key: "other_coaches", label: "Rutinas de otros coaches del gym" },
          { key: "gym", label: "Rutinas del gym" },
          { key: "all", label: "Otras rutinas visibles" },
        ]
      : roleKey === "admin"
        ? [
            { key: "gym", label: "Rutinas del gym" },
            { key: "coaches", label: "Rutinas de coaches del gym" },
          ]
        : [{ key: "all", label: "Todas las rutinas visibles" }];

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
        <div className="space-y-4">
          {displayGroups.map((group) => {
            const groupRows = groupedRows[group.key] || [];
            if (groupRows.length === 0) {
              return null;
            }

            return (
              <section key={group.key} className="rounded-3xl border border-white/15 bg-[#17385a] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
                <h2 className="mb-4 text-base font-semibold text-white">{group.label}</h2>
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
                      {groupRows.map((row) => {
                        const routine = row.routine;
                        const creatorRoleId = row.creator?.idRole || row.creator?.Rol?.id;

                        return (
                          <tr key={`${group.key}-${routine.id}`} className="align-top">
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
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
