import { NextResponse } from "next/server";
import { apiRequest, getRoles, PATHS } from "@/lib/backend";
import { jsonError, readJsonBody, requireViewer } from "@/lib/api-guard";
import { isAdminOrGymRoleName, isAthleteRoleName, isCoachRoleName } from "@/lib/roles";
import { canCreateUserWithRole, isSuperAdmin, resolveAdminOwnerForNewUser } from "@/lib/viewer";

/** Coaches y atletas siempre pertenecen a un gimnasio. */
function requiresAdminOwner(roleName) {
  return isCoachRoleName(roleName) || isAthleteRoleName(roleName);
}

function requiresDni(roleName) {
  return isCoachRoleName(roleName) || isAthleteRoleName(roleName);
}

function requiresBirthAndGender(roleName) {
  return !isAdminOrGymRoleName(roleName);
}

export async function POST(request) {
  try {
    const { viewer, gymOwnerId, error } = await requireViewer();
    if (error) {
      return error;
    }

    const body = await readJsonBody(request);

    const username = body?.username?.trim().toUpperCase();
    const dni = body?.dni?.trim();
    const email = body?.email?.trim().toLowerCase();
    const password = body?.password;
    const idRole = Number(body?.idRole);
    const { birthDate, gender, height, weight, goal, weeklyAvailability } = body;

    if (!username || !email || !password || !idRole) {
      return jsonError("username, email, password e idRole son obligatorios.", 400);
    }

    const roles = await getRoles(viewer.token);
    const targetRole = roles.find((role) => Number(role?.id) === idRole);

    if (!targetRole) {
      return jsonError("El rol indicado no existe.", 400);
    }

    const targetRoleName = targetRole.name || "";

    if (!canCreateUserWithRole({ viewer, roleName: targetRoleName })) {
      return jsonError(`Tu rol no puede crear usuarios con el rol ${targetRoleName}.`, 403);
    }

    if (requiresDni(targetRoleName) && !dni) {
      return jsonError("dni es obligatorio para este rol.", 400);
    }

    const needsBirthAndGender = requiresBirthAndGender(targetRoleName);
    if (needsBirthAndGender && (!birthDate || !gender)) {
      return jsonError("birthDate y gender son obligatorios para este rol.", 400);
    }

    const needsAdminOwner = requiresAdminOwner(targetRoleName);
    let idAdminOwner = null;

    if (needsAdminOwner) {
      idAdminOwner = resolveAdminOwnerForNewUser({
        viewer,
        viewerGymOwnerId: gymOwnerId,
        requestedAdminOwnerId: body?.idAdminOwner,
      });

      if (!idAdminOwner) {
        return jsonError(
          isSuperAdmin(viewer)
            ? "Debes indicar el gimnasio (idAdminOwner) al que pertenece el usuario."
            : "No se pudo determinar tu gimnasio para crear el usuario.",
          400
        );
      }
    }

    const payload = {
      username,
      email,
      password,
      idRole,
      ...(dni ? { dni } : {}),
      ...(needsBirthAndGender ? { birthDate, gender } : {}),
      ...(needsAdminOwner ? { idAdminOwner } : {}),
      ...(height !== undefined && height !== null && height !== "" ? { height: Number(height) } : {}),
      ...(weight !== undefined && weight !== null && weight !== "" ? { weight: Number(weight) } : {}),
      ...(goal !== undefined && goal !== null && String(goal).trim() !== ""
        ? { goal: String(goal).trim() }
        : {}),
      ...(weeklyAvailability !== undefined &&
      weeklyAvailability !== null &&
      String(weeklyAvailability).trim() !== ""
        ? { weeklyAvailability: String(weeklyAvailability).trim() }
        : {}),
    };

    const { ok, status, json } = await apiRequest(PATHS.users, {
      token: viewer.token,
      method: "POST",
      body: payload,
    });

    if (!ok) {
      return NextResponse.json(
        { message: json?.message || "No se pudo crear el usuario." },
        { status }
      );
    }

    return NextResponse.json({ ok: true, data: json?.data || null });
  } catch {
    return jsonError("Error al crear usuario.", 500);
  }
}
