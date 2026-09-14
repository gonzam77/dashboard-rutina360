import { NextResponse } from "next/server";
import { isTokenExpiredOrNear } from "@/lib/jwt";

const ACCESS_COOKIE = "token";
const REFRESH_COOKIE = "refresh_token";
const SESSION_USER_COOKIE = "session_user";
const LOGIN_PATH = "/login";
const REFRESH_PATH = "/api/auth/refresh";
const PROTECTED_PREFIX = "/inicio";
/** Marca que ya venimos de un refresh: evita el bucle proxy -> refresh -> proxy. */
const RETRY_PARAM = "_authRetry";

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
  const { pathname, search, searchParams } = request.nextUrl;

  if (!pathname.startsWith(PROTECTED_PREFIX)) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value || "";
  const hasValidAccessToken = Boolean(accessToken) && !isTokenExpiredOrNear(accessToken);

  if (hasValidAccessToken) {
    if (!searchParams.has(RETRY_PARAM)) {
      return NextResponse.next();
    }

    // Limpia el marcador para que no quede pegado en la URL del usuario.
    const cleanUrl = new URL(request.nextUrl);
    cleanUrl.searchParams.delete(RETRY_PARAM);
    return NextResponse.redirect(cleanUrl, 303);
  }

  // Ya intentamos refrescar una vez y el token sigue sin servir: cortamos el bucle.
  if (searchParams.has(RETRY_PARAM)) {
    return redirectToLogin(request);
  }

  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value || "";
  if (!refreshToken || isTokenExpiredOrNear(refreshToken, 0)) {
    return redirectToLogin(request);
  }

  const refreshUrl = new URL(REFRESH_PATH, request.url);
  refreshUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(refreshUrl, 303);
}

export const config = {
  matcher: "/inicio/:path*",
};
