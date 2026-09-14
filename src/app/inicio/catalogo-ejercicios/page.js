import { revalidatePath } from "next/cache";
import CatalogCreateForm from "@/components/catalog/CatalogCreateForm";
import ExerciseDeleteButton from "@/components/catalog/ExerciseDeleteButton";
import {
  apiRequest,
  getAssignmentsStrict,
  getExercisesStrict,
  getMuscleGroupsStrict,
  getRoutinesStrict,
  PATHS,
} from "@/lib/backend";
import { sameId } from "@/lib/roles";
import {
  getAssignmentRoutineId,
  getExerciseOwnerId,
  getRoutineExerciseIds,
  isActiveRecord,
} from "@/lib/routines";
import {
  canManageExerciseCatalog,
  canManageMuscleGroupCatalog,
  getViewer,
} from "@/lib/viewer";

export const metadata = {
  title: "Catalogo de ejercicios",
};

const CATALOG_PATH = "/inicio/catalogo-ejercicios";
const SUPER_ADMIN_OWNER_ID = 1;

async function createMuscleGroup(_prevState, formData) {
  "use server";

  const name = String(formData.get("name") || "").trim();
  const viewer = await getViewer();

  if (!viewer) {
    return { error: "No autenticado. Volve a iniciar sesion." };
  }

  if (!canManageMuscleGroupCatalog(viewer)) {
    return { error: "Tu rol no tiene permisos para crear grupos musculares." };
  }

  if (!name) {
    return { error: "El nombre del grupo muscular es obligatorio." };
  }

  const { ok, json } = await apiRequest(`${PATHS.muscleGroups}/`, {
    token: viewer.token,
    method: "POST",
    body: { name },
  });

  if (!ok) {
    return { error: json?.message || "No se pudo crear el grupo muscular." };
  }

  revalidatePath(CATALOG_PATH);
  return { message: `Grupo muscular "${name}" creado.` };
}

async function createExercise(_prevState, formData) {
  "use server";

  const name = String(formData.get("name") || "").trim();
  const idMuscleGroup = Number(formData.get("idMuscleGroup"));
  const viewer = await getViewer();

  if (!viewer) {
    return { error: "No autenticado. Volve a iniciar sesion." };
  }

  if (!canManageExerciseCatalog(viewer)) {
    return { error: "Tu rol no tiene permisos para crear ejercicios." };
  }

  if (!name) {
    return { error: "El nombre del ejercicio es obligatorio." };
  }

  if (!Number.isFinite(idMuscleGroup) || idMuscleGroup <= 0) {
    return { error: "El grupo muscular es invalido." };
  }

  const { ok, json } = await apiRequest(`${PATHS.exercises}/`, {
    token: viewer.token,
    method: "POST",
    body: { idMuscleGroup, name },
  });

  if (!ok) {
    return { error: json?.message || "No se pudo crear el ejercicio." };
  }

  revalidatePath(CATALOG_PATH);
  return { message: `Ejercicio "${name}" creado.` };
}

function countRoutineUsageByExerciseId(routines) {
  const usage = new Map();

  for (const routine of routines) {
    for (const exerciseId of getRoutineExerciseIds(routine)) {
      usage.set(exerciseId, (usage.get(exerciseId) || 0) + 1);
    }
  }

  return usage;
}

