import { NextResponse } from "next/server";
import { apiRequest, PATHS } from "@/lib/backend";
import { jsonError } from "@/lib/api-guard";
import { authorizeAssignment } from "@/lib/assignment-guard";

export async function POST(request) {
  try {
    const { viewer, idRoutine, idAthlete, error } = await authorizeAssignment(request);
    if (error) {
      return error;
    }

    const { ok, status, json } = await apiRequest(PATHS.assignments, {
      token: viewer.token,
      method: "POST",
      body: { idRoutine, idAthlete },
    });

    if (!ok) {
      return NextResponse.json(
        { message: json?.message || "No se pudo asignar la rutina al atleta." },
        { status }
      );
    }

    return NextResponse.json({ ok: true, data: json?.data || null });
  } catch {
    return jsonError("Error al asignar rutina al atleta.", 500);
  }
}
