import Link from "next/link";
import { cookies } from "next/headers";
import RoleUsersManager from "@/components/roles/RoleUsersManager";

const ROLES_URL = "https://rutina360-server.onrender.com/rol";
const USERS_URL = "https://rutina360-server.onrender.com/users";

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
  const candidates = [
    `${USERS_URL}/role/${roleId}`,
    `${USERS_URL}?idRole=${roleId}`,
    USERS_URL,
  ];

  for (const url of candidates) {
    const users = await fetchUsersFrom(url, token);
    if (users) {
      return users;
    }
  }

  return [];
}

export default async function RolUsuariosDetallePage({ params }) {
  const { roleId } = await params;

  let role = null;
  let users = [];
  let errorMessage = "";

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    const [roleResult, usersResult] = await Promise.all([getRoleById(roleId, token), getUsers(roleId, token)]);
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
            <p className="mt-3 text-slate-600">{role ? `Rol #${role.id}` : `Rol #${roleId}`}</p>
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
      ) : (
        <RoleUsersManager roleId={roleId} roleName={role?.name || ""} users={users} />
      )}
    </section>
  );
}

