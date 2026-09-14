import { NextResponse } from "next/server";
import { apiRequest, PATHS } from "@/lib/backend";
import { jsonError, parsePositiveInt, readJsonBody, requireViewer } from "@/lib/api-guard";
import { sameId } from "@/lib/roles";
import { isCoach, isSuperAdmin } from "@/lib/viewer";

function normalizeExercises(exercises) {
  const normalized = [];

  for (const item of Array.isArray(exercises) ? exercises : []) {
    const idEjercice = parsePositiveInt(item?.idEjercice);
    const series = parsePositiveInt(item?.series);
    const rest = Number(item?.rest);

    if (!idEjercice || !series || !Number.isFinite(rest) || rest < 0) {
      return { error: "Los ejercicios deben tener idEjercice, series y rest validos." };
    }

    normalized.push({
      idEjercice,
      series,
      rest,
      comments: String(item?.comments || "").trim(),
    });
  }

  return { exercises: normalized };
}

export async function POST(request) {
  try {
    const { viewer, error } = await requireViewer();
    if (error) {
      return error;
    }

    if (!isCoach(viewer) && viewer.roleKey !== "admin" && !isSuperAdmin(viewer)) {
      return jsonError("Solo gym, coach o super admin pueden crear rutinas.", 403);
    }

    const body = await readJsonBody(request);
    const name = body?.name?.trim();
    const idUser = parsePositiveInt(body?.idUser);
    const order = parsePositiveInt(body?.order);
    const time = parsePositiveInt(body?.time);
    const { exercises, error: exercisesError } = normalizeExercises(body?.exercises);

    if (exercisesError) {
      return jsonError(exercisesError, 400);
    }

    if (!name || !idUser || !order || !time || exercises.length === 0) {
      return jsonError("name, idUser, order, time y exercises son obligatorios.", 400);
    }

    // Una rutina se crea siempre a nombre propio: el idUser del cliente no manda.
    if (!isSuperAdmin(viewer) && !sameId(idUser, viewer.id)) {
      return jsonError("Solo podes crear rutinas a tu propio nombre.", 403);
    }

    const { ok, status, json } = await apiRequest(PATHS.routines, {
      token: viewer.token,
      method: "POST",
      body: { name, idUser, order, time, exercises },
    });

    if (!ok) {
      return NextResponse.json(
        { message: json?.message || "No se pudo crear la rutina." },
        { status }
      );
    }

    return NextResponse.json({ ok: true, data: json?.data || null });
  } catch {
    return jsonError("Error al crear la rutina.", 500);
  }
}
