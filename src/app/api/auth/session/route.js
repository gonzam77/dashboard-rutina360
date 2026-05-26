import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getServerAccessToken } from "@/lib/auth-service";
import { parseSessionUserCookie } from "@/lib/session";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const user = parseSessionUserCookie(cookieStore.get("session_user")?.value);
    const accessToken = await getServerAccessToken();

    if (!accessToken) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      authInitializing: false,
      accessToken,
      user,
    });
  } catch {
    return NextResponse.json({ authenticated: false, authInitializing: false }, { status: 401 });
  }
}
