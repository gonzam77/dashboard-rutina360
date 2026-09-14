const DEFAULT_SKEW_SECONDS = 20;

export function parseJwtPayload(token) {
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

export function getUserIdFromPayload(payload) {
  const candidates = [payload?.idUser, payload?.userId, payload?.id, payload?.sub];

  for (const value of candidates) {
    const id = Number(value);
    if (Number.isFinite(id) && id > 0) {
      return id;
    }
  }

  return null;
}

export function getRoleNameFromPayload(payload) {
  const candidates = [
    payload?.Rol?.name,
    payload?.role,
    payload?.rol,
    payload?.roleName,
    payload?.nombreRol,
    payload?.user?.Rol?.name,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

export function getTokenExpiry(token) {
  const exp = Number(parseJwtPayload(token)?.exp);
  return Number.isFinite(exp) ? exp : null;
}

export function isTokenExpiredOrNear(token, skewSeconds = DEFAULT_SKEW_SECONDS) {
  const exp = getTokenExpiry(token);

  if (exp === null) {
    return false;
  }

  return Date.now() >= (exp - skewSeconds) * 1000;
}

export function tokenMaxAgeSeconds(token, fallbackSeconds) {
  const exp = getTokenExpiry(token);

  if (exp === null) {
    return fallbackSeconds;
  }

  return Math.max(0, Math.floor(exp - Date.now() / 1000));
}
