﻿import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const USERS_URL = "https://rutina360-server.onrender.com/users";

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    const body = await request.json();

    const username = body?.username?.trim();
    const email = body?.email?.trim();
    const password = body?.password;
    const idRole = Number(body?.idRole);
    const birthDate = body?.birthDate;
    const gender = body?.gender;
    const height = body?.height;
    const weight = body?.weight;
    const goal = body?.goal;
    const weeklyAvailability = body?.weeklyAvailability;

    if (!username || !email || !password || !idRole || !birthDate || !gender) {
      return NextResponse.json(
        { message: "username, email, password, idRole, birthDate y gender son obligatorios." },
        { status: 400 }
      );
    }

    const payload = {
      username,
      email,
      password,
      idRole,
      birthDate,
      gender,
      ...(height !== undefined && height !== null && height !== "" ? { height: Number(height) } : {}),
      ...(weight !== undefined && weight !== null && weight !== "" ? { weight: Number(weight) } : {}),
      ...(goal !== undefined && goal !== null && String(goal).trim() !== "" ? { goal: String(goal).trim() } : {}),
      ...(weeklyAvailability !== undefined && weeklyAvailability !== null && String(weeklyAvailability).trim() !== ""
        ? { weeklyAvailability: String(weeklyAvailability).trim() }
        : {}),
    };

    const response = await fetch(USERS_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const json = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { message: json?.message || "No se pudo crear el usuario." },
        { status: response.status }
      );
    }

    return NextResponse.json({ ok: true, data: json?.data || null });
  } catch {
    return NextResponse.json({ message: "Error al crear usuario." }, { status: 500 });
  }
}
