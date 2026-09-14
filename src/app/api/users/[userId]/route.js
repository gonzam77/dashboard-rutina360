import { NextResponse } from "next/server";
import { apiRequest, findUserById, PATHS } from "@/lib/backend";
import { jsonError, parsePositiveInt, readJsonBody, requireViewer } from "@/lib/api-guard";
import { getUserRoleName, isAdminOrGymRoleName, isAthleteRoleName, isCoachRoleName, sameId } from "@/lib/roles";
import { canManageUser } from "@/lib/viewer";

/**
 * Devuelve el campo solo si vino en el body, distinguiendo "no enviado" de
 * "enviado vacio". Sin esto no habria forma de borrar un telefono o direccion.
 */
function optionalField(body, key, transform = (value) => String(value ?? "").trim()) {
  return Object.hasOwn(body, key) ? { [key]: transform(body[key]) } : {};
}

async function loadTarget(viewer, userId) {
  const targetUser = await findUserById(viewer.token, userId);

  if (!targetUser) {
    return { error: jsonError("No se encontro el usuario indicado.", 404) };
  }

  return { targetUser };
}

async function sendUserUpdate(userId, payload, token, method) {
  return apiRequest(`${PATHS.users}/${userId}`, { token, method, body: payload });
}

async function updateUser(request, { params }, preferredMethod) {
  try {
    const { userId } = await params;
    const normalizedUserId = parsePositiveInt(userId);

    if (!normalizedUserId) {
      return jsonError("El usuario es invalido.", 400);
    }

    const { viewer, gymOwnerId, error } = await requireViewer();
    if (error) {
      return error;
    }

    const { targetUser, error: targetError } = await loadTarget(viewer, normalizedUserId);
    if (targetError) {
      return targetError;
    }

    if (!canManageUser({ viewer, viewerGymOwnerId: gymOwnerId, targetUser })) {
      return jsonError("No tenes permisos para editar este usuario.", 403);
    }

    const body = await readJsonBody(request);
    const roleName = getUserRoleName(targetUser);
    const needsDni = isAthleteRoleName(roleName) || isCoachRoleName(roleName);
    const needsBirthAndGender = !isAdminOrGymRoleName(roleName);
    const needsAthleteData = isAthleteRoleName(roleName);

    const username = String(body?.username || "").trim().toUpperCase();
    const email = String(body?.email || "").trim().toLowerCase();
    const dni = String(body?.dni || "").trim();
    const password = String(body?.password || "").trim();
    const { birthDate, gender } = body;

    if (!username || !email) {
      return jsonError("username y email son obligatorios.", 400);
    }

    if (needsDni && !dni) {
      return jsonError("dni es obligatorio para este rol.", 400);
    }

    if (needsBirthAndGender && (!birthDate || !gender)) {
      return jsonError("birthDate y gender son obligatorios para este rol.", 400);
    }

    if (needsAthleteData) {
      const height = Number(body?.height);
      const weight = Number(body?.weight);
      const weeklyAvailability = String(body?.weeklyAvailability || "").trim();

      if (!Number.isFinite(height) || height <= 0 || !Number.isFinite(weight) || weight <= 0 || !weeklyAvailability) {
        return jsonError("height, weight y weeklyAvailability son obligatorios para atletas.", 400);
      }
    }

    const payload = {
      username,
      email,
      ...(dni ? { dni } : {}),
      ...(password ? { password } : {}),
      ...optionalField(body, "phone"),
      ...optionalField(body, "address"),
      ...(needsBirthAndGender ? { birthDate, gender } : {}),
      ...(needsAthleteData
        ? {
            height: Number(body?.height),
            weight: Number(body?.weight),
            weeklyAvailability: String(body?.weeklyAvailability || "").trim(),
            ...optionalField(body, "goal"),
          }
        : {}),
    };

    const fallbackMethod = preferredMethod === "PATCH" ? "PUT" : "PATCH";
    let result = await sendUserUpdate(normalizedUserId, payload, viewer.token, preferredMethod);

    if (result.status === 404 || result.status === 405) {
      result = await sendUserUpdate(normalizedUserId, payload, viewer.token, fallbackMethod);
    }

    if (!result.ok) {
      return NextResponse.json(
        { message: result.json?.message || "No se pudo actualizar el usuario." },
        { status: result.status }
      );
    }

    return NextResponse.json({ ok: true, data: result.json?.data || null });
  } catch {
    return jsonError("Error al actualizar usuario.", 500);
  }
}

export async function PATCH(request, context) {
  return updateUser(request, context, "PATCH");
}

export async function PUT(request, context) {
  return updateUser(request, context, "PUT");
}

export async function DELETE(request, { params }) {
  try {
    const { userId } = await params;
    const normalizedUserId = parsePositiveInt(userId);

    if (!normalizedUserId) {
      return jsonError("El usuario es invalido.", 400);
    }

    const { viewer, gymOwnerId, error } = await requireViewer();
    if (error) {
      return error;
    }

    if (sameId(viewer.id, normalizedUserId)) {
      return jsonError("No podes eliminar tu propio usuario.", 400);
    }

    const { targetUser, error: targetError } = await loadTarget(viewer, normalizedUserId);
    if (targetError) {
      return targetError;
    }

    if (!canManageUser({ viewer, viewerGymOwnerId: gymOwnerId, targetUser })) {
      return jsonError("No tenes permisos para eliminar este usuario.", 403);
    }

    const permanent = new URL(request.url).searchParams.get("permanent") === "true";
    const path = permanent
      ? `${PATHS.users}/eliminar/${normalizedUserId}`
      : `${PATHS.users}/${normalizedUserId}`;

    const { ok, status, json } = await apiRequest(path, { token: viewer.token, method: "DELETE" });

    if (!ok) {
      return NextResponse.json(
        { message: json?.message || "No se pudo eliminar el usuario." },
        { status }
      );
    }

    return NextResponse.json({ ok: true, data: json?.data || null });
  } catch {
    return jsonError("Error al eliminar usuario.", 500);
  }
}
