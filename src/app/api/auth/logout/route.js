import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request) {
  const cookieStore = await cookies();
  cookieStore.delete("token");
  cookieStore.delete("session_user");

  return NextResponse.redirect(new URL("/login", request.url));
}
