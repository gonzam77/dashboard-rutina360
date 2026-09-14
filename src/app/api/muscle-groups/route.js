import { NextResponse } from "next/server";
import { apiRequest, PATHS } from "@/lib/backend";
import { getServerAccessToken } from "@/lib/auth-service";
import { extractArrayPayload } from "@/lib/api-response";
import { jsonError } from "@/lib/api-guard";

export async function GET() {
  try {
    const token = await getServerAccessToken();

    if (!token) {
      return jsonError("No autenticado.", 401);
    }

    const { ok, status, json } = await apiRequest(PATHS.muscleGroups, { token });

    if (!ok) {
      return NextResponse.json(
        { message: json?.message || "No se pudieron cargar los grupos musculares." },
        { status }
      );
    }

    return NextResponse.json({ data: extractArrayPayload(json) });
  } catch {
    return jsonError("Error al cargar grupos musculares.", 500);
  }
}
