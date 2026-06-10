export function firstNonEmptyString(values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

export function parseSessionUserCookie(rawValue) {
  if (!rawValue) {
    return null;
  }

  try {
    let decoded = rawValue;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const nextDecoded = decodeURIComponent(decoded);
      if (nextDecoded === decoded) {
        break;
      }
      decoded = nextDecoded;
    }

    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

export function normalizeRoleKey(roleName) {
  const normalized = String(roleName || "").trim().toLowerCase();

  if (normalized.includes("super") && normalized.includes("admin")) {
    return "super_admin";
  }

  if (
    normalized === "admin" ||
    normalized === "administrador" ||
    normalized === "gym" ||
    normalized === "gimnasio"
  ) {
    return "admin";
  }

  if (normalized === "coach") {
    return "coach";
  }

  if (normalized === "athlete" || normalized === "atleta") {
    return "athlete";
  }

  return "unknown";
}
