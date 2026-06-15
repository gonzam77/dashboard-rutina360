import { NextResponse } from "next/server";
import { getServerAccessToken } from "@/lib/auth-service";
import { apiUrl } from "@/lib/api-url";
import { extractArrayPayload } from "@/lib/api-response";

const MUSCLE_GROUPS_URL = apiUrl("/muscleGroup");

export async function GET() {
  try {
    const token = await getServerAccessToken({ allowRefresh: false });

    if (!token) {
      return NextResponse.json({ message: "No autenticado." }, { status: 401 });
    }

    const response = await fetch(MUSCLE_GROUPS_URL, {
      cache: "no-store",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { message: json?.message || "No se pudieron cargar los grupos musculares." },
        { status: response.status }
      );
    }

    return NextResponse.json({ data: extractArrayPayload(json) });
  } catch {
    return NextResponse.json({ message: "Error al cargar grupos musculares." }, { status: 500 });
  }
}
