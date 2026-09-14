const EXACT_ROLE_NAMES = {
  super_admin: ["super admin", "super_admin", "superadmin", "super administrador"],
  admin: ["admin", "administrador", "gym", "gimnasio"],
  coach: ["coach", "entrenador"],
  athlete: ["athlete", "atleta", "alumno"],
};

const GYM_KEYWORDS = ["gym", "gimnasio"];

export function normalizeRoleName(value) {
  return String(value || "").trim().toLowerCase();
}

/**
 * Clave canonica del rol. Primero busca coincidencia exacta con los roles
 * conocidos y, si no la hay, cae a una coincidencia por palabra para tolerar
 * roles con nombres compuestos ("Administrador General", "Coach Senior").
 */
export function normalizeRoleKey(roleName) {
  const normalized = normalizeRoleName(roleName);

  if (!normalized) {
    return "unknown";
  }

  for (const [key, names] of Object.entries(EXACT_ROLE_NAMES)) {
    if (names.includes(normalized)) {
      return key;
    }
  }

  if (normalized.includes("super")) {
    return "super_admin";
  }

  if (normalized.includes("admin") || GYM_KEYWORDS.some((word) => normalized.includes(word))) {
    return "admin";
  }

  if (EXACT_ROLE_NAMES.coach.some((word) => normalized.includes(word))) {
    return "coach";
  }

  if (EXACT_ROLE_NAMES.athlete.some((word) => normalized.includes(word))) {
    return "athlete";
  }

  return "unknown";
}

export function isSuperAdminRoleName(value) {
  return normalizeRoleKey(value) === "super_admin";
}

/** Admin de gimnasio. No incluye al super admin, que no es dueno de un gym. */
export function isAdminOrGymRoleName(value) {
  return normalizeRoleKey(value) === "admin";
}

export function isCoachRoleName(value) {
  return normalizeRoleKey(value) === "coach";
}

export function isAthleteRoleName(value) {
  return normalizeRoleKey(value) === "athlete";
}

/** Distingue al gimnasio del administrador generico dentro de la clave "admin". */
export function isGymRoleName(value) {
  const normalized = normalizeRoleName(value);
  return GYM_KEYWORDS.some((word) => normalized.includes(word));
}

export function getUserRoleName(user) {
  return (
    user?.Rol?.name ||
    user?.rol?.name ||
    user?.Role?.name ||
    user?.role?.name ||
    ""
  );
}

/**
 * Id del gimnasio al que pertenece un usuario.
 * Un admin/gym es su propio dueno; el resto cuelga de idAdminOwner.
 */
export function resolveGymOwnerId(candidate) {
  if (!candidate) {
    return null;
  }

  if (isAdminOrGymRoleName(getUserRoleName(candidate))) {
    const ownId = Number(candidate?.id);
    return Number.isFinite(ownId) && ownId > 0 ? ownId : null;
  }

  const ownerId = Number(candidate?.idAdminOwner);
  if (Number.isFinite(ownerId) && ownerId > 0) {
    return ownerId;
  }

  const nestedOwnerId = Number(candidate?.adminOwner?.id);
  return Number.isFinite(nestedOwnerId) && nestedOwnerId > 0 ? nestedOwnerId : null;
}

/** Comparacion de ids tolerante a string/number, falsa para ids invalidos. */
export function sameId(a, b) {
  const left = Number(a);
  const right = Number(b);

  return Number.isFinite(left) && left > 0 && left === right;
}
