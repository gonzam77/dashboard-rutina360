import { NextResponse } from "next/server";
import { callBackendLogoutAllSessions, clearAuthCookies } from "@/lib/auth-service";

export async function POST(request) {
  const result = await callBackendLogoutAllSessions();
  await clearAuthCookies();

  if (!result.ok && result.status && result.status !== 401) {
    return NextResponse.json({ message: "No se pudo cerrar todas las sesiones." }, { status: result.status });
  }

  return NextResponse.redirect(new URL("/login", request.url));
}

