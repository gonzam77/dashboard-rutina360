import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const AUTH_URL = "https://rutina360-server.onrender.com/users/auth";

function firstNonEmptyString(values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

export async function POST(request) {
  try {
    const body = await request.json();
    const username = body?.username?.trim();
    const password = body?.password;

    if (!username || !password) {
      return NextResponse.json(
        { message: "Usuario y contrasena son obligatorios." },
        { status: 400 }
      );
    }

    const authResponse = await fetch(AUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username, password }),
      cache: "no-store",
    });

    const authData = await authResponse.json().catch(() => ({}));

    if (!authResponse.ok) {
      return NextResponse.json(
        { message: authData?.message || "Credenciales invalidas." },
        { status: authResponse.status }
      );
    }

    const rawToken = authData?.data?.data?.token || authData?.data?.token || authData?.token;
    const token = typeof rawToken === "string"
      ? rawToken.replace(/^Bearer\s+/i, "").trim()
      : "";

    if (!token) {
      return NextResponse.json(
        { message: "El servidor no devolvio un token." },
        { status: 502 }
      );
    }

    const loggedUser = authData?.data?.user || authData?.user || null;
    const safeSessionUser = loggedUser
      ? {
          id: Number(loggedUser?.id) || null,
          username: firstNonEmptyString([loggedUser?.username]),
          roleName: firstNonEmptyString([loggedUser?.Rol?.name]),
          idRole: Number(loggedUser?.idRole) || null,
        }
      : null;

    const cookieStore = await cookies();
    const baseCookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    };

    cookieStore.set("token", token, baseCookieOptions);

    if (safeSessionUser) {
      cookieStore.set("session_user", encodeURIComponent(JSON.stringify(safeSessionUser)), baseCookieOptions);
    } else {
      cookieStore.delete("session_user");
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { message: "Error al iniciar sesion. Intenta nuevamente." },
      { status: 500 }
    );
  }
}
