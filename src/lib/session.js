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
    const decoded = decodeURIComponent(rawValue);
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
