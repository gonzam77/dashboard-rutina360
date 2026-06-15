import { NextResponse } from "next/server";
import { getServerAccessToken } from "@/lib/auth-service";
import { apiUrl } from "@/lib/api-url";

const ROUTINES_URL = apiUrl("/routine");

function normalizeRoutinePayload(body) {
  const name = String(body?.name || "").trim();
  const idUser = Number(body?.idUser);
  const order = Number(body?.order);
  const time = Number(body?.time);
  const exercises = Array.isArray(body?.exercises) ? body.exercises : [];

  if (!name || !Number.isFinite(order) || order <= 0 || !Number.isFinite(time) || time <= 0) {
    return {
      error: "name, order y time son obligatorios y deben ser validos.",
    };
  }

  const normalizedExercises = [];

  for (const item of exercises) {
    const idEjercice = Number(item?.idEjercice);
    const series = Number(item?.series);
    const rest = Number(item?.rest);

    if (
      !Number.isFinite(idEjercice) ||
      idEjercice <= 0 ||
      !Number.isFinite(series) ||
      series <= 0 ||
      !Number.isFinite(rest) ||
      rest < 0
    ) {
      return {
        error: "Los ejercicios deben tener idEjercice, series y rest validos.",
      };
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
      ...(Number.isFinite(idUser) && idUser > 0 ? { idUser } : {}),
      order,
      time,
      exercises: normalizedExercises,
    },
  };
}

async function sendRoutineUpdate(routineId, payload, token, method) {
  return fetch(`${ROUTINES_URL}/${routineId}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
}

async function updateRoutine(request, { params }, preferredMethod) {
  try {
    const { routineId } = await params;
    const body = await request.json();
    const { payload, error } = normalizeRoutinePayload(body);

    if (error) {
      return NextResponse.json({ message: error }, { status: 400 });
    }

    const token = await getServerAccessToken();

    if (!token) {
      return NextResponse.json({ message: "No autenticado." }, { status: 401 });
    }

    const fallbackMethod = preferredMethod === "PATCH" ? "PUT" : "PATCH";
    let response = await sendRoutineUpdate(routineId, payload, token, preferredMethod);

    if (response.status === 404 || response.status === 405) {
      response = await sendRoutineUpdate(routineId, payload, token, fallbackMethod);
    }

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { message: json?.message || "No se pudo actualizar la rutina." },
        { status: response.status }
      );
    }

    return NextResponse.json({ ok: true, data: json?.data || null });
  } catch {
    return NextResponse.json({ message: "Error al actualizar la rutina." }, { status: 500 });
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
    const { routineId } = await params;
    const token = await getServerAccessToken();

    if (!token) {
      return NextResponse.json({ message: "No autenticado." }, { status: 401 });
    }

    const response = await fetch(`${ROUTINES_URL}/${routineId}`, {
      method: "DELETE",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { message: json?.message || "No se pudo eliminar la rutina." },
        { status: response.status }
      );
    }

    return NextResponse.json({ ok: true, data: json?.data || null });
  } catch {
    return NextResponse.json({ message: "Error al eliminar la rutina." }, { status: 500 });
  }
}
