import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const AUTH_URL = "https://rutina360-server.onrender.com/users/auth";

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

    const token = authData?.data?.token || authData?.token;

    if (!token) {
      return NextResponse.json(
        { message: "El servidor no devolvio un token." },
        { status: 502 }
      );
    }

    const cookieStore = await cookies();
    cookieStore.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { message: "Error al iniciar sesion. Intenta nuevamente." },
      { status: 500 }
    );
  }
}
