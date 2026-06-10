import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getServerAccessToken } from "@/lib/auth-service";
import { apiUrl } from "@/lib/api-url";

const USER_LINKS_URL = apiUrl("/users/link");

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = await getServerAccessToken();
    const body = await request.json();

    const idAthlete = Number(body?.idAthlete);
    const idCoach = Number(body?.idCoach);

    if (!idAthlete || !idCoach) {
      return NextResponse.json(
        { message: "idAthlete e idCoach son obligatorios." },
        { status: 400 }
      );
    }

    const response = await fetch(USER_LINKS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ idAthlete, idCoach }),
      cache: "no-store",
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { message: json?.message || "No se pudo crear el vinculo del atleta." },
        { status: response.status }
      );
    }

    return NextResponse.json({ ok: true, data: json?.data || null });
  } catch {
    return NextResponse.json({ message: "Error al crear vinculo del atleta." }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const cookieStore = await cookies();
    const token = await getServerAccessToken();
    const body = await request.json();

    const idAthlete = Number(body?.idAthlete);
    const idCoach = Number(body?.idCoach);

    if (!idAthlete || !idCoach) {
      return NextResponse.json(
        { message: "idAthlete e idCoach son obligatorios." },
        { status: 400 }
      );
    }

    const response = await fetch(USER_LINKS_URL, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ idAthlete, idCoach }),
      cache: "no-store",
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { message: json?.message || "No se pudo eliminar el vinculo del atleta." },
        { status: response.status }
      );
    }

    return NextResponse.json({ ok: true, data: json?.data || null });
  } catch {
    return NextResponse.json({ message: "Error al eliminar vinculo del atleta." }, { status: 500 });
  }
}
