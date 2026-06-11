import { NextResponse } from "next/server";

const ACCESS_COOKIE = "token";
const REFRESH_COOKIE = "refresh_token";
const SESSION_USER_COOKIE = "session_user";
const LOGIN_PATH = "/login";
const PROTECTED_PREFIX = "/inicio";

function parseJwtPayload(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) {
      return null;
    }

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const normalized = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(Buffer.from(normalized, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

function isTokenExpiredOrNear(token, skewSeconds = 20) {
  const payload = parseJwtPayload(token);
  const exp = Number(payload?.exp);

  if (!Number.isFinite(exp)) {
    return false;
  }

  return Date.now() >= (exp - skewSeconds) * 1000;
}

function clearAuthCookies(response) {
  for (const cookieName of [ACCESS_COOKIE, REFRESH_COOKIE, SESSION_USER_COOKIE]) {
    response.cookies.set(cookieName, "", { maxAge: 0, path: "/" });
  }
}

function redirectToLogin(request) {
  const response = NextResponse.redirect(new URL(LOGIN_PATH, request.url), 303);
  clearAuthCookies(response);
  return response;
}

export function proxy(request) {
  const { pathname, search } = request.nextUrl;

  if (!pathname.startsWith(PROTECTED_PREFIX)) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value || "";
  if (accessToken && !isTokenExpiredOrNear(accessToken)) {
    return NextResponse.next();
  }

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value || "";
  if (!refreshToken || isTokenExpiredOrNear(refreshToken, 0)) {
    return redirectToLogin(request);
  }

  const refreshUrl = new URL("/api/auth/refresh", request.url);
  refreshUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(refreshUrl, 303);
}

export const config = {
  matcher: "/inicio/:path*",
};
