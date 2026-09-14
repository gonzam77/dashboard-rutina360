import { cache } from "react";
import { getServerAccessToken } from "@/lib/auth-service";
import { findUserById } from "@/lib/backend";
import { getRoleNameFromPayload, getUserIdFromPayload, parseJwtPayload } from "@/lib/jwt";
import {
  getUserRoleName,
  isAthleteRoleName,
  isCoachRoleName,
  isGymRoleName,
  normalizeRoleKey,
  resolveGymOwnerId,
  sameId,
} from "@/lib/roles";

/**
 * Identidad del usuario autenticado.
 *
 * Se deriva SIEMPRE del access token (y, si el token no trae el rol, del
 * registro del backend). Nunca de la cookie session_user, que el navegador
 * puede modificar y por lo tanto no sirve para decidir permisos.
 *
 * No refresca el token: en server components escribir cookies no esta
 * permitido. El refresh lo hacen el proxy y /api/auth/refresh.
 */
export const getViewer = cache(async () => {
  const token = await getServerAccessToken({ allowRefresh: false });

  if (!token) {
    return null;
  }

  const payload = parseJwtPayload(token);
  const id = getUserIdFromPayload(payload);

  if (!id) {
    return null;
  }

  const roleFromToken = getRoleNameFromPayload(payload);

  if (roleFromToken) {
    return buildViewer({ token, id, roleName: roleFromToken, payload });
  }

  const record = await findUserById(token, id);

  return buildViewer({
    token,
    id,
    roleName: getUserRoleName(record),
    payload,
    record,
  });
});

function buildViewer({ token, id, roleName, payload, record = null }) {
  return {
    token,
    id,
    roleName,
    roleKey: normalizeRoleKey(roleName),
    isGym: isGymRoleName(roleName),
    username: record?.username || payload?.username || payload?.name || "",
    roleId: Number(record?.idRole || record?.Rol?.id) || null,
  };
}

/** Registro completo del usuario autenticado (una sola lectura por request). */
export const getViewerRecord = cache(async () => {
  const viewer = await getViewer();

  if (!viewer) {
    return null;
  }

  return findUserById(viewer.token, viewer.id);
});

/** Gimnasio al que pertenece quien mira: para admin/gym es su propio id. */
export const getViewerGymOwnerId = cache(async () => {
  const viewer = await getViewer();

  if (!viewer) {
    return null;
  }

  if (viewer.roleKey === "admin") {
    return viewer.id;
  }

  return resolveGymOwnerId(await getViewerRecord());
});

export function isSuperAdmin(viewer) {
  return viewer?.roleKey === "super_admin";
}

export function isGymAdmin(viewer) {
  return viewer?.roleKey === "admin";
}

export function isCoach(viewer) {
  return viewer?.roleKey === "coach";
}

/** Un admin/gym alcanza a los usuarios de su gimnasio; un coach, a sus atletas. */
export function canManageUser({ viewer, viewerGymOwnerId, targetUser }) {
  if (!viewer || !targetUser) {
    return false;
  }

  if (sameId(viewer.id, targetUser.id)) {
    return true;
  }

  if (isSuperAdmin(viewer)) {
    return true;
  }

  const targetGymOwnerId = resolveGymOwnerId(targetUser);

  if (isGymAdmin(viewer)) {
    return sameId(targetGymOwnerId, viewer.id);
  }

  if (isCoach(viewer)) {
    return (
      isAthleteRoleName(getUserRoleName(targetUser)) &&
      sameId(targetGymOwnerId, viewerGymOwnerId)
    );
  }

  return false;
}

export function canCreateUserWithRole({ viewer, roleName }) {
  if (!viewer) {
    return false;
  }

  if (isSuperAdmin(viewer)) {
    return true;
  }

  if (isGymAdmin(viewer)) {
    return isCoachRoleName(roleName) || isAthleteRoleName(roleName);
  }

  if (isCoach(viewer)) {
    return isAthleteRoleName(roleName);
  }

  return false;
}

/**
 * Gimnasio dueno del usuario que se esta creando.
 * Solo el super admin puede elegirlo; el resto crea dentro de su propio gym.
 */
export function resolveAdminOwnerForNewUser({ viewer, viewerGymOwnerId, requestedAdminOwnerId }) {
  if (isSuperAdmin(viewer)) {
    const requested = Number(requestedAdminOwnerId);
    return Number.isFinite(requested) && requested > 0 ? requested : null;
  }

  if (isGymAdmin(viewer)) {
    return viewer.id;
  }

  const gymOwnerId = Number(viewerGymOwnerId);
  return Number.isFinite(gymOwnerId) && gymOwnerId > 0 ? gymOwnerId : null;
}

export function canManageRoutine({ viewer, routine, routineOwner }) {
  if (!viewer || !routine) {
    return false;
  }

  if (isSuperAdmin(viewer)) {
    return true;
  }

  const ownerId = Number(routine?.idUser) || Number(routineOwner?.id) || null;

  if (sameId(ownerId, viewer.id)) {
    return true;
  }

  // El gym administra tambien las rutinas de los coaches que le pertenecen.
  if (isGymAdmin(viewer)) {
    return sameId(resolveGymOwnerId(routineOwner), viewer.id);
  }

  return false;
}

/** Una rutina es asignable si vive dentro del mismo gimnasio que el atleta. */
export function canAssignRoutineToAthlete({
  viewer,
  viewerGymOwnerId,
  routine,
  routineOwner,
  athlete,
}) {
  if (!canManageUser({ viewer, viewerGymOwnerId, targetUser: athlete })) {
    return false;
  }

  if (isSuperAdmin(viewer)) {
    return true;
  }

  const ownerId = Number(routine?.idUser) || Number(routineOwner?.id) || null;

  if (sameId(ownerId, viewer.id)) {
    return true;
  }

  const athleteGymOwnerId = resolveGymOwnerId(athlete);
  const routineGymOwnerId = resolveGymOwnerId(routineOwner);

  return sameId(routineGymOwnerId, athleteGymOwnerId) || sameId(ownerId, athleteGymOwnerId);
}

export function canLinkAthleteToCoach({ viewer, viewerGymOwnerId, athlete, coach }) {
  if (!viewer || !athlete || !coach) {
    return false;
  }

  if (!isAthleteRoleName(getUserRoleName(athlete)) || !isCoachRoleName(getUserRoleName(coach))) {
    return false;
  }

  // Un coach solo se vincula atletas a si mismo.
  if (isCoach(viewer) && !sameId(coach.id, viewer.id)) {
    return false;
  }

  return (
    canManageUser({ viewer, viewerGymOwnerId, targetUser: athlete }) &&
    canManageUser({ viewer, viewerGymOwnerId, targetUser: coach })
  );
}

export function canManageExerciseCatalog(viewer) {
  return isSuperAdmin(viewer) || isGymAdmin(viewer);
}

/**
 * El catalogo de grupos musculares es transversal al sistema: lo edita el super
 * admin y el administrador generico, nunca un gimnasio, coach o atleta.
 */
export function canManageMuscleGroupCatalog(viewer) {
  return isSuperAdmin(viewer) || (isGymAdmin(viewer) && !viewer?.isGym);
}
