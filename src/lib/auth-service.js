import { cookies } from "next/headers";

const API_BASE = "https://rutina360-server.onrender.com";
const ACCESS_COOKIE = "token";
const REFRESH_COOKIE = "refresh_token";
const SESSION_USER_COOKIE = "session_user";

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
      return value.trim();
    }
  }

  return "";
}

function parseJwtPayload(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) {
      return null;
    }

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const normalized = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const payloadJson = Buffer.from(normalized, "base64").toString("utf8");
    return JSON.parse(payloadJson);
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

export async function clearAuthCookies() {
  const cookieStore = await cookies();
  cookieStore.delete(ACCESS_COOKIE);
  cookieStore.delete(REFRESH_COOKIE);
  cookieStore.delete(SESSION_USER_COOKIE);
}

export async function setAuthCookies({ accessToken, refreshToken, sessionUser }) {
  const cookieStore = await cookies();

  if (accessToken) {
    cookieStore.set(ACCESS_COOKIE, accessToken, cookieOptions(60 * 15));
  }

  if (refreshToken) {
    cookieStore.set(REFRESH_COOKIE, refreshToken, cookieOptions(60 * 60 * 24 * 14));
  }

  if (sessionUser) {
    cookieStore.set(SESSION_USER_COOKIE, JSON.stringify(sessionUser), cookieOptions(60 * 60 * 24 * 14));
  }
}

export async function refreshWithCookie() {
  const cookieStore = await cookies();
  const existingRefreshToken = cookieStore.get(REFRESH_COOKIE)?.value;

  if (!existingRefreshToken) {
    return { ok: false, status: 401, message: "No refresh token disponible." };
  }

  const response = await fetch(`${API_BASE}/users/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: existingRefreshToken }),
    cache: "no-store",
  });

  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    await clearAuthCookies();
    return { ok: false, status: response.status, message: json?.message || "No se pudo refrescar sesion." };
  }

  const accessToken = firstToken(json);
  const refreshToken = firstRefreshToken(json);

  if (!accessToken || !refreshToken) {
    await clearAuthCookies();
    return { ok: false, status: 502, message: "Respuesta de refresh incompleta." };
  }

  cookieStore.set(ACCESS_COOKIE, accessToken, cookieOptions(60 * 15));
  cookieStore.set(REFRESH_COOKIE, refreshToken, cookieOptions(60 * 60 * 24 * 14));

  return { ok: true, accessToken, refreshToken };
}

export async function getServerAccessToken() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ACCESS_COOKIE)?.value;

  if (!token) {
    const refreshed = await refreshWithCookie();
    return refreshed.ok ? refreshed.accessToken : "";
  }

  if (isTokenExpiredOrNear(token)) {
    const refreshed = await refreshWithCookie();
    return refreshed.ok ? refreshed.accessToken : "";
  }

  return token;
}

export async function parseLoginResponseAndPersist(rawAuthData, safeSessionUser) {
  const accessToken = firstToken(rawAuthData);
  const refreshToken = firstRefreshToken(rawAuthData);

  if (!accessToken || !refreshToken) {
    return { ok: false, message: "El servidor no devolvio access/refresh token." };
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

  await fetch(`${API_BASE}/users/auth/logout`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
    cache: "no-store",
  }).catch(() => null);
}

export async function callBackendLogoutAllSessions() {
  const token = await getServerAccessToken();

  if (!token) {
    return { ok: false, status: 401 };
  }

  const response = await fetch(`${API_BASE}/users/auth/logout-all`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  return { ok: response.ok, status: response.status };
}
