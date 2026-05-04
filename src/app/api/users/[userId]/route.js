﻿import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE = "https://rutina360-server.onrender.com/users";

export async function DELETE(request, { params }) {
  try {
    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get("permanent") === "true";

    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    const url = permanent 
      ? `${API_BASE}/eliminar/${userId}` 
      : `${API_BASE}/${userId}`;

    const response = await fetch(url, {
      method: "DELETE",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      cache: "no-store",
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { message: json?.message || "No se pudo eliminar el usuario." },
        { status: response.status }
      );
    }

    return NextResponse.json({ ok: true, data: json?.data || null });
  } catch {
    return NextResponse.json({ message: "Error al eliminar usuario." }, { status: 500 });
  }
}
