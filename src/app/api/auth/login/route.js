import { NextResponse } from "next/server";
import { firstNonEmptyString } from "@/lib/session";
import { parseLoginResponseAndPersist } from "@/lib/auth-service";
import { apiUrl } from "@/lib/api-url";

const AUTH_URL = apiUrl("/users/auth");

function normalizeRoleName(value) {
  return String(value || "").trim().toLowerCase();
}

function isAthleteRole(value) {
  const roleName = normalizeRoleName(value);
  return roleName === "athlete" || roleName === "atleta";
}

export async function POST(request) {
  try {
    const body = await request.json();
    const email = body?.email?.trim().toLowerCase();
    const password = body?.password;

    if (!email || !password) {
      return NextResponse.json(
        { message: "Email y contrasena son obligatorios." },
        { status: 400 }
      );
    }

    const authResponse = await fetch(AUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, password }),
      cache: "no-store",
    });

    const authData = await authResponse.json().catch(() => ({}));

    if (!authResponse.ok) {
      return NextResponse.json(
        { message: authData?.message || "Credenciales invalidas." },
        { status: authResponse.status }
      );
    }

    const loggedUser = authData?.data?.data?.user || authData?.data?.user || authData?.user || null;
    const safeSessionUser = loggedUser
      ? {
          id: Number(loggedUser?.id) || null,
          username: firstNonEmptyString([loggedUser?.username]),
          roleName: firstNonEmptyString([loggedUser?.Rol?.name]),
          idRole: Number(loggedUser?.idRole) || null,
        }
      : null;

    if (isAthleteRole(safeSessionUser?.roleName)) {
      return NextResponse.json(
        { message: "Acceso denegado: los atletas no pueden iniciar sesion en este panel." },
        { status: 403 }
      );
    }

    const persisted = await parseLoginResponseAndPersist(authData, safeSessionUser);
    if (!persisted.ok) {
      return NextResponse.json({ message: persisted.message }, { status: 502 });
    }

    return NextResponse.json({ ok: true, accessToken: persisted.accessToken, user: safeSessionUser });
  } catch {
    return NextResponse.json(
      { message: "Error al iniciar sesion. Intenta nuevamente." },
      { status: 500 }
    );
  }
}
