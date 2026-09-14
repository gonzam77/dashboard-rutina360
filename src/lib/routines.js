/** Las rutinas llegan con distintos nombres de coleccion segun el endpoint. */
export function getRoutineExercises(routine) {
  const candidates = [
    routine?.exercises,
    routine?.Routine_Ejercices,
    routine?.Ejercices,
    routine?.RoutineEjercices,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate;
    }
  }

  return [];
}

export function getRoutineExerciseId(item) {
  const candidates = [
    item?.idEjercice,
    item?.Ejercice?.id,
    item?.exercise?.id,
    item?.Exercise?.id,
    item?.idExercise,
    item?.idEjercicio,
    item?.id,
  ];

  for (const candidate of candidates) {
    const id = Number(candidate);
    if (Number.isFinite(id) && id > 0) {
      return id;
    }
  }

  return null;
}

export function isActiveRecord(record) {
  return record?.isDeleted !== true && record?.isActive !== false;
}

export function getExerciseOwnerId(exercise) {
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

export function getRoutineOwnerCandidate(routine) {
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

export function getRoutineOwnerId(routine) {
  const direct = Number(routine?.idUser);
  if (Number.isFinite(direct) && direct > 0) {
    return direct;
  }

  const nested = Number(getRoutineOwnerCandidate(routine)?.id);
  return Number.isFinite(nested) && nested > 0 ? nested : null;
}

export function getAssignmentAthleteId(assignment) {
  const id = Number(assignment?.idAthlete || assignment?.athlete?.id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function getAssignmentRoutineId(assignment) {
  const id = Number(assignment?.idRoutine || assignment?.Routine?.id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/** Ids de ejercicios distintos usados por una rutina. */
export function getRoutineExerciseIds(routine) {
  const ids = new Set();

  for (const item of getRoutineExercises(routine)) {
    const exerciseId = getRoutineExerciseId(item);
    if (exerciseId) {
      ids.add(String(exerciseId));
    }
  }

  return ids;
}
