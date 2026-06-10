import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getServerAccessToken } from "@/lib/auth-service";
import { apiUrl } from "@/lib/api-url";

const USERS_URL = apiUrl("/users");
const ROLES_URL = apiUrl("/rol");

function parseJwtPayload(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) {
      return null;
    }

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const normalized = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const payloadJson = Buffer.from(normalized, "base64").toString("utf8");
    return JSON.parse(payloadJson);
  } catch {
    return null;
  }
}

function getCreatorIdFromJwtPayload(payload) {
  const candidates = [payload?.idUser, payload?.userId, payload?.id, payload?.sub];

  for (const value of candidates) {
    const id = Number(value);
    if (Number.isFinite(id) && id > 0) {
      return id;
    }
  }

  return null;
}

function normalizeRoleName(value) {
  return String(value || "").trim().toLowerCase();
}

function requiresAdminOwner(roleName) {
  const name = normalizeRoleName(roleName);
  return name === "coach" || name === "atleta" || name === "athlete";
}

function requiresDni(roleName) {
  const name = normalizeRoleName(roleName);
  return name === "coach" || name === "atleta" || name === "athlete";
}

function isAdminRole(roleName) {
  const name = normalizeRoleName(roleName);
  return name === "admin" || name === "administrador" || name === "gym" || name === "gimnasio";
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

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = await getServerAccessToken();
    const body = await request.json();

    const username = body?.username?.trim().toUpperCase();
    const dni = body?.dni?.trim();
    const email = body?.email?.trim().toLowerCase();
    const password = body?.password;
    const idRole = Number(body?.idRole);
    const birthDate = body?.birthDate;
    const gender = body?.gender;
    const height = body?.height;
    const weight = body?.weight;
    const goal = body?.goal;
    const weeklyAvailability = body?.weeklyAvailability;
    const explicitAdminOwnerId = Number(body?.idAdminOwner);

    if (!username || !email || !password || !idRole) {
      return NextResponse.json(
        { message: "username, email, password e idRole son obligatorios." },
        { status: 400 }
      );
    }

    let idAdminOwner;

    const [roles, users] = await Promise.all([
      fetchList(ROLES_URL, token),
      fetchList(USERS_URL, token),
    ]);

    const targetRole = roles.find((role) => Number(role?.id) === idRole);
    const targetRoleName = targetRole?.name || "";
    const shouldRequireDni = requiresDni(targetRoleName);
    const shouldRequireBirthAndGender = !isAdminRole(targetRoleName);
    const shouldAssignOwner = requiresAdminOwner(targetRoleName);

    if (shouldRequireDni && !dni) {
      return NextResponse.json(
        { message: "dni es obligatorio para este rol." },
        { status: 400 }
      );
    }

    if (shouldRequireBirthAndGender && (!birthDate || !gender)) {
      return NextResponse.json(
        { message: "birthDate y gender son obligatorios para este rol." },
        { status: 400 }
      );
    }

    if (shouldAssignOwner) {
      if (Number.isFinite(explicitAdminOwnerId) && explicitAdminOwnerId > 0) {
        idAdminOwner = explicitAdminOwnerId;
      } else {
        const creatorPayload = parseJwtPayload(token);
        const creatorId = getCreatorIdFromJwtPayload(creatorPayload);
        const creator = users.find((user) => Number(user?.id) === Number(creatorId));
        const creatorRoleName = normalizeRoleName(creator?.Rol?.name);

        if (
          creatorRoleName === "administrador" ||
          creatorRoleName === "admin" ||
          creatorRoleName === "gym" ||
          creatorRoleName === "gimnasio"
        ) {
          idAdminOwner = creator?.id;
        } else if (creatorRoleName === "coach") {
          idAdminOwner = creator?.idAdminOwner;
        } else if (Number.isFinite(Number(creator?.idAdminOwner)) && Number(creator?.idAdminOwner) > 0) {
          idAdminOwner = Number(creator.idAdminOwner);
        } else if (Number.isFinite(Number(creator?.id)) && Number(creator.id) > 0) {
          idAdminOwner = Number(creator.id);
        }
      }

      if (!Number.isFinite(Number(idAdminOwner)) || Number(idAdminOwner) <= 0) {
        return NextResponse.json(
          { message: "No se pudo determinar el administrador owner para el nuevo usuario." },
          { status: 400 }
        );
      }
    }

    const payload = {
      username,
      email,
      password,
      idRole,
      ...(dni ? { dni } : {}),
      ...(shouldRequireBirthAndGender ? { birthDate, gender } : {}),
      ...(shouldAssignOwner ? { idAdminOwner: Number(idAdminOwner) } : {}),
      ...(height !== undefined && height !== null && height !== "" ? { height: Number(height) } : {}),
      ...(weight !== undefined && weight !== null && weight !== "" ? { weight: Number(weight) } : {}),
      ...(goal !== undefined && goal !== null && String(goal).trim() !== "" ? { goal: String(goal).trim() } : {}),
      ...(weeklyAvailability !== undefined && weeklyAvailability !== null && String(weeklyAvailability).trim() !== ""
        ? { weeklyAvailability: String(weeklyAvailability).trim() }
        : {}),
    };

    const response = await fetch(USERS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { message: json?.message || "No se pudo crear el usuario." },
        { status: response.status }
      );
    }

    return NextResponse.json({ ok: true, data: json?.data || null });
  } catch {
    return NextResponse.json({ message: "Error al crear usuario." }, { status: 500 });
  }
}
