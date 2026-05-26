import { NextResponse } from "next/server";
import { callBackendLogoutCurrentSession, clearAuthCookies } from "@/lib/auth-service";

export async function POST(request) {
  await callBackendLogoutCurrentSession();
  await clearAuthCookies();
  return NextResponse.redirect(new URL("/login", request.url));
}
