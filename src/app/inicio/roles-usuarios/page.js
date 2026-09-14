import Link from "next/link";
import RoleCreateForm from "@/components/roles/RoleCreateForm";
import { getRolesStrict, getUsersStrict } from "@/lib/backend";
import { getUserRoleName, isAthleteRoleName, isCoachRoleName, sameId } from "@/lib/roles";
import { getViewer, getViewerGymOwnerId, isSuperAdmin } from "@/lib/viewer";

export const metadata = {
  title: "Roles y usuarios",
};

function resolveOwnerId(user) {
  return Number(user?.idAdminOwner) || Number(user?.adminOwner?.id) || null;
}

/** Recorta la lista de usuarios al alcance real de quien mira. */
function filterUsersByViewerRole(users, viewer, viewerGymOwnerId) {
  if (isSuperAdmin(viewer)) {
    return users;
  }

  if (viewer.roleKey === "admin") {
    return users.filter(
      (user) => sameId(user?.id, viewer.id) || sameId(resolveOwnerId(user), viewer.id)
    );
  }

  if (viewer.roleKey === "coach") {
    if (!viewerGymOwnerId) {
      return users.filter((user) => sameId(user?.id, viewer.id));
    }

    return users.filter((user) => {
      if (sameId(user?.id, viewer.id)) {
        return true;
      }

      return (
        isAthleteRoleName(getUserRoleName(user)) && sameId(resolveOwnerId(user), viewerGymOwnerId)
      );
    });
  }

  return [];
}

function buildRoleTree(roles) {
  const childrenByParent = new Map();

  for (const role of roles) {
    const parentId =
      role?.parentId === null || role?.parentId === undefined ? null : Number(role.parentId);

    if (!childrenByParent.has(parentId)) {
      childrenByParent.set(parentId, []);
    }
    childrenByParent.get(parentId).push(role);
  }

  for (const [key, list] of childrenByParent.entries()) {
    list.sort((a, b) => Number(a?.id || 0) - Number(b?.id || 0));
    childrenByParent.set(key, list);
  }

  return { childrenByParent, roots: childrenByParent.get(null) || [] };
}

/**
 * Deja solo los roles indicados y recalcula las raices: raiz es todo rol
 * visible cuyo padre no lo sea. Sin esto un rol aparece dos veces, como raiz
 * y como hijo de otro rol tambien visible.
 */
function restrictTree(childrenByParent, visibleRoles) {
  const allowedIds = new Set(
    visibleRoles.map((role) => Number(role?.id)).filter((id) => Number.isFinite(id))
  );

  const restrictedChildren = new Map(
    [...childrenByParent.entries()].map(([parentId, children]) => [
      parentId,
      children.filter((child) => allowedIds.has(Number(child?.id))),
    ])
  );

  const roots = visibleRoles.filter((role) => !allowedIds.has(Number(role?.parentId)));

  return { childrenByParent: restrictedChildren, roots };
}

