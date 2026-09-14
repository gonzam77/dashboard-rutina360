import { NextResponse } from "next/server";
import { apiRequest, getRoles, PATHS } from "@/lib/backend";
import { jsonError, readJsonBody, requireViewer } from "@/lib/api-guard";
import { isSuperAdmin } from "@/lib/viewer";

export async function POST(request) {
  try {
    const { viewer, error } = await requireViewer();
    if (error) {
      return error;
    }

    if (!isSuperAdmin(viewer)) {
      return jsonError("Solo el Super Administrador puede crear roles.", 403);
    }

    const body = await readJsonBody(request);
    const name = String(body?.name || "").trim();
    const parentIdRaw = body?.parentId;
    const parentId =
      parentIdRaw === "" || parentIdRaw === null || parentIdRaw === undefined
        ? null
        : Number(parentIdRaw);

    if (!name) {
      return jsonError("El nombre del rol es obligatorio.", 400);
    }

    if (parentId !== null) {
      if (!Number.isFinite(parentId) || parentId <= 0) {
        return jsonError("parentId invalido.", 400);
      }

      const roles = await getRoles(viewer.token);
      if (!roles.some((role) => Number(role?.id) === parentId)) {
        return jsonError("El rol padre indicado no existe.", 400);
      }
    }

    const { ok, status, json } = await apiRequest(PATHS.roles, {
      token: viewer.token,
      method: "POST",
      body: { name, ...(parentId !== null ? { parentId } : {}) },
    });

    if (!ok) {
      return NextResponse.json({ message: json?.message || "No se pudo crear el rol." }, { status });
    }

    return NextResponse.json({ ok: true, data: json?.data || null });
  } catch {
    return jsonError("Error al crear rol.", 500);
  }
}
