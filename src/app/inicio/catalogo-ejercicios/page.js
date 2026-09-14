import { revalidatePath } from "next/cache";
import CatalogCreateForm from "@/components/catalog/CatalogCreateForm";
import ExerciseDeleteButton from "@/components/catalog/ExerciseDeleteButton";
import Icon from "@/components/ui/Icon";
import PageHeader from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Alert, EmptyState } from "@/components/ui/Feedback";
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

  const totalExercises = exercises.length;

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Catalogo"
        title="Catalogo de ejercicios"
        description="Grupos musculares y ejercicios disponibles para armar rutinas."
        breadcrumbs={[{ href: "/inicio", label: "Panel" }, { label: "Catalogo ejercicios" }]}
        meta={
          <>
            <span className="r360-badge r360-badge-neutro">
              {muscleGroups.length} grupo{muscleGroups.length === 1 ? "" : "s"}
            </span>
            <span className="r360-badge r360-badge-acento">
              {totalExercises} ejercicio{totalExercises === 1 ? "" : "s"}
            </span>
          </>
        }
      />

      {canManageMuscles ? (
        <Card>
          <h2 className="flex items-center gap-2 text-base font-bold text-texto">
            <Icon name="mas" className="text-acento" />
            Nuevo grupo muscular
          </h2>
          <CatalogCreateForm
            action={createMuscleGroup}
            className="mt-4"
            placeholder="Nuevo grupo muscular (ej: Lumbares)"
            submitLabel="Agregar grupo muscular"
            pendingLabel="Agregando..."
          />
        </Card>
      ) : null}

      {errorMessage ? <Alert title="No se pudo cargar el catalogo">{errorMessage}</Alert> : null}

      {!errorMessage && routineUsageWarning ? (
        <Alert tone="aviso" title="Uso de ejercicios no verificado">
          {routineUsageWarning} Las eliminaciones seguiran pidiendo confirmacion, pero no se pudo
          anticipar si el ejercicio esta vinculado a una rutina.
        </Alert>
      ) : null}

      {!errorMessage && muscleGroups.length === 0 ? (
        <Card>
          <EmptyState
            icon="catalogo"
            title="No hay grupos musculares"
            description="Crea el primer grupo muscular para empezar a cargar ejercicios."
          />
        </Card>
      ) : null}

      {!errorMessage && muscleGroups.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
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
                  className="r360-card-inset flex items-center justify-between gap-3 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-texto">{exercise.name}</p>
                    {routineUsageVerified && (routineCount > 0 || assignedRoutineCount > 0) ? (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {routineCount > 0 ? (
                          <span className="r360-badge r360-badge-aviso">
                            {routineCount} rutina{routineCount === 1 ? "" : "s"}
                          </span>
                        ) : null}
                        {assignedRoutineCount > 0 ? (
                          <span className="r360-badge r360-badge-peligro">
                            {assignedRoutineCount} asignada
                            {assignedRoutineCount === 1 ? "" : "s"}
                          </span>
                        ) : null}
                      </div>
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
              <article key={group.id} className="r360-card flex h-full flex-col p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="flex items-center gap-2 text-lg font-bold text-texto">
                    <Icon name="catalogo" className="text-acento" />
                    {group.name}
                  </h2>
                  <span className="r360-badge r360-badge-acento">
                    {groupExercises.length} ejercicio{groupExercises.length === 1 ? "" : "s"}
                  </span>
                </div>

                {groupExercises.length === 0 ? (
                  <p className="mt-4 text-sm text-texto-2">
                    Este grupo muscular todavia no tiene ejercicios cargados.
                  </p>
                ) : (
                  <div className="mt-4 space-y-3">
                    <ul className="space-y-2">{visibleExercises.map(renderExerciseRow)}</ul>
                    {hiddenExercises.length > 0 ? (
                      <details className="group/more flex flex-col gap-2">
                        <summary className="order-2 cursor-pointer select-none list-none">
                          <span className="r360-btn r360-btn-ghost r360-btn-sm w-full">
                            <span className="group-open/more:hidden">
                              Ver mas ({hiddenExercises.length})
                            </span>
                            <span className="hidden group-open/more:inline">Ver menos</span>
                          </span>
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
