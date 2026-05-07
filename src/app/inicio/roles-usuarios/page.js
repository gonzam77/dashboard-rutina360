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

function collectDescendantRoleIds(parentRoleId, childrenByParent) {
  const collected = new Set();
  const stack = [...(childrenByParent.get(Number(parentRoleId)) || [])];

  while (stack.length > 0) {
    const current = stack.pop();
    const currentId = Number(current?.id);

    if (!Number.isFinite(currentId) || collected.has(currentId)) {
      continue;
    }

    collected.add(currentId);
    const children = childrenByParent.get(currentId) || [];
    for (const child of children) {
      stack.push(child);
    }
  }

  return collected;
}

function countUsersInSubtree(roleId, usersByRoleId, childrenByParent) {
  const directCount = (usersByRoleId.get(Number(roleId)) || []).length;
  const children = childrenByParent.get(Number(roleId)) || [];

  return (
    directCount +
    children.reduce((total, child) => total + countUsersInSubtree(child.id, usersByRoleId, childrenByParent), 0)
  );
}

function getLevelAccent(level) {
  const accents = [
    "from-cyan-400 to-sky-500",
    "from-cyan-500 to-blue-500",
    "from-sky-400 to-cyan-500",
    "from-cyan-300 to-sky-400",
  ];

  return accents[level % accents.length];
}

function RoleNode({ role, level, childrenByParent, usersByRoleId }) {
  const users = usersByRoleId.get(Number(role.id)) || [];
  const children = childrenByParent.get(Number(role.id)) || [];
  const totalInSubtree = countUsersInSubtree(role.id, usersByRoleId, childrenByParent);
  const accent = getLevelAccent(level);

  return (
    <article className="group relative overflow-hidden rounded-3xl border border-white/15 bg-[#17385a] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.28)] transition duration-300 hover:-translate-y-0.5 hover:border-cyan-300/35 hover:bg-[#1b426a] hover:shadow-lg">
      <div className={`absolute left-0 top-0 h-1 w-full bg-gradient-to-r ${accent}`} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-white/60">Rol #{role.id}</p>
          <h3 className="mt-1 text-lg font-semibold text-white">{role.name}</h3>
          <p className="mt-1 text-xs text-white/70">
            Nivel {level + 1} | Usuarios directos: {users.length} | Usuarios en rama: {totalInSubtree}
          </p>
        </div>
        <Link
          href={`/inicio/roles-usuarios/${role.id}`}
          className="rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 hover:shadow-sm"
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
              className="rounded-lg border border-white/15 bg-[#0f2a46] px-3 py-2 text-sm text-white/85 transition hover:-translate-y-0.5 hover:border-cyan-300/35 hover:bg-[#153452] hover:shadow-sm"
            >
              <span className="font-medium text-white">{user.username || `Usuario #${user.id}`}</span>
              <span className="ml-2 text-xs text-white/65">{user.email || "Sin email"}</span>
            </Link>
          ))}
        </div>
      ) : null}

      {children.length > 0 ? (
        <div className="mt-4 space-y-3 border-l-2 border-white/15 pl-3">
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
  let viewerRoleName = "";

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    const sessionUser = parseSessionUserCookie(cookieStore.get("session_user")?.value);
    const roleKey = normalizeRoleKey(sessionUser?.roleName);
    viewerRoleName = String(sessionUser?.roleName || "").trim().toLowerCase();
    const viewerId = Number(sessionUser?.id) || null;
    const viewerRoleId = Number(sessionUser?.idRole) || null;
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

    const isGymViewer = viewerRoleName === "gym" || viewerRoleName === "gimnasio";
    if (isGymViewer) {
      const gymVisibleRoles = allRoles.filter((role) => {
        const roleName = String(role?.name || "").trim().toLowerCase();
        return roleName === "coach" || roleName === "athlete" || roleName === "atleta";
      });
      const allowedIds = new Set(
        gymVisibleRoles.map((role) => Number(role.id)).filter((id) => Number.isFinite(id))
      );

      roots = gymVisibleRoles;
      childrenByParent = new Map(
        [...childrenByParent.entries()].map(([parentId, children]) => [
          parentId,
          children.filter((child) => allowedIds.has(Number(child?.id))),
        ])
      );
    }

    const isAdminViewer = viewerRoleName === "admin" || viewerRoleName === "administrador";
    if (isAdminViewer && Number.isFinite(viewerRoleId) && viewerRoleId > 0) {
      const visibleRoleIds = collectDescendantRoleIds(viewerRoleId, childrenByParent);
      roots = (childrenByParent.get(viewerRoleId) || []).filter((role) => visibleRoleIds.has(Number(role?.id)));
      childrenByParent = new Map(
        [...childrenByParent.entries()].map(([parentId, children]) => [
          parentId,
          children.filter((child) => visibleRoleIds.has(Number(child?.id))),
        ])
      );
    }
  } catch (error) {
    errorMessage = error.message;
  }

  return (
    <section className="space-y-6">
      <header className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-[#0f2a46] via-[#123355] to-[#17385a] p-8 text-white shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
        <div className="absolute -right-14 -top-14 h-44 w-44 rounded-full bg-cyan-400/20 blur-2xl" />
        <div className="absolute -bottom-10 left-8 h-32 w-32 rounded-full bg-sky-400/20 blur-2xl" />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.2em] text-white/65">Estructura organizacional</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Roles y usuarios</h1>
          <p className="mt-3 max-w-2xl text-white/80">Vista jerárquica de roles padre/hijo y usuarios asociados.</p>
        </div>
      </header>

      {canCreateRoles ? <RoleCreateForm roles={allRoles} /> : null}

      {errorMessage ? (
        <div className="rounded-2xl border border-red-300/40 bg-red-950/40 p-4 text-red-200">{errorMessage}</div>
      ) : null}

      {!errorMessage && roots.length === 0 ? (
        <div className="rounded-2xl border border-white/15 bg-[#17385a] p-6 text-white/80 shadow-sm">No hay roles disponibles para tu perfil.</div>
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