function countAssignedRoutineUsageByExerciseId(routines, assignments) {
  const usage = new Map();
  const routinesById = new Map(
    routines
      .filter((routine) => Number.isFinite(Number(routine?.id)))
      .map((routine) => [String(routine.id), routine])
  );

  for (const assignment of assignments) {
    if (!isActiveRecord(assignment)) {
      continue;
    }

    const routineId = getAssignmentRoutineId(assignment);

    if (!routineId) {
      continue;
    }

    const routine = assignment?.Routine || routinesById.get(String(routineId));

    if (!routine) {
      continue;
    }

    for (const exerciseId of getRoutineExerciseIds(routine)) {
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
  let canManageMuscles = false;
  let canManageExercises = false;
  let viewerUserId = null;
  let viewerIsGym = false;

  try {
    const viewer = await getViewer();

    if (!viewer) {
      throw new Error("No autenticado.");
    }

    viewerUserId = viewer.id;
    viewerIsGym = viewer.isGym;
    canManageMuscles = canManageMuscleGroupCatalog(viewer);
    canManageExercises = canManageExerciseCatalog(viewer);

    const [muscleGroupsResult, exercisesResult] = await Promise.all([
      getMuscleGroupsStrict(viewer.token),
      getExercisesStrict(viewer.token),
    ]);

    muscleGroups = muscleGroupsResult;

    // Un gimnasio ve el catalogo global mas lo que creo el mismo. Si el backend
    // no informa duenos, se muestra todo en lugar de dejar la vista vacia.
    const hasOwnerData = exercisesResult.some((exercise) => getExerciseOwnerId(exercise) !== null);

    exercises =
      viewerIsGym && hasOwnerData
        ? exercisesResult.filter((exercise) => {
            const ownerId = getExerciseOwnerId(exercise);
            return (
              ownerId === null ||
              sameId(ownerId, SUPER_ADMIN_OWNER_ID) ||
              sameId(ownerId, viewer.id)
            );
          })
        : exercisesResult;

    try {
      const [routines, assignments] = await Promise.all([
        getRoutinesStrict(viewer.token),
        getAssignmentsStrict(viewer.token),
      ]);

      routineUsageByExerciseId = countRoutineUsageByExerciseId(routines);
      assignedRoutineUsageByExerciseId = countAssignedRoutineUsageByExerciseId(routines, assignments);
      routineUsageVerified = true;
    } catch (error) {
      routineUsageWarning = error?.message || "No se pudo verificar el uso de los ejercicios.";
    }
  } catch (error) {
    errorMessage = error?.message || "No se pudo cargar el catalogo.";
  }

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-white/15 bg-[#0f2a46] p-8 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
        <h1 className="text-3xl font-extrabold text-white">Catalogo ejercicios</h1>
        <p className="mt-3 text-white/80">Grupos musculares y ejercicios asociados del sistema.</p>
        {canManageMuscles ? (
          <CatalogCreateForm
            action={createMuscleGroup}
            className="mt-6"
            inputClassName="bg-[#17385a]"
            placeholder="Nuevo grupo muscular (ej: Lumbares)"
            submitLabel="Agregar grupo muscular"
            pendingLabel="Agregando..."
          />
        ) : null}
      </header>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-300/40 bg-red-950/40 p-4 text-red-200">
          {errorMessage}
        </div>
      ) : null}

      {!errorMessage && routineUsageWarning ? (
        <div className="rounded-2xl border border-amber-300/40 bg-amber-900/30 p-4 text-sm text-amber-100">
          {routineUsageWarning} Las eliminaciones seguiran pidiendo confirmacion, pero no se pudo
          anticipar si el ejercicio esta vinculado a una rutina.
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
            const groupExercises = exercises.filter((exercise) =>
              sameId(exercise.idMuscleGroup, group.id)
            );
            const visibleExercises = groupExercises.slice(0, 5);
            const hiddenExercises = groupExercises.slice(5);

            const renderExerciseRow = (exercise) => {
              const routineCount = routineUsageByExerciseId.get(String(exercise.id)) || 0;
              const assignedRoutineCount =
                assignedRoutineUsageByExerciseId.get(String(exercise.id)) || 0;
              const exerciseOwnerId = getExerciseOwnerId(exercise);
              const isOwner = !viewerIsGym || sameId(exerciseOwnerId, viewerUserId);
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
                        Presente en {assignedRoutineCount} rutina
                        {assignedRoutineCount === 1 ? "" : "s"} asignada
                        {assignedRoutineCount === 1 ? "" : "s"} a atletas
                      </p>
                    ) : null}
                  </div>
                  {canManageExercises ? (
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
                      <details className="group/more flex flex-col gap-2">
                        <summary className="order-2 cursor-pointer select-none rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20">
                          <span className="group-open/more:hidden">
                            Ver mas ({hiddenExercises.length})
                          </span>
                          <span className="hidden group-open/more:inline">Ver menos</span>
                        </summary>
                        <ul className="order-1 space-y-2">
                          {hiddenExercises.map(renderExerciseRow)}
                        </ul>
                      </details>
                    ) : null}
                  </div>
                )}

                {canManageExercises ? (
                  <CatalogCreateForm
                    action={createExercise}
                    className="mt-auto pt-4"
                    inputClassName="bg-[#0f2a46]"
                    hiddenFields={{ idMuscleGroup: group.id }}
                    placeholder="Nuevo ejercicio para este grupo"
                    submitLabel="Agregar"
                    pendingLabel="Agregando..."
                  />
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
