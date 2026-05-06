import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const EXERCISES_URL = "https://rutina360-server.onrender.com/ejercice";

export async function DELETE(_request, { params }) {
  try {
    const { exerciseId } = await params;
    const normalizedExerciseId = Number(exerciseId);

    if (!Number.isFinite(normalizedExerciseId) || normalizedExerciseId <= 0) {
      return NextResponse.json(
        { message: "El ejercicio es invalido." },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    const response = await fetch(`${EXERCISES_URL}/${normalizedExerciseId}`, {
      method: "DELETE",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { message: json?.message || "No se pudo eliminar el ejercicio." },
        { status: response.status }
      );
    }

    return NextResponse.json({ ok: true, data: json?.data || null });
  } catch {
    return NextResponse.json({ message: "Error al eliminar el ejercicio." }, { status: 500 });
  }
}
