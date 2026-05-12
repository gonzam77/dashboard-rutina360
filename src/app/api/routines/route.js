import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { normalizeRoleKey, parseSessionUserCookie } from "@/lib/session";

const ROUTINES_URL = "https://rutina360-server.onrender.com/routine/";

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    const sessionUser = parseSessionUserCookie(cookieStore.get("session_user")?.value);
    const roleKey = normalizeRoleKey(sessionUser?.roleName);
    const body = await request.json();

    const name = body?.name?.trim();
    const idUser = Number(body?.idUser);
    const order = Number(body?.order);
    const time = Number(body?.time);
    const exercises = Array.isArray(body?.exercises) ? body.exercises : [];

    if (!name || !idUser || !order || !time || exercises.length === 0) {
      return NextResponse.json(
        { message: "name, idUser, order, time y exercises son obligatorios." },
        { status: 400 }
      );
    }

    if (roleKey !== "coach" && roleKey !== "admin") {
      return NextResponse.json(
        { message: "Solo gym o coach pueden crear rutinas." },
        { status: 403 }
      );
    }

    const response = await fetch(ROUTINES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ name, idUser, order, time, exercises }),
      cache: "no-store",
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { message: json?.message || "No se pudo crear la rutina." },
        { status: response.status }
      );
    }

    return NextResponse.json({ ok: true, data: json?.data || null });
  } catch {
    return NextResponse.json({ message: "Error al crear la rutina." }, { status: 500 });
  }
}
