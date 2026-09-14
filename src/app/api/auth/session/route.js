import { NextResponse } from "next/server";
import { getViewer } from "@/lib/viewer";

export async function GET() {
  try {
    const viewer = await getViewer();

    if (!viewer) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Se devuelve solo lo necesario para la UI. El access token no sale de la
    // cookie httpOnly: exponerlo al JS anularia su proteccion frente a XSS.
    return NextResponse.json({
      authenticated: true,
      user: {
        id: viewer.id,
        username: viewer.username,
        roleName: viewer.roleName,
        roleKey: viewer.roleKey,
      },
    });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
}
