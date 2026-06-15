import Link from "next/link";
import { cookies } from "next/headers";
import { getServerAccessToken } from "@/lib/auth-service";
import RoleUsersManager from "@/components/roles/RoleUsersManager";
import { normalizeRoleKey, parseSessionUserCookie } from "@/lib/session";
import { apiUrl } from "@/lib/api-url";

const ROLES_URL = apiUrl("/rol");
const USERS_URL = apiUrl("/users");
const USER_LINKS_URL = apiUrl("/users/link");
const ASSIGNMENTS_URL = apiUrl("/routine/assign");

async function getRoleById(roleId, token) {
  const response = await fetch(ROLES_URL, {
    cache: "no-store",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(json?.message || "No se pudieron cargar los roles.");
  }

  const roles = Array.isArray(json?.data) ? json.data : [];
  return roles.find((role) => String(role.id) === String(roleId)) || null;
}

async function fetchUsersFrom(url, token) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    return null;
  }

  const json = await response.json().catch(() => ({}));
  return Array.isArray(json?.data) ? json.data : [];
}

async function getUsers(roleId, token) {
  const candidates = [`${USERS_URL}/role/${roleId}`, `${USERS_URL}?idRole=${roleId}`, USERS_URL];

  for (const url of candidates) {
    const users = await fetchUsersFrom(url, token);
    if (users) {
      return users;
    }
  }

  return [];
}

async function getUserById(userId, token) {
  if (!userId) {
    return null;
  }

  const users = await fetchUsersFrom(USERS_URL, token);
  if (!users) {
    return null;
  }

  return users.find((user) => Number(user?.id) === Number(userId)) || null;
}

