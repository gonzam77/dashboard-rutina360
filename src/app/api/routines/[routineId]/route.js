import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const ROUTINES_URL = "https://rutina360-server.onrender.com/routine/";

export async function DELETE(_request, { params }) {
  try {
    const { routineId } = await params;
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    const response = await fetch(`${ROUTINES_URL}${routineId}`, {
      method: "DELETE",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { message: json?.message || "No se pudo eliminar la rutina." },
        { status: response.status }
      );
    }

    return NextResponse.json({ ok: true, data: json?.data || null });
  } catch {
    return NextResponse.json({ message: "Error al eliminar la rutina." }, { status: 500 });
  }
}
