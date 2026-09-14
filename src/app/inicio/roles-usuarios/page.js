import Link from "next/link";
import RoleCreateForm from "@/components/roles/RoleCreateForm";
import Icon from "@/components/ui/Icon";
import PageHeader from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Alert, EmptyState } from "@/components/ui/Feedback";
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

/** Icono segun el tipo de rol, para reconocerlo de un vistazo en el arbol. */
function getRoleIcon(roleName) {
  if (isAthleteRoleName(roleName)) {
    return "perfil";
  }

  if (isCoachRoleName(roleName)) {
    return "usuarios";
  }

  return "gym";
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
  const isAthleteRole = isAthleteRoleName(role?.name);
  const visibleUsers = isAthleteRole ? users.slice(0, 10) : users;
  const hiddenUsers = isAthleteRole ? users.slice(10) : [];

  function renderUserCard(user) {
    return (
      <Link
        key={user.id}
        href={`/inicio/roles-usuarios/${role.id}/${user.id}`}
        className="r360-card-inset r360-card-link flex items-center gap-3 px-3 py-2.5"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-acento/35 bg-acento/10 text-sm font-bold text-acento">
          {String(user.username || "?").charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-texto">
            {user.username || `Usuario #${user.id}`}
          </span>
          <span className="block truncate text-xs text-texto-3">{user.email || "Sin email"}</span>
        </span>
        <Icon name="chevron" className="text-texto-3" />
      </Link>
    );
  }

  return (
    <article className="r360-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-acento/12 text-xl text-acento">
            <Icon name={getRoleIcon(role?.name)} />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold text-texto">{role.name}</h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="r360-badge r360-badge-neutro">Nivel {level + 1}</span>
              <span className="r360-badge r360-badge-acento">
                {users.length} directo{users.length === 1 ? "" : "s"}
              </span>
              {totalInSubtree !== users.length ? (
                <span className="r360-badge r360-badge-neutro">{totalInSubtree} en la rama</span>
              ) : null}
            </div>
          </div>
        </div>
        <Link href={`/inicio/roles-usuarios/${role.id}`} className="r360-btn r360-btn-accent r360-btn-sm">
          Gestionar
          <Icon name="chevron" />
        </Link>
      </div>

      {showInlineUsers && users.length > 0 ? (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {visibleUsers.map((user) => renderUserCard(user))}
          </div>
          {hiddenUsers.length > 0 ? (
            <details className="group/more flex flex-col gap-2">
              <summary className="order-2 cursor-pointer select-none list-none">
                <span className="r360-btn r360-btn-ghost r360-btn-sm w-full">
                  <span className="group-open/more:hidden">Ver mas ({hiddenUsers.length})</span>
                  <span className="hidden group-open/more:inline">Ver menos</span>
                </span>
              </summary>
              <div className="order-1 grid grid-cols-1 gap-2 md:grid-cols-2">
                {hiddenUsers.map((user) => renderUserCard(user))}
              </div>
            </details>
          ) : null}
        </div>
      ) : null}

      {children.length > 0 ? (
        <div className="mt-4 space-y-3 border-l-2 border-linea-suave pl-3">
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
    <section className="space-y-5">
      <PageHeader
        eyebrow="Estructura organizacional"
        title="Roles y usuarios"
        description="Jerarquia de roles padre/hijo. Entra a un rol para buscar, filtrar y dar de alta usuarios."
        breadcrumbs={[
          { href: "/inicio", label: "Panel" },
          { label: "Roles y usuarios" },
        ]}
      />

      {canCreateRoles ? <RoleCreateForm roles={allRoles} /> : null}

      {errorMessage ? (
        <Alert title="No se pudo cargar la estructura">{errorMessage}</Alert>
      ) : null}

      {!errorMessage && roots.length === 0 ? (
        <Card>
          <EmptyState
            icon="usuarios"
            title="No hay roles disponibles para tu perfil"
            description="Tu rol no alcanza ninguna rama de la estructura. Si esperabas ver algo aca, consulta con tu administrador."
          />
        </Card>
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
        <Card>
          <h2 className="flex items-center gap-2 text-base font-bold text-texto">
            <Icon name="info" className="text-acento" />
            Listados especializados
          </h2>
          <p className="mt-1 text-sm text-texto-2">
            Para mantener esta vista liviana, los usuarios se gestionan desde modulos dedicados.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/inicio/roles-usuarios/${viewerRoleId}/${viewerUserId}`}
              className="r360-btn r360-btn-accent r360-btn-sm"
            >
              <Icon name="perfil" />
              Ir a mi perfil de coach
            </Link>
          </div>
        </Card>
      ) : null}
    </section>
  );
}
