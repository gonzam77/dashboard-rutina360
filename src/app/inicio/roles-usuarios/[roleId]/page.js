import Link from "next/link";

const ROLES_URL = "https://rutina360-server.onrender.com/rol";
const USERS_URL = "https://rutina360-server.onrender.com/users";

async function getRoleById(roleId) {
  const response = await fetch(ROLES_URL, { cache: "no-store" });
  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(json?.message || "No se pudieron cargar los roles.");
  }

  const roles = Array.isArray(json?.data) ? json.data : [];
  return roles.find((role) => String(role.id) === String(roleId)) || null;
}

async function getUsers() {
  const response = await fetch(USERS_URL, { cache: "no-store" });
  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(json?.message || "No se pudieron cargar los usuarios.");
  }

  return Array.isArray(json?.data) ? json.data : [];
}

export default async function RolUsuariosDetallePage({ params }) {
  const { roleId } = await params;

  let role = null;
  let users = [];
  let errorMessage = "";

  try {
    const [roleResult, usersResult] = await Promise.all([getRoleById(roleId), getUsers()]);
    role = roleResult;

    users = usersResult.filter((user) => {
      const sameIdRole = String(user?.idRole) === String(roleId);
      const sameNestedRole = String(user?.Rol?.id) === String(roleId);
      return sameIdRole || sameNestedRole;
    });
  } catch (error) {
    errorMessage = error.message;
  }

  return (
    <section className="space-y-6">
      <header className="rounded-2xl bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {role ? `Usuarios del rol: ${role.name}` : "Usuarios por rol"}
            </h1>
            <p className="mt-3 text-slate-600">
              {role ? `Rol #${role.id}` : `Rol #${roleId}`}
            </p>
          </div>
          <Link
            href="/inicio/roles-usuarios"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Volver a roles
          </Link>
        </div>
      </header>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!errorMessage && users.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-slate-600 shadow-sm">
          No hay usuarios asociados a este rol.
        </div>
      ) : null}

      {!errorMessage && users.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {users.map((user) => (
            <article
              key={user.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Usuario #{user.id}
              </p>
              <h2 className="mt-2 text-lg font-semibold text-slate-900">{user.username}</h2>
              <p className="mt-2 text-sm text-slate-600">{user.email || "Sin email"}</p>
              <p className="mt-3 text-sm text-slate-700">
                Rol: {user?.Rol?.name || role?.name || "Sin rol"}
              </p>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
