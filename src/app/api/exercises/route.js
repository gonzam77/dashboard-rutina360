import { NextResponse } from "next/server";
import { apiRequest, PATHS } from "@/lib/backend";
import { getServerAccessToken } from "@/lib/auth-service";
import { extractArrayPayload } from "@/lib/api-response";
import { jsonError } from "@/lib/api-guard";

// ?kind=strength|functional se pasa tal cual al backend.
function kindQuery(request) {
  const kind = new URL(request.url).searchParams.get("kind");
  return kind === "strength" || kind === "functional" ? `?kind=${kind}` : "";
}

export async function GET(request) {
  try {
    const token = await getServerAccessToken();

    if (!token) {
      return jsonError("No autenticado.", 401);
    }

    const { ok, status, json } = await apiRequest(`${PATHS.exercises}${kindQuery(request)}`, { token });

    if (!ok) {
      return NextResponse.json(
        { message: json?.message || "No se pudieron cargar los ejercicios." },
        { status }
      );
    }

    return NextResponse.json({ data: extractArrayPayload(json) });
  } catch {
    return jsonError("Error al cargar ejercicios.", 500);
  }
}
