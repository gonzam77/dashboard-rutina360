import { NextResponse } from "next/server";
import { getServerAccessToken } from "@/lib/auth-service";
import { apiUrl } from "@/lib/api-url";
import { extractArrayPayload } from "@/lib/api-response";

const EXERCISES_URL = apiUrl("/ejercice");

export async function GET() {
  try {
    const token = await getServerAccessToken();
    const response = await fetch(EXERCISES_URL, {
      cache: "no-store",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { message: json?.message || "No se pudieron cargar los ejercicios." },
        { status: response.status }
      );
    }

    return NextResponse.json({ data: extractArrayPayload(json) });
  } catch {
    return NextResponse.json({ message: "Error al cargar ejercicios." }, { status: 500 });
  }
}
