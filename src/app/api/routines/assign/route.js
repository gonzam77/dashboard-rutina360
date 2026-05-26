import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getServerAccessToken } from "@/lib/auth-service";

const ASSIGN_ROUTINE_URL = "https://rutina360-server.onrender.com/routine/assign/";

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = await getServerAccessToken();
    const body = await request.json();

    const idRoutine = Number(body?.idRoutine);
    const idAthlete = Number(body?.idAthlete);

    if (!idRoutine || !idAthlete) {
      return NextResponse.json(
        { message: "idRoutine e idAthlete son obligatorios." },
        { status: 400 }
      );
    }

    const response = await fetch(ASSIGN_ROUTINE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ idRoutine, idAthlete }),
      cache: "no-store",
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { message: json?.message || "No se pudo asignar la rutina al atleta." },
        { status: response.status }
      );
    }

    return NextResponse.json({ ok: true, data: json?.data || null });
  } catch {
    return NextResponse.json({ message: "Error al asignar rutina al atleta." }, { status: 500 });
  }
}
