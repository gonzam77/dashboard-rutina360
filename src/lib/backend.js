import { cache } from "react";
import { apiUrl } from "@/lib/api-url";

export const PATHS = {
  users: "/users",
  userLinks: "/users/link",
  roles: "/rol",
  routines: "/routine",
  assignments: "/routine/assign",
  athleteRoutines: "/routine/assign/athlete",
  exercises: "/ejercice",
  muscleGroups: "/muscleGroup",
};

function authHeaders(token, extra) {
  return {
    ...(extra || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/**
 * Unica puerta de salida hacia el backend.
 * Devuelve siempre { ok, status, json } para que quien llama decida como fallar.
 */
export async function apiRequest(path, { token, method = "GET", body, headers } = {}) {
  const hasBody = body !== undefined && body !== null;

  const response = await fetch(apiUrl(path), {
    method,
    cache: "no-store",
    headers: authHeaders(token, {
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
      ...(headers || {}),
    }),
    ...(hasBody ? { body: JSON.stringify(body) } : {}),
  });

  const json = await response.json().catch(() => ({}));

  return { ok: response.ok, status: response.status, json };
}

/**
 * Lectura de lista memorizada por request (React cache).
 * Varias partes del arbol piden las mismas listas: con esto el backend recibe
 * una sola llamada por recurso y request, en vez de una por componente.
 * La clave de cache son (path, token), ambos primitivos.
 */
const fetchResource = cache(async (path, token) => {
  try {
    const { ok, json } = await apiRequest(path, { token });

    return {
      ok,
      data: Array.isArray(json?.data) ? json.data : [],
      message: json?.message || "",
    };
  } catch {
    return { ok: false, data: [], message: "" };
  }
});

/** Devuelve [] si el recurso no se puede leer: para datos opcionales de la vista. */
async function readList(path, token) {
  return (await fetchResource(path, token)).data;
}

/** Lanza si el recurso no se puede leer: para datos sin los que la vista no existe. */
async function readListStrict(path, token, fallbackMessage) {
  const result = await fetchResource(path, token);

  if (!result.ok) {
    throw new Error(result.message || fallbackMessage);
  }

  return result.data;
}

export const getUsers = (token) => readList(PATHS.users, token);
export const getRoles = (token) => readList(PATHS.roles, token);
export const getRoutines = (token) => readList(PATHS.routines, token);
export const getAssignments = (token) => readList(PATHS.assignments, token);
export const getUserLinks = (token) => readList(PATHS.userLinks, token);
export const getExercises = (token) => readList(PATHS.exercises, token);
export const getMuscleGroups = (token) => readList(PATHS.muscleGroups, token);

export const getUsersStrict = (token) =>
  readListStrict(PATHS.users, token, "No se pudieron cargar los usuarios.");
export const getRolesStrict = (token) =>
  readListStrict(PATHS.roles, token, "No se pudieron cargar los roles.");
export const getRoutinesStrict = (token) =>
  readListStrict(PATHS.routines, token, "No se pudieron cargar las rutinas.");
export const getAssignmentsStrict = (token) =>
  readListStrict(PATHS.assignments, token, "No se pudieron cargar las asignaciones de rutinas.");
export const getExercisesStrict = (token) =>
  readListStrict(PATHS.exercises, token, "No se pudieron cargar los ejercicios.");
export const getMuscleGroupsStrict = (token) =>
  readListStrict(PATHS.muscleGroups, token, "No se pudieron cargar los grupos musculares.");

export async function findUserById(token, userId) {
  const users = await getUsers(token);
  return users.find((user) => Number(user?.id) === Number(userId)) || null;
}

export async function findRoleById(token, roleId) {
  const roles = await getRoles(token);
  return roles.find((role) => String(role?.id) === String(roleId)) || null;
}

export async function findRoutineById(token, routineId) {
  const routines = await getRoutines(token);
  return routines.find((routine) => String(routine?.id) === String(routineId)) || null;
}

/**
 * Rutinas activas de un atleta. El backend las expone en
 * GET /routine/assign/athlete/:idAthlete con la rutina y sus ejercicios incluidos.
 * Lanza si falla, para no confundir "no pude leer" con "no tiene rutinas".
 */
export function getAthleteAssignedRoutines(token, athleteId) {
  return readListStrict(
    `${PATHS.athleteRoutines}/${athleteId}`,
    token,
    "No se pudieron cargar las rutinas asignadas al atleta."
  );
}
