import { cookies } from "next/headers";
import { apiRequest } from "@/lib/backend";
import { isTokenExpiredOrNear, tokenMaxAgeSeconds } from "@/lib/jwt";

const ACCESS_COOKIE = "token";
const REFRESH_COOKIE = "refresh_token";
const SESSION_USER_COOKIE = "session_user";
const ACCESS_TOKEN_FALLBACK_MAX_AGE = 60 * 60 * 8;
const REFRESH_TOKEN_FALLBACK_MAX_AGE = 60 * 60 * 24 * 60;

function cookieOptions(maxAgeSeconds) {
  const secureCookies = process.env.AUTH_COOKIE_SECURE === "true";

  return {
    httpOnly: true,
    secure: secureCookies,
    sameSite: "lax",
    path: "/",
    ...(Number.isFinite(maxAgeSeconds) ? { maxAge: maxAgeSeconds } : {}),
  };
}

function firstToken(data) {
  const candidates = [
    data?.accessToken,
    data?.token,
    data?.data?.accessToken,
    data?.data?.token,
    data?.data?.data?.accessToken,
    data?.data?.data?.token,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.replace(/^Bearer\s+/i, "").trim();
    }
  }

  return "";
}

function firstRefreshToken(data) {
  const candidates = [
    data?.refreshToken,
    data?.data?.refreshToken,
    data?.data?.data?.refreshToken,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.replace(/^Bearer\s+/i, "").trim();
    }
  }

  return "";
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
  cookieStore.delete(SESSION_USER_COOKIE);
}

export async function setAuthCookies({ accessToken, refreshToken, sessionUser }) {
  const cookieStore = await cookies();
  const accessMaxAge = accessToken ? tokenMaxAgeSeconds(accessToken, ACCESS_TOKEN_FALLBACK_MAX_AGE) : 0;
  const refreshMaxAge = refreshToken ? tokenMaxAgeSeconds(refreshToken, REFRESH_TOKEN_FALLBACK_MAX_AGE) : 0;

  if (accessToken && accessMaxAge > 0) {
    cookieStore.set(ACCESS_COOKIE, accessToken, cookieOptions(accessMaxAge));
  }

  if (refreshToken && refreshMaxAge > 0) {
    cookieStore.set(REFRESH_COOKIE, refreshToken, cookieOptions(refreshMaxAge));
  }

  if (sessionUser) {
    cookieStore.set(
      SESSION_USER_COOKIE,
      JSON.stringify(sessionUser),
      cookieOptions(refreshMaxAge || REFRESH_TOKEN_FALLBACK_MAX_AGE)
    );
  }
}

export async function refreshWithCookie() {
  const cookieStore = await cookies();
  const existingRefreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

  if (!existingRefreshToken) {
    return { ok: false, status: 401, message: "No refresh token disponible." };
  }

  const { ok, status, json } = await apiRequest("/users/auth/refresh", {
    method: "POST",
    body: { refreshToken: existingRefreshToken },
  });

  if (!ok) {
    await clearAuthCookies();
    return { ok: false, status, message: json?.message || "No se pudo refrescar sesion." };
  }

  const accessToken = firstToken(json);
  const refreshToken = firstRefreshToken(json);

  if (!accessToken || !refreshToken) {
    await clearAuthCookies();
    return { ok: false, status: 502, message: "Respuesta de refresh incompleta." };
  }

  const accessMaxAge = tokenMaxAgeSeconds(accessToken, ACCESS_TOKEN_FALLBACK_MAX_AGE);
  const refreshMaxAge = tokenMaxAgeSeconds(refreshToken, REFRESH_TOKEN_FALLBACK_MAX_AGE);

  if (accessMaxAge <= 0 || refreshMaxAge <= 0) {
    await clearAuthCookies();
    return { ok: false, status: 502, message: "Respuesta de refresh vencida." };
  }

  cookieStore.set(ACCESS_COOKIE, accessToken, cookieOptions(accessMaxAge));
  cookieStore.set(REFRESH_COOKIE, refreshToken, cookieOptions(refreshMaxAge));

  return { ok: true, accessToken, refreshToken };
}

/**
 * Access token vigente.
 *
 * allowRefresh solo puede ser true en route handlers y server actions:
 * escribir cookies durante el render de un server component lanza error en Next.
 */
export async function getServerAccessToken({ allowRefresh = false } = {}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;

  if (token && !isTokenExpiredOrNear(token)) {
    return token;
  }

  if (!allowRefresh) {
    return "";
  }

  const refreshed = await refreshWithCookie();
  return refreshed.ok ? refreshed.accessToken : "";
}

export async function parseLoginResponseAndPersist(rawAuthData, safeSessionUser) {
  const accessToken = firstToken(rawAuthData);
  const refreshToken = firstRefreshToken(rawAuthData);

  if (!accessToken || !refreshToken) {
    return { ok: false, message: "El servidor no devolvio access/refresh token." };
  }

  const accessMaxAge = tokenMaxAgeSeconds(accessToken, ACCESS_TOKEN_FALLBACK_MAX_AGE);
  const refreshMaxAge = tokenMaxAgeSeconds(refreshToken, REFRESH_TOKEN_FALLBACK_MAX_AGE);

  if (accessMaxAge <= 0 || refreshMaxAge <= 0) {
    return { ok: false, message: "El servidor devolvio tokens vencidos." };
  }

  await setAuthCookies({ accessToken, refreshToken, sessionUser: safeSessionUser || null });
  return { ok: true, accessToken, refreshToken };
}

export async function callBackendLogoutCurrentSession() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

  if (!refreshToken) {
    return;
  }

  await apiRequest("/users/auth/logout", {
    method: "POST",
    body: { refreshToken },
  }).catch(() => null);
}

export async function callBackendLogoutAllSessions() {
  const token = await getServerAccessToken({ allowRefresh: true });

  if (!token) {
    return { ok: false, status: 401 };
  }

  const { ok, status } = await apiRequest("/users/auth/logout-all", {
    method: "POST",
    token,
  });

  return { ok, status };
}
