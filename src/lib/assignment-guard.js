import { findRoutineById, findUserById } from "@/lib/backend";
import { jsonError, parsePositiveInt, readJsonBody, requireViewer } from "@/lib/api-guard";
import { getRoutineOwnerCandidate, getRoutineOwnerId } from "@/lib/routines";
import { canAssignRoutineToAthlete } from "@/lib/viewer";

/**
 * Valida que el atleta este dentro del alcance de quien asigna y que la rutina
 * pertenezca al mismo gimnasio que el atleta. Compartido por asignar y quitar.
 */
export async function authorizeAssignment(request) {
  const { viewer, gymOwnerId, error } = await requireViewer();
  if (error) {
    return { error };
  }

  const body = await readJsonBody(request);
  const idRoutine = parsePositiveInt(body?.idRoutine);
  const idAthlete = parsePositiveInt(body?.idAthlete);

  if (!idRoutine || !idAthlete) {
    return { error: jsonError("idRoutine e idAthlete son obligatorios.", 400) };
  }

  const [routine, athlete] = await Promise.all([
    findRoutineById(viewer.token, idRoutine),
    findUserById(viewer.token, idAthlete),
  ]);

  if (!routine || !athlete) {
    return { error: jsonError("No se encontro la rutina o el atleta indicado.", 404) };
  }

  const ownerId = getRoutineOwnerId(routine);
  const routineOwner =
    (ownerId ? await findUserById(viewer.token, ownerId) : null) ||
    getRoutineOwnerCandidate(routine);

  if (
    !canAssignRoutineToAthlete({
      viewer,
      viewerGymOwnerId: gymOwnerId,
      routine,
      routineOwner,
      athlete,
    })
  ) {
    return { error: jsonError("No tenes permisos para asignar esta rutina a este atleta.", 403) };
  }

  return { viewer, idRoutine, idAthlete };
}