async function getUserLinks(token) {
  const response = await fetch(USER_LINKS_URL, {
    cache: "no-store",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    return [];
  }

  const json = await response.json().catch(() => ({}));
  return Array.isArray(json?.data) ? json.data : [];
}

async function getRoutineAssignments(token) {
  const response = await fetch(ASSIGNMENTS_URL, {
    cache: "no-store",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    return [];
  }

  const json = await response.json().catch(() => ({}));
  return Array.isArray(json?.data) ? json.data : [];
}


function isAthleteRoleName(value) {
  return ["athlete", "atleta"].includes(String(value || "").trim().toLowerCase());
}

function isCoachRoleName(value) {
  return String(value || "").trim().toLowerCase() === "coach";
}

function filterUsersByViewerRole(users, roleName, roleKey, viewerId, viewerAdminOwnerId) {
  if (roleKey === "super_admin") {
    return users;
  }

  if (roleKey === "admin") {
    return users.filter((user) => {
      const userRoleName = user?.Rol?.name || "";
      if (!(isCoachRoleName(userRoleName) || isAthleteRoleName(userRoleName))) {
        return false;
      }

      return (
        Number(user?.idAdminOwner) === Number(viewerId) ||
        Number(user?.adminOwner?.id) === Number(viewerId)
      );
    });
  }

  if (roleKey === "coach") {
    if (!isAthleteRoleName(roleName)) {
      return [];
    }

    if (!viewerAdminOwnerId) {
      return [];
    }

    return users.filter(
      (user) =>
        Number(user?.idAdminOwner) === Number(viewerAdminOwnerId) ||
        Number(user?.adminOwner?.id) === Number(viewerAdminOwnerId)
    );
  }

  return users;
}

export default async function RolUsuariosDetallePage({ params }) {
  const { roleId } = await params;

  let role = null;
  let users = [];
  let errorMessage = "";
  let roleKey = "unknown";
  let viewerUser = null;
  let coachRoleId = null;
  let gymOwners = [];
  let athleteCoachLabelsByUserId = {};
  let athleteAssignedRoutinesCountByUserId = {};

  try {
    const cookieStore = await cookies();
    const token = await getServerAccessToken();

    if (!token) {
      throw new Error("No autenticado.");
    }

    const sessionUser = parseSessionUserCookie(cookieStore.get("session_user")?.value);
    roleKey = normalizeRoleKey(sessionUser?.roleName);
    const viewerId = Number(sessionUser?.id) || null;

    const [roleResult, usersResult, allUsers, fetchedViewerUser, userLinks, routineAssignments] = await Promise.all([
      getRoleById(roleId, token),
      getUsers(roleId, token),
      fetchUsersFrom(USERS_URL, token),
      getUserById(viewerId, token),
      getUserLinks(token),
      getRoutineAssignments(token),
    ]);
    role = roleResult;
    viewerUser = fetchedViewerUser;
    const viewerAdminOwnerId = Number(viewerUser?.idAdminOwner) || null;
    coachRoleId = Number(viewerUser?.idRole) || Number(viewerUser?.Rol?.id) || null;

    const usersInRole = usersResult.filter((user) => {
      const sameIdRole = String(user?.idRole) === String(roleId);
      const sameNestedRole = String(user?.Rol?.id) === String(roleId);
      return sameIdRole || sameNestedRole;
    });

    users = filterUsersByViewerRole(
      usersInRole,
      role?.name || "",
      roleKey,
      viewerId,
      viewerAdminOwnerId,
    );

    if (roleKey === "super_admin") {
      const sourceUsers = Array.isArray(allUsers) ? allUsers : [];
      gymOwners = sourceUsers
        .filter((candidate) => ["admin", "administrador", "gym", "gimnasio"].includes(String(candidate?.Rol?.name || "").trim().toLowerCase()))
        .map((candidate) => ({
          id: candidate.id,
          username: candidate.username || `Gym #${candidate.id}`,
          email: candidate.email || "",
        }))
        .sort((a, b) => String(a.username).localeCompare(String(b.username), "es"));
    }

    if (isAthleteRoleName(role?.name || "")) {
      const sourceUsers = Array.isArray(allUsers) ? allUsers : [];
      const coachNameById = new Map(
        sourceUsers.map((candidate) => [
          String(candidate?.id),
          candidate?.username || candidate?.email || `Coach #${candidate?.id}`,
        ])
      );

      const labelsByAthleteId = new Map();
      for (const link of Array.isArray(userLinks) ? userLinks : []) {
        if (link?.isDeleted === true || link?.isActive === false) {
          continue;
        }

        const athleteId = Number(link?.idAthlete || link?.athlete?.id);
        const coachId = Number(link?.idCoach || link?.coach?.id);
        if (!Number.isFinite(athleteId) || athleteId <= 0 || !Number.isFinite(coachId) || coachId <= 0) {
          continue;
        }

        const coachLabel =
          link?.coach?.username ||
          link?.coach?.email ||
          coachNameById.get(String(coachId)) ||
          `Coach #${coachId}`;

        if (!labelsByAthleteId.has(String(athleteId))) {
          labelsByAthleteId.set(String(athleteId), new Set());
        }
        labelsByAthleteId.get(String(athleteId)).add(String(coachLabel));
      }

      athleteCoachLabelsByUserId = Object.fromEntries(
        Array.from(labelsByAthleteId.entries()).map(([athleteId, labels]) => [
          athleteId,
          Array.from(labels).slice(0, 2),
        ])
      );

      const routineIdsByAthleteId = new Map();
      for (const assignment of Array.isArray(routineAssignments) ? routineAssignments : []) {
        if (assignment?.isDeleted === true || assignment?.isActive === false) {
          continue;
        }

        const athleteId = Number(assignment?.idAthlete || assignment?.athlete?.id);
        const routineId = Number(assignment?.idRoutine || assignment?.Routine?.id);
        if (!Number.isFinite(athleteId) || athleteId <= 0 || !Number.isFinite(routineId) || routineId <= 0) {
          continue;
        }

        if (!routineIdsByAthleteId.has(String(athleteId))) {
          routineIdsByAthleteId.set(String(athleteId), new Set());
        }
        routineIdsByAthleteId.get(String(athleteId)).add(String(routineId));
      }

      athleteAssignedRoutinesCountByUserId = Object.fromEntries(
        Array.from(routineIdsByAthleteId.entries()).map(([athleteId, routineIds]) => [
          athleteId,
          routineIds.size,
        ])
      );
    }
  } catch (error) {
    errorMessage = error.message;
  }

  const shouldShowAssignAthleteButton =
    roleKey === "coach" &&
    isAthleteRoleName(role?.name || "") &&
    viewerUser &&
    coachRoleId;

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-white/15 bg-[#0f2a46] p-8 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white">{role ? `Usuarios del rol: ${role.name}` : "Usuarios por rol"}</h1>
            <p className="mt-3 text-white/80">{role ? `Rol #${role.id}` : `Rol #${roleId}`}</p>
          </div>
          <Link
            href="/inicio/roles-usuarios"
            className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            Volver a roles
          </Link>
          {shouldShowAssignAthleteButton ? (
            <Link
              href={`/inicio/roles-usuarios/${coachRoleId}/${viewerUser.id}`}
              className="rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/20"
            >
              Asignar nuevo atleta
            </Link>
          ) : null}
        </div>
      </header>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-300/40 bg-red-950/40 p-4 text-red-200">{errorMessage}</div>
      ) : (
        <RoleUsersManager
          roleId={roleId}
          roleName={role?.name || ""}
          users={users}
          viewerRoleKey={roleKey}
          gymOwners={gymOwners}
          athleteCoachLabelsByUserId={athleteCoachLabelsByUserId}
          athleteAssignedRoutinesCountByUserId={athleteAssignedRoutinesCountByUserId}
        />
      )}
    </section>
  );
}