/** visitedIds corta jerarquias ciclicas, que si no colgarian la recursion. */
function countUsersInSubtree(roleId, usersByRoleId, childrenByParent, visitedIds = new Set()) {
  const key = Number(roleId);

  if (visitedIds.has(key)) {
    return 0;
  }

  visitedIds.add(key);

  const directCount = (usersByRoleId.get(key) || []).length;
  const children = childrenByParent.get(key) || [];

  return (
    directCount +
    children.reduce(
      (total, child) =>
        total + countUsersInSubtree(child.id, usersByRoleId, childrenByParent, visitedIds),
      0
    )
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

function groupUsersByRoleId(users) {
  const usersByRoleId = new Map();

  for (const user of users) {
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
    roleUsers.sort((a, b) =>
      String(a?.username || "").localeCompare(String(b?.username || ""), "es")
    );
    usersByRoleId.set(roleId, roleUsers);
  }

  return usersByRoleId;
}

function RoleNode({
  role,
  level,
  childrenByParent,
  usersByRoleId,
  showInlineUsers = true,
  ancestorIds = [],
}) {
  const roleId = Number(role.id);

  if (ancestorIds.includes(roleId)) {
    return null;
  }

  const users = usersByRoleId.get(roleId) || [];
  const children = childrenByParent.get(roleId) || [];
  const totalInSubtree = countUsersInSubtree(roleId, usersByRoleId, childrenByParent);
  const accent = getLevelAccent(level);
  const isAthleteRole = isAthleteRoleName(role?.name);
  const visibleUsers = isAthleteRole ? users.slice(0, 10) : users;
  const hiddenUsers = isAthleteRole ? users.slice(10) : [];

  function renderUserCard(user) {
    return (
      <Link
        key={user.id}
        href={`/inicio/roles-usuarios/${role.id}/${user.id}`}
        className="rounded-lg border border-white/15 bg-[#0f2a46] px-3 py-2 text-sm text-white/85 transition hover:-translate-y-0.5 hover:border-cyan-300/35 hover:bg-[#153452] hover:shadow-sm"
      >
        <span className="font-medium text-white">{user.username || `Usuario #${user.id}`}</span>
        <span className="ml-2 text-xs text-white/65">{user.email || "Sin email"}</span>
      </Link>
    );
  }

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
          Gestionar
        </Link>
      </div>

      {showInlineUsers && users.length > 0 ? (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {visibleUsers.map((user) => renderUserCard(user))}
          </div>
          {hiddenUsers.length > 0 ? (
            <details className="group/more flex flex-col gap-2">
              <summary className="order-2 cursor-pointer select-none rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20">
                <span className="group-open/more:hidden">Ver mas ({hiddenUsers.length})</span>
                <span className="hidden group-open/more:inline">Ver menos</span>
              </summary>
              <div className="order-1 grid grid-cols-1 gap-2 md:grid-cols-2">
                {hiddenUsers.map((user) => renderUserCard(user))}
              </div>
            </details>
          ) : null}
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
              showInlineUsers={showInlineUsers}
              ancestorIds={[...ancestorIds, roleId]}
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
  let showInlineUsers = true;
  let roleKey = "unknown";
  let viewerRoleId = null;
  let viewerUserId = null;

  try {
    const viewer = await getViewer();

    if (!viewer) {
      throw new Error("No autenticado.");
    }

    roleKey = viewer.roleKey;
    viewerUserId = viewer.id;
    viewerRoleId = viewer.roleId;
    canCreateRoles = isSuperAdmin(viewer);
    showInlineUsers = !isSuperAdmin(viewer);

    const [roles, users, viewerGymOwnerId] = await Promise.all([
      getRolesStrict(viewer.token),
      getUsersStrict(viewer.token),
      getViewerGymOwnerId(),
    ]);

    allRoles = roles;
    usersByRoleId = groupUsersByRoleId(filterUsersByViewerRole(users, viewer, viewerGymOwnerId));

    const tree = buildRoleTree(roles);
    roots = tree.roots;
    childrenByParent = tree.childrenByParent;

    // Coach y gym solo ven la rama operativa: coaches y atletas.
    if (roleKey === "coach" || roleKey === "admin") {
      const visibleRoles = roles.filter(
        (role) => isCoachRoleName(role?.name) || isAthleteRoleName(role?.name)
      );
      ({ roots, childrenByParent } = restrictTree(childrenByParent, visibleRoles));
    }
  } catch (error) {
    errorMessage = error?.message || "No se pudo cargar la estructura de roles.";
  }

  return (
    <section className="space-y-6">
      <header className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-[#0f2a46] via-[#123355] to-[#17385a] p-8 text-white shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
        <div className="absolute -right-14 -top-14 h-44 w-44 rounded-full bg-cyan-400/20 blur-2xl" />
        <div className="absolute -bottom-10 left-8 h-32 w-32 rounded-full bg-sky-400/20 blur-2xl" />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.2em] text-white/65">Estructura organizacional</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Roles y usuarios</h1>
          <p className="mt-3 max-w-2xl text-white/80">
            Vista jerárquica de roles padre/hijo y usuarios asociados.
          </p>
        </div>
      </header>

      {canCreateRoles ? <RoleCreateForm roles={allRoles} /> : null}

      {errorMessage ? (
        <div className="rounded-2xl border border-red-300/40 bg-red-950/40 p-4 text-red-200">
          {errorMessage}
        </div>
      ) : null}

      {!errorMessage && roots.length === 0 ? (
        <div className="rounded-2xl border border-white/15 bg-[#17385a] p-6 text-white/80 shadow-sm">
          No hay roles disponibles para tu perfil.
        </div>
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
              showInlineUsers={showInlineUsers}
            />
          ))}
        </div>
      ) : null}

      {!errorMessage && !showInlineUsers && roleKey === "coach" && viewerRoleId && viewerUserId ? (
        <section className="rounded-3xl border border-white/15 bg-[#17385a] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
          <h2 className="text-base font-semibold text-white">Listados especializados</h2>
          <p className="mt-1 text-sm text-white/75">
            Para mantener esta vista liviana, los usuarios se gestionan desde modulos dedicados.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/inicio/roles-usuarios/${viewerRoleId}/${viewerUserId}`}
              className="rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
            >
              Ir a mi perfil de coach
            </Link>
          </div>
        </section>
      ) : null}
    </section>
  );
}
