import { NextResponse } from "next/server";
import { getServerAccessToken } from "@/lib/auth-service";
import { apiUrl } from "@/lib/api-url";

const ROLES_URL = apiUrl("/rol");

function parseJwtPayload(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) {
      return null;
    }

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const normalized = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const payloadJson = Buffer.from(normalized, "base64").toString("utf8");
    return JSON.parse(payloadJson);
  } catch {
    return null;
  }
}

function getUserIdFromPayload(payload) {
  const candidates = [payload?.idUser, payload?.userId, payload?.id, payload?.sub];

  for (const value of candidates) {
    const id = Number(value);
    if (Number.isFinite(id) && id > 0) {
      return id;
    }
  }

  return null;
}

export async function POST(request) {
  try {
    const token = await getServerAccessToken({ allowRefresh: false });

    if (!token) {
      return NextResponse.json({ message: "No autenticado." }, { status: 401 });
    }

    const payload = parseJwtPayload(token);
    const requesterId = getUserIdFromPayload(payload);

    if (requesterId !== 1) {
      return NextResponse.json(
        { message: "Solo el Super Administrador puede crear roles." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const name = String(body?.name || "").trim();
    const parentIdRaw = body?.parentId;
    const parentId =
      parentIdRaw === "" || parentIdRaw === null || parentIdRaw === undefined
        ? null
        : Number(parentIdRaw);

    if (!name) {
      return NextResponse.json({ message: "El nombre del rol es obligatorio." }, { status: 400 });
    }

    if (parentId !== null && (!Number.isFinite(parentId) || parentId <= 0)) {
      return NextResponse.json({ message: "parentId invalido." }, { status: 400 });
    }

    const response = await fetch(ROLES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name, ...(parentId !== null ? { parentId } : {}) }),
      cache: "no-store",
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { message: json?.message || "No se pudo crear el rol." },
        { status: response.status }
      );
    }

    return NextResponse.json({ ok: true, data: json?.data || null });
  } catch {
    return NextResponse.json({ message: "Error al crear rol." }, { status: 500 });
  }
}
