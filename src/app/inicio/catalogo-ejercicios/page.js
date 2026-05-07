import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import ExerciseDeleteButton from "@/components/catalog/ExerciseDeleteButton";

const MUSCLE_GROUPS_URL = "https://rutina360-server.onrender.com/muscleGroup";
const EXERCISES_URL = "https://rutina360-server.onrender.com/ejercice";
const ROUTINES_URL = "https://rutina360-server.onrender.com/routine/";

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
  const token = cookieStore.get("token")?.value;

  if (!name) {
    throw new Error("El nombre del grupo muscular es obligatorio.");
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
  const token = cookieStore.get("token")?.value;

  if (!name) {
    throw new Error("El nombre del ejercicio es obligatorio.");
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

export default async function CatalogoEjerciciosPage() {
  let muscleGroups = [];
  let exercises = [];
  let routineUsageByExerciseId = new Map();
  let errorMessage = "";
  let routineUsageWarning = "";
  let routineUsageVerified = false;

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    const [muscleGroupsResult, exercisesResult] = await Promise.all([
      fetchJson(MUSCLE_GROUPS_URL, "No se pudieron cargar los grupos musculares.", token),
      fetchJson(EXERCISES_URL, "No se pudieron cargar los ejercicios.", token),
    ]);

    muscleGroups = muscleGroupsResult;
    exercises = exercisesResult;

    try {
      const routines = await fetchJson(ROUTINES_URL, "No se pudieron cargar las rutinas.", token);
      routineUsageByExerciseId = getRoutineUsageByExerciseId(routines);
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
                  <ul className="mt-4 space-y-2">
                    {groupExercises.map((exercise) => {
                      const routineCount = routineUsageByExerciseId.get(String(exercise.id)) || 0;

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
                          </div>
                          <ExerciseDeleteButton
                            exerciseId={exercise.id}
                            exerciseName={exercise.name}
                            routineCount={routineCount}
                            routineUsageVerified={routineUsageVerified}
                          />
                        </li>
                      );
                    })}
                  </ul>
                )}

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
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
