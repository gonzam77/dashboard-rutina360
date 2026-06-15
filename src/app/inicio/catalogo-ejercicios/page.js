import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import ExerciseDeleteButton from "@/components/catalog/ExerciseDeleteButton";
import { getServerAccessToken } from "@/lib/auth-service";
import { parseSessionUserCookie } from "@/lib/session";
import { apiUrl } from "@/lib/api-url";

const MUSCLE_GROUPS_URL = apiUrl("/muscleGroup");
const EXERCISES_URL = apiUrl("/ejercice");
const ROUTINES_URL = apiUrl("/routine");
const ASSIGNMENTS_URL = apiUrl("/routine/assign");
const SUPER_ADMIN_OWNER_ID = 1;

function normalizeRoleName(value) {
  return String(value || "").trim().toLowerCase();
}

function isGymOrDescendantRole(roleName) {
  const normalized = normalizeRoleName(roleName);
  return ["gym", "gimnasio", "coach", "athlete", "atleta"].includes(normalized);
}

function isCoachOrAthleteRole(roleName) {
  const normalized = normalizeRoleName(roleName);
  return ["coach", "athlete", "atleta"].includes(normalized);
}

async function fetchJson(url, fallbackMessage, token) {
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

async function createMuscleGroup(formData) {
  "use server";

  const name = String(formData.get("name") || "").trim();
  const cookieStore = await cookies();
  const token = await getServerAccessToken();

  if (!token) {
    throw new Error("No autenticado.");
  }

  const sessionUser = parseSessionUserCookie(cookieStore.get("session_user")?.value);
  const roleName = sessionUser?.roleName || "";

  if (!name) {
    throw new Error("El nombre del grupo muscular es obligatorio.");
  }

  if (isGymOrDescendantRole(roleName)) {
    throw new Error("Tu rol no tiene permisos para crear grupos musculares.");
  }

  const response = await fetch(`${MUSCLE_GROUPS_URL}/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ name }),
    cache: "no-store",
  });

  if (!response.ok) {
    const json = await response.json().catch(() => ({}));
    throw new Error(json?.message || "No se pudo crear el grupo muscular.");
  }

  revalidatePath("/inicio/catalogo-ejercicios");
}

async function createExercise(formData) {
  "use server";

  const name = String(formData.get("name") || "").trim();
  const idMuscleGroup = Number(formData.get("idMuscleGroup"));
  const cookieStore = await cookies();
  const token = await getServerAccessToken();

  if (!token) {
    throw new Error("No autenticado.");
  }

  const sessionUser = parseSessionUserCookie(cookieStore.get("session_user")?.value);
  const roleName = sessionUser?.roleName || "";

  if (!name) {
    throw new Error("El nombre del ejercicio es obligatorio.");
  }

  if (isCoachOrAthleteRole(roleName)) {
    throw new Error("Tu rol no tiene permisos para crear ejercicios.");
  }

  if (!Number.isFinite(idMuscleGroup) || idMuscleGroup <= 0) {
    throw new Error("El grupo muscular es invalido.");
  }

  const response = await fetch(`${EXERCISES_URL}/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ idMuscleGroup, name }),
    cache: "no-store",
  });

  if (!response.ok) {
    const json = await response.json().catch(() => ({}));
    throw new Error(json?.message || "No se pudo crear el ejercicio.");
  }

  revalidatePath("/inicio/catalogo-ejercicios");
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

function getRoutineExerciseId(item) {
  return (
    item?.idEjercice ||
    item?.Ejercice?.id ||
    item?.exercise?.id ||
    item?.Exercise?.id ||
    item?.idExercise ||
    item?.idEjercicio ||
    item?.id
  );
}

function getRoutineUsageByExerciseId(routines) {
  const usage = new Map();

  for (const routine of routines) {
    const exerciseIds = new Set();

    for (const item of getRoutineExercises(routine)) {
      const exerciseId = getRoutineExerciseId(item);

      if (exerciseId) {
        exerciseIds.add(String(exerciseId));
      }
    }

    for (const exerciseId of exerciseIds) {
      usage.set(exerciseId, (usage.get(exerciseId) || 0) + 1);
    }
  }

  return usage;
}

function isGymRoleName(value) {
  const normalized = normalizeRoleName(value);
  return normalized === "gym" || normalized === "gimnasio";
}

function isActiveAssignment(assignment) {
  return assignment?.isDeleted !== true && assignment?.isActive !== false;
}

function getExerciseOwnerId(exercise) {
  const candidates = [
    exercise?.idOwner,
    exercise?.idUser,
    exercise?.idAdminOwner,
    exercise?.createdBy,
    exercise?.userId,
    exercise?.creator?.id,
    exercise?.User?.id,
    exercise?.user?.id,
    exercise?.adminOwner?.id,
  ];

  for (const candidate of candidates) {
    const id = Number(candidate);
    if (Number.isFinite(id) && id > 0) {
      return id;
    }
  }

  return null;
}

