import Link from "next/link";
import { cookies } from "next/headers";
import { normalizeRoleKey, parseSessionUserCookie } from "@/lib/session";
import RoleCreateForm from "@/components/roles/RoleCreateForm";

const ROLES_URL = "https://rutina360-server.onrender.com/rol";
const USERS_URL = "https://rutina360-server.onrender.com/users";
const USER_LINKS_URL = "https://rutina360-server.onrender.com/users/link";

async function getRoles(token) {
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

  return Array.isArray(json?.data) ? json.data : [];
}

async function getUsers(token) {
  const response = await fetch(USERS_URL, {
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

function isAthleteRoleName(value) {
  return ["athlete", "atleta"].includes(String(value || "").trim().toLowerCase());
}

function filterUsersByViewerRole(users, roleKey, viewerId, userLinks) {
  if (roleKey === "super_admin") {
    return users;
  }

  if (roleKey === "admin") {
    return users.filter(
      (user) => Number(user?.id) === Number(viewerId) || Number(user?.idAdminOwner) === Number(viewerId)
    );
  }

  if (roleKey === "coach") {
    const assignedAthleteIds = new Set(
      userLinks
        .filter((link) => Number(link?.idCoach) === Number(viewerId) && link?.isDeleted !== true)
        .map((link) => Number(link?.idAthlete))
    );

    return users.filter((user) => {
      if (Number(user?.id) === Number(viewerId)) {
        return true;
      }

      const roleName = user?.Rol?.name || "";
      return isAthleteRoleName(roleName) && assignedAthleteIds.has(Number(user?.id));
    });
  }

  return users;
}

function buildRoleTree(roles) {
  const childrenByParent = new Map();

  for (const role of roles) {
    const parentId = role?.parentId === null || role?.parentId === undefined ? null : Number(role.parentId);
    if (!childrenByParent.has(parentId)) {
      childrenByParent.set(parentId, []);
    }
    childrenByParent.get(parentId).push(role);
  }

  for (const [key, list] of childrenByParent.entries()) {
    list.sort((a, b) => Number(a?.id || 0) - Number(b?.id || 0));
    childrenByParent.set(key, list);
  }

  const roots = childrenByParent.get(null) || [];
  return { childrenByParent, roots };
}

function countUsersInSubtree(roleId, usersByRoleId, childrenByParent) {
  const directCount = (usersByRoleId.get(Number(roleId)) || []).length;
  const children = childrenByParent.get(Number(roleId)) || [];

  return (
    directCount +
    children.reduce((total, child) => total + countUsersInSubtree(child.id, usersByRoleId, childrenByParent), 0)
  );
}

function RoleNode({ role, level, childrenByParent, usersByRoleId }) {
  const users = usersByRoleId.get(Number(role.id)) || [];
  const children = childrenByParent.get(Number(role.id)) || [];
  const totalInSubtree = countUsersInSubtree(role.id, usersByRoleId, childrenByParent);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Rol #{role.id}</p>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">{role.name}</h3>
          <p className="mt-1 text-xs text-slate-500">
            Nivel {level + 1} | Usuarios directos: {users.length} | Usuarios en rama: {totalInSubtree}
          </p>
        </div>
        <Link
          href={`/inicio/roles-usuarios/${role.id}`}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Gestionar rol
        </Link>
      </div>

      {users.length > 0 ? (
        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
          {users.map((user) => (
            <Link
              key={user.id}
              href={`/inicio/roles-usuarios/${role.id}/${user.id}`}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <span className="font-medium text-slate-900">{user.username || `Usuario #${user.id}`}</span>
              <span className="ml-2 text-xs text-slate-500">{user.email || "Sin email"}</span>
            </Link>
          ))}
        </div>
      ) : null}

      {children.length > 0 ? (
        <div className="mt-4 space-y-3 border-l-2 border-slate-100 pl-3">
          {children.map((child) => (
            <RoleNode
              key={child.id}
              role={child}
              level={level + 1}
              childrenByParent={childrenByParent}
              usersByRoleId={usersByRoleId}
            />
          ))}
        </div>
      ) : null}
    </article>
  );
}

export default async function RolesUsuariosPage() {
  let errorMessage = "";
  let roots = [];
  let childrenByParent = new Map();
  let usersByRoleId = new Map();
  let allRoles = [];
  let canCreateRoles = false;

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    const sessionUser = parseSessionUserCookie(cookieStore.get("session_user")?.value);
    const roleKey = normalizeRoleKey(sessionUser?.roleName);
    const viewerId = Number(sessionUser?.id) || null;
    canCreateRoles = roleKey === "super_admin" && viewerId === 1;

    const [roles, users, userLinks] = await Promise.all([getRoles(token), getUsers(token), getUserLinks(token)]);
    allRoles = roles;
    const filteredUsers = filterUsersByViewerRole(users, roleKey, viewerId, userLinks);

    const tree = buildRoleTree(roles);
    roots = tree.roots;
    childrenByParent = tree.childrenByParent;

    usersByRoleId = new Map();
    for (const user of filteredUsers) {
      const userRoleId = Number(user?.idRole || user?.Rol?.id);
      if (!Number.isFinite(userRoleId)) {
        continue;
      }
      if (!usersByRoleId.has(userRoleId)) {
        usersByRoleId.set(userRoleId, []);
      }
      usersByRoleId.get(userRoleId).push(user);
    }

    for (const [roleId, roleUsers] of usersByRoleId.entries()) {
      roleUsers.sort((a, b) => String(a?.username || "").localeCompare(String(b?.username || ""), "es"));
      usersByRoleId.set(roleId, roleUsers);
    }

    if (roleKey === "coach") {
      roots = roots.filter((root) => {
        const name = String(root?.name || "").trim().toLowerCase();
        return name === "gym" || name === "gimnasio";
      });
    }
  } catch (error) {
    errorMessage = error.message;
  }

  return (
    <section className="space-y-6">
      <header className="rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Roles y usuarios</h1>
        <p className="mt-3 text-slate-600">Estructura jerarquica de roles (padres e hijos) hasta usuarios.</p>
      </header>

      {canCreateRoles ? <RoleCreateForm roles={allRoles} /> : null}

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{errorMessage}</div>
      ) : null}

      {!errorMessage && roots.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-slate-600 shadow-sm">No hay roles disponibles para tu perfil.</div>
      ) : null}

      {!errorMessage && roots.length > 0 ? (
        <div className="space-y-4">
          {roots.map((root) => (
            <RoleNode
              key={root.id}
              role={root}
              level={0}
              childrenByParent={childrenByParent}
              usersByRoleId={usersByRoleId}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
