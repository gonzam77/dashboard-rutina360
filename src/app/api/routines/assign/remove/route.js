import { NextResponse } from "next/server";
import { getServerAccessToken } from "@/lib/auth-service";
import { apiUrl } from "@/lib/api-url";

const ASSIGN_ROUTINE_URL = apiUrl("/routine/assign");

export async function PATCH(request) {
  try {
    const token = await getServerAccessToken({ allowRefresh: false });
    const body = await request.json();

    if (!token) {
      return NextResponse.json({ message: "No autenticado." }, { status: 401 });
    }

    const idRoutine = Number(body?.idRoutine);
    const idAthlete = Number(body?.idAthlete);

    if (!idRoutine || !idAthlete) {
      return NextResponse.json(
        { message: "idRoutine e idAthlete son obligatorios." },
        { status: 400 }
      );
    }

    const response = await fetch(ASSIGN_ROUTINE_URL, {
      method: "PATCH",
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
        { message: json?.message || "No se pudo eliminar la asignacion de rutina." },
        { status: response.status }
      );
    }

    return NextResponse.json({ ok: true, data: json?.data || null });
  } catch {
    return NextResponse.json(
      { message: "Error al eliminar la asignacion de rutina." },
      { status: 500 }
    );
  }
}