function getAssignedRoutineUsageByExerciseId(routines, assignments) {
  const usage = new Map();
  const routinesById = new Map(
    (Array.isArray(routines) ? routines : [])
      .filter((routine) => Number.isFinite(Number(routine?.id)))
      .map((routine) => [String(routine.id), routine])
  );

  for (const assignment of Array.isArray(assignments) ? assignments : []) {
    if (!isActiveAssignment(assignment)) {
      continue;
    }

    const routineId = assignment?.idRoutine || assignment?.Routine?.id;
    if (!routineId) {
      continue;
    }

    const routine = assignment?.Routine || routinesById.get(String(routineId));
    if (!routine) {
      continue;
    }

    const exerciseIds = new Set();
    for (const item of getRoutineExercises(routine)) {
      const exerciseId = getRoutineExerciseId(item);
      if (exerciseId) {
        exerciseIds.add(String(exerciseId));
      }
    }

    for (const exerciseId of exerciseIds) {
      usage.set(exerciseId, (usage.get(exerciseId) || 0) + 1);
    }
  }

  return usage;
}

export default async function CatalogoEjerciciosPage() {
  let muscleGroups = [];
  let exercises = [];
  let routineUsageByExerciseId = new Map();
  let assignedRoutineUsageByExerciseId = new Map();
  let errorMessage = "";
  let routineUsageWarning = "";
  let routineUsageVerified = false;
  let canManageMuscleCatalog = true;
  let canManageExerciseCatalog = true;
  let viewerUserId = null;
  let viewerIsGym = false;

  try {
    const cookieStore = await cookies();
    const token = await getServerAccessToken();

    if (!token) {
      throw new Error("No autenticado.");
    }

    const sessionUser = parseSessionUserCookie(cookieStore.get("session_user")?.value);
    const roleName = sessionUser?.roleName || "";
    viewerUserId = Number(sessionUser?.id) || null;
    viewerIsGym = isGymRoleName(roleName);
    canManageMuscleCatalog = !isGymOrDescendantRole(roleName);
    canManageExerciseCatalog = !isCoachOrAthleteRole(roleName);
    const [muscleGroupsResult, exercisesResult] = await Promise.all([
      fetchJson(MUSCLE_GROUPS_URL, "No se pudieron cargar los grupos musculares.", token),
      fetchJson(EXERCISES_URL, "No se pudieron cargar los ejercicios.", token),
    ]);

    muscleGroups = muscleGroupsResult;
    exercises = viewerIsGym
      ? exercisesResult.filter((exercise) => {
          const ownerId = getExerciseOwnerId(exercise);
          if (!ownerId) {
            return false;
          }

          return (
            Number(ownerId) === Number(SUPER_ADMIN_OWNER_ID) ||
            Number(ownerId) === Number(viewerUserId)
          );
        })
      : exercisesResult;

    try {
      const [routines, assignments] = await Promise.all([
        fetchJson(ROUTINES_URL, "No se pudieron cargar las rutinas.", token),
        fetchJson(ASSIGNMENTS_URL, "No se pudieron cargar las asignaciones de rutinas.", token),
      ]);
      routineUsageByExerciseId = getRoutineUsageByExerciseId(routines);
      assignedRoutineUsageByExerciseId = getAssignedRoutineUsageByExerciseId(routines, assignments);
      routineUsageVerified = true;
    } catch (error) {
      routineUsageWarning = error.message;
    }
  } catch (error) {
    errorMessage = error.message;
  }

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-white/15 bg-[#0f2a46] p-8 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
        <h1 className="text-3xl font-extrabold text-white">Catalogo ejercicios</h1>
        <p className="mt-3 text-white/80">
          Grupos musculares y ejercicios asociados del sistema.
        </p>
        {canManageMuscleCatalog ? (
          <form action={createMuscleGroup} className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              name="name"
              placeholder="Nuevo grupo muscular (ej: Lumbares)"
              className="w-full rounded-lg border border-white/20 bg-[#17385a] px-3 py-2 text-sm text-white outline-none ring-cyan-300/35 placeholder:text-white/55 focus:ring"
              required
            />
            <button
              type="submit"
              className="rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
            >
              Agregar grupo muscular
            </button>
          </form>
        ) : null}
      </header>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-300/40 bg-red-950/40 p-4 text-red-200">
          {errorMessage}
        </div>
      ) : null}

      {!errorMessage && routineUsageWarning ? (
        <div className="rounded-2xl border border-amber-300/40 bg-amber-900/30 p-4 text-sm text-amber-100">
          {routineUsageWarning} Las eliminaciones seguiran pidiendo confirmacion, pero no se pudo anticipar si el ejercicio esta vinculado a una rutina.
        </div>
      ) : null}

      {!errorMessage && muscleGroups.length === 0 ? (
        <div className="rounded-2xl border border-white/15 bg-[#17385a] p-6 text-white/80 shadow-sm">
          No hay grupos musculares disponibles.
        </div>
      ) : null}

      {!errorMessage && muscleGroups.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {muscleGroups.map((group) => {
            const groupExercises = exercises.filter(
              (exercise) => String(exercise.idMuscleGroup) === String(group.id)
            );
            const visibleExercises = groupExercises.slice(0, 5);
            const hiddenExercises = groupExercises.slice(5);

            const renderExerciseRow = (exercise) => {
              const routineCount = routineUsageByExerciseId.get(String(exercise.id)) || 0;
              const assignedRoutineCount =
                assignedRoutineUsageByExerciseId.get(String(exercise.id)) || 0;
              const exerciseOwnerId = getExerciseOwnerId(exercise);
              const isOwner =
                !viewerIsGym ||
                (Number.isFinite(Number(exerciseOwnerId)) &&
                  Number(exerciseOwnerId) === Number(viewerUserId));
              const canDeleteByAssignment = assignedRoutineCount === 0;
              const canDeleteExercise = isOwner && canDeleteByAssignment;
              const deleteBlockedReason = !isOwner
                ? "Solo puedes eliminar ejercicios creados por tu gimnasio."
                : !canDeleteByAssignment
                  ? "No se puede eliminar: el ejercicio esta en una rutina asignada a un atleta."
                  : "";

              return (
                <li
                  key={exercise.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-white/15 bg-[#0f2a46] px-3 py-2 text-sm text-white/90"
                >
                  <div className="min-w-0">
                    <p className="break-words font-medium">{exercise.name}</p>
                    {routineUsageVerified && routineCount > 0 ? (
                      <p className="mt-1 text-xs text-amber-200">
                        Vinculado a {routineCount} rutina{routineCount === 1 ? "" : "s"}
                      </p>
                    ) : null}
                    {routineUsageVerified && assignedRoutineCount > 0 ? (
                      <p className="mt-1 text-xs text-rose-200">
                        Presente en {assignedRoutineCount} rutina{assignedRoutineCount === 1 ? "" : "s"} asignada{assignedRoutineCount === 1 ? "" : "s"} a atletas
                      </p>
                    ) : null}
                  </div>
                  {canManageExerciseCatalog ? (
                    <ExerciseDeleteButton
                      exerciseId={exercise.id}
                      exerciseName={exercise.name}
                      routineCount={routineCount}
                      routineUsageVerified={routineUsageVerified}
                      canDelete={canDeleteExercise}
                      blockedReason={deleteBlockedReason}
                    />
                  ) : null}
                </li>
              );
            };

            return (
              <article
                key={group.id}
                className="flex h-full flex-col rounded-3xl border border-white/15 bg-[#17385a] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.28)]"
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-white">{group.name}</h2>
                  <span className="rounded-full border border-cyan-300/35 bg-cyan-300/10 px-3 py-1 text-xs font-medium text-cyan-100">
                    {groupExercises.length} ejercicios
                  </span>
                </div>

                {groupExercises.length === 0 ? (
                  <p className="mt-4 text-sm text-white/75">
                    Este grupo muscular todavia no tiene ejercicios cargados.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    <ul className="space-y-2">{visibleExercises.map(renderExerciseRow)}</ul>
                    {hiddenExercises.length > 0 ? (
                      <details className="group flex flex-col gap-2">
                        <ul className="order-1 space-y-2">{hiddenExercises.map(renderExerciseRow)}</ul>
                        <summary className="order-2 cursor-pointer select-none rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20">
                          <span className="group-open:hidden">Ver mas ({hiddenExercises.length})</span>
                          <span className="hidden group-open:inline">Ver menos</span>
                        </summary>
                      </details>
                    ) : null}
                  </div>
                )}

                {canManageExerciseCatalog ? (
                  <form action={createExercise} className="mt-auto pt-4 flex flex-col gap-3 sm:flex-row">
                    <input type="hidden" name="idMuscleGroup" value={group.id} />
                    <input
                      type="text"
                      name="name"
                      placeholder="Nuevo ejercicio para este grupo"
                      className="w-full rounded-lg border border-white/20 bg-[#0f2a46] px-3 py-2 text-sm text-white outline-none ring-cyan-300/35 placeholder:text-white/55 focus:ring"
                      required
                    />
                    <button
                      type="submit"
                      className="rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
                    >
                      Agregar
                    </button>
                  </form>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
