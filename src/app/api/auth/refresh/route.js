import { NextResponse } from "next/server";
import { refreshWithCookie } from "@/lib/auth-service";

export async function POST() {
  try {
    const result = await refreshWithCookie();

    if (!result.ok) {
      return NextResponse.json({ message: result.message || "No autorizado." }, { status: result.status || 401 });
    }

    return NextResponse.json({ ok: true, accessToken: result.accessToken });
  } catch {
    return NextResponse.json({ message: "No se pudo refrescar la sesion." }, { status: 500 });
  }
}

