import { NextResponse } from "next/server";
import { getViewer, getViewerGymOwnerId } from "@/lib/viewer";

export function jsonError(message, status) {
  return NextResponse.json({ message }, { status });
}

/**
 * Guardia unica para route handlers que mutan datos.
 * Falla cerrado: si no se puede determinar el rol real, no se opera.
 */
export async function requireViewer() {
  const viewer = await getViewer();

  if (!viewer) {
    return { viewer: null, gymOwnerId: null, error: jsonError("No autenticado.", 401) };
  }

  if (viewer.roleKey === "athlete") {
    return {
      viewer,
      gymOwnerId: null,
      error: jsonError("Los atletas no operan sobre el panel administrativo.", 403),
    };
  }

  if (viewer.roleKey === "unknown") {
    return {
      viewer,
      gymOwnerId: null,
      error: jsonError("No se pudo determinar tu rol. Volve a iniciar sesion.", 403),
    };
  }

  return { viewer, gymOwnerId: await getViewerGymOwnerId(), error: null };
}

/** Lee y valida el body JSON de la request. */
export async function readJsonBody(request) {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? body : {};
  } catch {
    return {};
  }
}

export function parsePositiveInt(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
