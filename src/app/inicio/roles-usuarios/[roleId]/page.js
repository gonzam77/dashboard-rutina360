import Link from "next/link";
import { cookies } from "next/headers";
import RoleUsersManager from "@/components/roles/RoleUsersManager";
import { normalizeRoleKey, parseSessionUserCookie } from "@/lib/session";

const ROLES_URL = "https://rutina360-server.onrender.com/rol";
const USERS_URL = "https://rutina360-server.onrender.com/users";
const USER_LINKS_URL = "https://rutina360-server.onrender.com/users/link";

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

async function fetchUserLinks(token) {
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

function isAthleteRoleName(value) {
  return ["athlete", "atleta"].includes(String(value || "").trim().toLowerCase());
}

function isCoachRoleName(value) {
  return String(value || "").trim().toLowerCase() === "coach";
}

function filterUsersByViewerRole(users, roleName, roleKey, viewerId, viewerAdminOwnerId, userLinks) {
  if (roleKey === "super_admin") {
    return users;
  }

  if (roleKey === "admin") {
    return users.filter((user) => {
      const userRoleName = user?.Rol?.name || "";
      if (!(isCoachRoleName(userRoleName) || isAthleteRoleName(userRoleName))) {
        return false;
      }

      return Number(user?.idAdminOwner) === Number(viewerId);
    });
  }

  if (roleKey === "coach") {
    if (!isAthleteRoleName(roleName)) {
      return [];
    }

    if (!viewerAdminOwnerId) {
      return [];
    }

    const assignedAthleteIds = new Set(
      userLinks
        .filter((link) => Number(link?.idCoach) === Number(viewerId) && link?.isDeleted !== true)
        .map((link) => String(link?.idAthlete))
    );

    return users.filter(
      (user) =>
        Number(user?.idAdminOwner) === Number(viewerAdminOwnerId) &&
        assignedAthleteIds.has(String(user?.id))
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

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    const sessionUser = parseSessionUserCookie(cookieStore.get("session_user")?.value);
    roleKey = normalizeRoleKey(sessionUser?.roleName);
    const viewerId = Number(sessionUser?.id) || null;

    const [roleResult, usersResult, fetchedViewerUser, userLinks] = await Promise.all([
      getRoleById(roleId, token),
      getUsers(roleId, token),
      getUserById(viewerId, token),
      fetchUserLinks(token),
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
      userLinks
    );
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
      <header className="rounded-2xl bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{role ? `Usuarios del rol: ${role.name}` : "Usuarios por rol"}</h1>
            <p className="mt-3 text-slate-600">{role ? `Rol #${role.id}` : `Rol #${roleId}`}</p>
          </div>
          <Link
            href="/inicio/roles-usuarios"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Volver a roles
          </Link>
          {shouldShowAssignAthleteButton ? (
            <Link
              href={`/inicio/roles-usuarios/${coachRoleId}/${viewerUser.id}`}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Asignar nuevo atleta
            </Link>
          ) : null}
        </div>
      </header>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{errorMessage}</div>
      ) : (
        <RoleUsersManager roleId={roleId} roleName={role?.name || ""} users={users} />
      )}
    </section>
  );
}
