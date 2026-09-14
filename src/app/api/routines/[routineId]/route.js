import { NextResponse } from "next/server";
import { apiRequest, findRoutineById, findUserById, PATHS } from "@/lib/backend";
import { jsonError, parsePositiveInt, readJsonBody, requireViewer } from "@/lib/api-guard";
import { getRoutineOwnerCandidate, getRoutineOwnerId } from "@/lib/routines";
import { canManageRoutine } from "@/lib/viewer";

function normalizeRoutinePayload(body) {
  const name = String(body?.name || "").trim();
  const idUser = parsePositiveInt(body?.idUser);
  const order = parsePositiveInt(body?.order);
  const time = parsePositiveInt(body?.time);

  if (!name || !order || !time) {
    return { error: "name, order y time son obligatorios y deben ser validos." };
  }

  const normalizedExercises = [];

  for (const item of Array.isArray(body?.exercises) ? body.exercises : []) {
    const idEjercice = parsePositiveInt(item?.idEjercice);
    const series = parsePositiveInt(item?.series);
    const rest = Number(item?.rest);

    if (!idEjercice || !series || !Number.isFinite(rest) || rest < 0) {
      return { error: "Los ejercicios deben tener idEjercice, series y rest validos." };
    }

    normalizedExercises.push({
      idEjercice,
      series,
      rest,
      comments: String(item?.comments || "").trim(),
    });
  }

  return {
    payload: {
      name,
      ...(idUser ? { idUser } : {}),
      order,
      time,
      exercises: normalizedExercises,
    },
  };
}

/** Carga la rutina y verifica que quien mira pueda administrarla. */
async function authorizeRoutine(routineId) {
  const normalizedRoutineId = parsePositiveInt(routineId);

  if (!normalizedRoutineId) {
    return { error: jsonError("La rutina es invalida.", 400) };
  }

  const { viewer, error } = await requireViewer();
  if (error) {
    return { error };
  }

  const routine = await findRoutineById(viewer.token, normalizedRoutineId);

  if (!routine) {
    return { error: jsonError("No se encontro la rutina indicada.", 404) };
  }

  const ownerId = getRoutineOwnerId(routine);
  const routineOwner =
    (ownerId ? await findUserById(viewer.token, ownerId) : null) ||
    getRoutineOwnerCandidate(routine);

  if (!canManageRoutine({ viewer, routine, routineOwner })) {
    return { error: jsonError("No tenes permisos para modificar esta rutina.", 403) };
  }

  return { viewer, routineId: normalizedRoutineId };
}

async function updateRoutine(request, { params }, preferredMethod) {
  try {
    const { routineId: rawRoutineId } = await params;
    const { viewer, routineId, error } = await authorizeRoutine(rawRoutineId);
    if (error) {
      return error;
    }

    const body = await readJsonBody(request);
    const { payload, error: payloadError } = normalizeRoutinePayload(body);

    if (payloadError) {
      return jsonError(payloadError, 400);
    }

    const fallbackMethod = preferredMethod === "PATCH" ? "PUT" : "PATCH";
    const path = `${PATHS.routines}/${routineId}`;

    let result = await apiRequest(path, { token: viewer.token, method: preferredMethod, body: payload });

    if (result.status === 404 || result.status === 405) {
      result = await apiRequest(path, { token: viewer.token, method: fallbackMethod, body: payload });
    }

    if (!result.ok) {
      return NextResponse.json(
        { message: result.json?.message || "No se pudo actualizar la rutina." },
        { status: result.status }
      );
    }

    return NextResponse.json({ ok: true, data: result.json?.data || null });
  } catch {
    return jsonError("Error al actualizar la rutina.", 500);
  }
}

export async function PATCH(request, context) {
  return updateRoutine(request, context, "PATCH");
}

export async function PUT(request, context) {
  return updateRoutine(request, context, "PUT");
}

export async function DELETE(_request, { params }) {
  try {
    const { routineId: rawRoutineId } = await params;
    const { viewer, routineId, error } = await authorizeRoutine(rawRoutineId);
    if (error) {
      return error;
    }

    const { ok, status, json } = await apiRequest(`${PATHS.routines}/${routineId}`, {
      token: viewer.token,
      method: "DELETE",
    });

    if (!ok) {
      return NextResponse.json(
        { message: json?.message || "No se pudo eliminar la rutina." },
        { status }
      );
    }

    return NextResponse.json({ ok: true, data: json?.data || null });
  } catch {
    return jsonError("Error al eliminar la rutina.", 500);
  }
}
