import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const API_BASE = "https://rutina360-server.onrender.com/users";

async function tryDelete(url, token) {
  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    cache: "no-store",
  });

  const json = await response.json().catch(() => ({}));
  return { response, json };
}

export async function DELETE(request, { params }) {
  try {
    const { userId } = await params;
    const { searchParams } = new URL(request.url);
    const permanent = searchParams.get("permanent") === "true";
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    const attempts = permanent
      ? [`${API_BASE}/eliminar/${userId}`]
      : [`${API_BASE}/${userId}`];

    let lastError = "No se pudo eliminar el usuario.";

    for (const url of attempts) {
      const { response, json } = await tryDelete(url, token);
      if (response.ok) {
        return NextResponse.json({ ok: true, data: json?.data || null });
      }
      lastError = json?.message || lastError;
      if (!permanent) {
        return NextResponse.json({ message: lastError }, { status: response.status });
      }
    }

    return NextResponse.json({ message: lastError }, { status: 400 });
  } catch {
    return NextResponse.json({ message: "Error al eliminar usuario." }, { status: 500 });
  }
}
