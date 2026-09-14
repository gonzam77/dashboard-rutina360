import { NextResponse } from "next/server";
import { apiRequest, PATHS } from "@/lib/backend";
import { parseLoginResponseAndPersist } from "@/lib/auth-service";
import { getRoleNameFromPayload, getUserIdFromPayload, parseJwtPayload } from "@/lib/jwt";
import { getUserRoleName, normalizeRoleKey } from "@/lib/roles";
import { firstNonEmptyString } from "@/lib/session";

function extractLoggedUser(authData) {
  return (
    authData?.data?.data?.user ||
    authData?.data?.user ||
    authData?.user ||
    null
  );
}

function extractAccessToken(authData) {
  const candidates = [
    authData?.accessToken,
    authData?.token,
    authData?.data?.accessToken,
    authData?.data?.token,
    authData?.data?.data?.accessToken,
    authData?.data?.data?.token,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.replace(/^Bearer\s+/i, "").trim();
    }
  }

  return "";
}

/**
 * Resuelve el rol real del usuario que inicia sesion.
 * Se consulta al backend si ni la respuesta ni el token lo traen, para que un
 * cambio en la forma de la respuesta no deje entrar a un atleta por omision.
 */
async function resolveRole({ loggedUser, payload, accessToken, userId }) {
  const fromResponse = getUserRoleName(loggedUser);
  if (fromResponse) {
    return fromResponse;
  }

  const fromToken = getRoleNameFromPayload(payload);
  if (fromToken) {
    return fromToken;
  }

  if (!accessToken || !userId) {
    return "";
  }

  const { ok, json } = await apiRequest(PATHS.users, { token: accessToken });
  if (!ok) {
    return "";
  }

  const users = Array.isArray(json?.data) ? json.data : [];
  return getUserRoleName(users.find((user) => Number(user?.id) === Number(userId)));
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const email = body?.email?.trim().toLowerCase();
    const password = body?.password;

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email y contrasena son obligatorios." },
        { status: 400 }
      );
    }

    const { ok, status, json: authData } = await apiRequest("/users/auth", {
      method: "POST",
      body: { email, password },
    });

    if (!ok) {
      return NextResponse.json(
        { message: authData?.message || "Credenciales invalidas." },
        { status }
      );
    }

    const loggedUser = extractLoggedUser(authData);
    const accessToken = extractAccessToken(authData);
    const payload = parseJwtPayload(accessToken);
    const userId = Number(loggedUser?.id) || getUserIdFromPayload(payload);
    const roleName = await resolveRole({ loggedUser, payload, accessToken, userId });

    if (normalizeRoleKey(roleName) === "athlete") {
      return NextResponse.json(
        { message: "Acceso denegado: los atletas no pueden iniciar sesion en este panel." },
        { status: 403 }
      );
    }

    const safeSessionUser = userId
      ? {
          id: userId,
          username: firstNonEmptyString([loggedUser?.username]),
          roleName,
          idRole: Number(loggedUser?.idRole) || null,
        }
      : null;

    const persisted = await parseLoginResponseAndPersist(authData, safeSessionUser);
    if (!persisted.ok) {
      return NextResponse.json({ message: persisted.message }, { status: 502 });
    }

    // El token queda solo en la cookie httpOnly.
    return NextResponse.json({ ok: true, user: safeSessionUser });
  } catch {
    return NextResponse.json(
      { message: "Error al iniciar sesion. Intenta nuevamente." },
      { status: 500 }
    );
  }
}
