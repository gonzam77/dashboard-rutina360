import { NextResponse } from "next/server";
import { getServerAccessToken } from "@/lib/auth-service";
import { apiUrl } from "@/lib/api-url";

const API_BASE = apiUrl("/users");
const ROLES_URL = apiUrl("/rol");

function normalizeRoleName(value) {
  return String(value || "").trim().toLowerCase();
}

function isAdminRole(roleName) {
  const name = normalizeRoleName(roleName);
  return name === "admin" || name === "administrador" || name === "gym" || name === "gimnasio";
}

function isAthleteRole(roleName) {
  const name = normalizeRoleName(roleName);
  return name === "athlete" || name === "atleta";
}

function isCoachRole(roleName) {
  return normalizeRoleName(roleName) === "coach";
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

async function sendUserUpdate(userId, payload, token, method) {
  return fetch(`${API_BASE}/${userId}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
}

async function updateUser(request, { params }, preferredMethod) {
  try {
    const { userId } = await params;
    const normalizedUserId = Number(userId);

    if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) {
      return NextResponse.json({ message: "El usuario es invalido." }, { status: 400 });
    }

    const body = await request.json();
    const token = await getServerAccessToken({ allowRefresh: false });

    if (!token) {
      return NextResponse.json({ message: "No autenticado." }, { status: 401 });
    }

    const [users, roles] = await Promise.all([fetchList(API_BASE, token), fetchList(ROLES_URL, token)]);
    const currentUser = users.find((item) => Number(item?.id) === normalizedUserId);

    if (!currentUser) {
      return NextResponse.json({ message: "No se encontro el usuario a actualizar." }, { status: 404 });
    }

    const currentRoleId = Number(currentUser?.idRole || currentUser?.Rol?.id);
    const role = roles.find((item) => Number(item?.id) === currentRoleId);
    const roleName = role?.name || currentUser?.Rol?.name || "";
    const shouldRequireDni = isAthleteRole(roleName) || isCoachRole(roleName);
    const shouldRequireBirthAndGender = !isAdminRole(roleName);
    const shouldRequireAthleteData = isAthleteRole(roleName);

    const username = String(body?.username || "").trim().toUpperCase();
    const dni = String(body?.dni || "").trim();
    const email = String(body?.email || "").trim().toLowerCase();
    const birthDate = body?.birthDate;
    const gender = body?.gender;
    const password = String(body?.password || "").trim();
    const phone = String(body?.phone || "").trim();
    const address = String(body?.address || "").trim();
    const height = body?.height;
    const weight = body?.weight;
    const goal = String(body?.goal || "").trim();
    const weeklyAvailability = String(body?.weeklyAvailability || "").trim();

    if (!username || !email) {
      return NextResponse.json({ message: "username y email son obligatorios." }, { status: 400 });
    }

    if (shouldRequireDni && !dni) {
      return NextResponse.json({ message: "dni es obligatorio para este rol." }, { status: 400 });
    }

    if (shouldRequireBirthAndGender && (!birthDate || !gender)) {
      return NextResponse.json(
        { message: "birthDate y gender son obligatorios para este rol." },
        { status: 400 }
      );
    }

    if (shouldRequireAthleteData) {
      const parsedHeight = Number(height);
      const parsedWeight = Number(weight);
      if (
        !Number.isFinite(parsedHeight) ||
        parsedHeight <= 0 ||
        !Number.isFinite(parsedWeight) ||
        parsedWeight <= 0 ||
        !weeklyAvailability
      ) {
        return NextResponse.json(
          { message: "height, weight y weeklyAvailability son obligatorios para atletas." },
          { status: 400 }
        );
      }
    }

    const payload = {
      username,
      email,
      ...(dni ? { dni } : {}),
      ...(password ? { password } : {}),
      ...(phone ? { phone } : {}),
      ...(address ? { address } : {}),
      ...(shouldRequireBirthAndGender ? { birthDate, gender } : {}),
      ...(shouldRequireAthleteData
        ? {
            height: Number(height),
            weight: Number(weight),
            ...(goal ? { goal } : {}),
            weeklyAvailability,
          }
        : {}),
    };

    const fallbackMethod = preferredMethod === "PATCH" ? "PUT" : "PATCH";
    let response = await sendUserUpdate(normalizedUserId, payload, token, preferredMethod);
    if (response.status === 404 || response.status === 405) {
      response = await sendUserUpdate(normalizedUserId, payload, token, fallbackMethod);
    }

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { message: json?.message || "No se pudo actualizar el usuario." },
        { status: response.status }
      );
    }

    return NextResponse.json({ ok: true, data: json?.data || null });
  } catch {
    return NextResponse.json({ message: "Error al actualizar usuario." }, { status: 500 });
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
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get("permanent") === "true";

    const token = await getServerAccessToken({ allowRefresh: false });

    if (!token) {
      return NextResponse.json({ message: "No autenticado." }, { status: 401 });
    }

    const url = permanent 
      ? `${API_BASE}/eliminar/${userId}` 
      : `${API_BASE}/${userId}`;

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { message: json?.message || "No se pudo eliminar el usuario." },
        { status: response.status }
      );
    }

    return NextResponse.json({ ok: true, data: json?.data || null });
  } catch {
    return NextResponse.json({ message: "Error al eliminar usuario." }, { status: 500 });
  }
}
