import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getServerAccessToken } from "@/lib/auth-service";
import { normalizeRoleKey, parseSessionUserCookie } from "@/lib/session";
import { apiUrl } from "@/lib/api-url";

const EXERCISES_URL = apiUrl("/ejercice");
const ROUTINES_URL = apiUrl("/routine");
const ASSIGNMENTS_URL = apiUrl("/routine/assign");

function normalizeRoleName(value) {
  return String(value || "").trim().toLowerCase();
}

function isGymRoleName(value) {
  const normalized = normalizeRoleName(value);
  return normalized === "gym" || normalized === "gimnasio";
}

function isActiveAssignment(assignment) {
  return assignment?.isDeleted !== true && assignment?.isActive !== false;
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

function isExerciseAssignedToAnyAthlete(exerciseId, routines, assignments) {
  const routinesById = new Map(
    (Array.isArray(routines) ? routines : [])
      .filter((routine) => Number.isFinite(Number(routine?.id)))
      .map((routine) => [String(routine.id), routine])
  );

  for (const assignment of Array.isArray(assignments) ? assignments : []) {
    if (!isActiveAssignment(assignment)) {
      continue;
    }

    const idRoutine = assignment?.idRoutine || assignment?.Routine?.id;
    if (!idRoutine) {
      continue;
    }

    const routine =
      assignment?.Routine ||
      routinesById.get(String(idRoutine)) ||
      null;

    if (!routine) {
      continue;
    }

    for (const item of getRoutineExercises(routine)) {
      const candidateExerciseId = Number(getRoutineExerciseId(item));
      if (Number.isFinite(candidateExerciseId) && candidateExerciseId === Number(exerciseId)) {
        return true;
      }
    }
  }

  return false;
}

async function fetchList(url, token) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    return [];
  }

  const json = await response.json().catch(() => ({}));
  return Array.isArray(json?.data) ? json.data : [];
}

export async function DELETE(_request, { params }) {
  try {
    const { exerciseId } = await params;
    const normalizedExerciseId = Number(exerciseId);

    if (!Number.isFinite(normalizedExerciseId) || normalizedExerciseId <= 0) {
      return NextResponse.json(
        { message: "El ejercicio es invalido." },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const token = await getServerAccessToken({ allowRefresh: false });

    if (!token) {
      return NextResponse.json({ message: "No autenticado." }, { status: 401 });
    }

    const sessionUser = parseSessionUserCookie(cookieStore.get("session_user")?.value);
    const viewerId = Number(sessionUser?.id) || null;
    const viewerRoleName = sessionUser?.roleName || "";
    const viewerRoleKey = normalizeRoleKey(viewerRoleName);
    const viewerIsGym = viewerRoleKey === "admin" && isGymRoleName(viewerRoleName);

    if (viewerIsGym) {
      const [exercises, routines, assignments] = await Promise.all([
        fetchList(EXERCISES_URL, token),
        fetchList(ROUTINES_URL, token),
        fetchList(ASSIGNMENTS_URL, token),
      ]);

      const exercise = exercises.find((item) => Number(item?.id) === normalizedExerciseId) || null;
      if (!exercise) {
        return NextResponse.json(
          { message: "No se encontro el ejercicio." },
          { status: 404 }
        );
      }

      const exerciseOwnerId = getExerciseOwnerId(exercise);
      if (!exerciseOwnerId || Number(exerciseOwnerId) !== Number(viewerId)) {
        return NextResponse.json(
          { message: "Solo puedes eliminar ejercicios creados por tu gimnasio." },
          { status: 403 }
        );
      }

      if (isExerciseAssignedToAnyAthlete(normalizedExerciseId, routines, assignments)) {
        return NextResponse.json(
          { message: "No se puede eliminar un ejercicio que pertenece a una rutina asignada a un atleta." },
          { status: 409 }
        );
      }
    }

    const response = await fetch(`${EXERCISES_URL}/${normalizedExerciseId}`, {
      method: "DELETE",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { message: json?.message || "No se pudo eliminar el ejercicio." },
        { status: response.status }
      );
    }

    return NextResponse.json({ ok: true, data: json?.data || null });
  } catch {
    return NextResponse.json({ message: "Error al eliminar el ejercicio." }, { status: 500 });
  }
}
