import { NextResponse } from "next/server";
import { apiRequest, getAssignments, getExercises, getRoutines, PATHS } from "@/lib/backend";
import { jsonError, parsePositiveInt, requireViewer } from "@/lib/api-guard";
import {
  getAssignmentRoutineId,
  getExerciseOwnerId,
  getRoutineExerciseIds,
  isActiveRecord,
} from "@/lib/routines";
import { sameId } from "@/lib/roles";
import { canManageExerciseCatalog, isGymAdmin } from "@/lib/viewer";

/** True si el ejercicio forma parte de alguna rutina asignada a un atleta. */
function isExerciseInAssignedRoutine(exerciseId, routines, assignments) {
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

    if (getRoutineExerciseIds(routine).has(String(exerciseId))) {
      return true;
    }
  }

  return false;
}

export async function DELETE(_request, { params }) {
  try {
    const { exerciseId } = await params;
    const normalizedExerciseId = parsePositiveInt(exerciseId);

    if (!normalizedExerciseId) {
      return jsonError("El ejercicio es invalido.", 400);
    }

    const { viewer, error } = await requireViewer();
    if (error) {
      return error;
    }

    if (!canManageExerciseCatalog(viewer)) {
      return jsonError("Tu rol no puede eliminar ejercicios del catalogo.", 403);
    }

    // El gimnasio solo borra lo suyo y nunca si ya esta en uso por un atleta.
    if (isGymAdmin(viewer) && viewer.isGym) {
      const [exercises, routines, assignments] = await Promise.all([
        getExercises(viewer.token),
        getRoutines(viewer.token),
        getAssignments(viewer.token),
      ]);

      const exercise = exercises.find((item) => Number(item?.id) === normalizedExerciseId);

      if (!exercise) {
        return jsonError("No se encontro el ejercicio.", 404);
      }

      if (!sameId(getExerciseOwnerId(exercise), viewer.id)) {
        return jsonError("Solo puedes eliminar ejercicios creados por tu gimnasio.", 403);
      }

      if (isExerciseInAssignedRoutine(normalizedExerciseId, routines, assignments)) {
        return jsonError(
          "No se puede eliminar un ejercicio que pertenece a una rutina asignada a un atleta.",
          409
        );
      }
    }

    const { ok, status, json } = await apiRequest(`${PATHS.exercises}/${normalizedExerciseId}`, {
      token: viewer.token,
      method: "DELETE",
    });

    if (!ok) {
      return NextResponse.json(
        { message: json?.message || "No se pudo eliminar el ejercicio." },
        { status }
      );
    }

    return NextResponse.json({ ok: true, data: json?.data || null });
  } catch {
    return jsonError("Error al eliminar el ejercicio.", 500);
  }
}
