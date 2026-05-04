import Link from "next/link";

const ROLES_URL = "https://rutina360-server.onrender.com/rol";

async function getRoles() {
  const response = await fetch(ROLES_URL, { cache: "no-store" });
  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(json?.message || "No se pudieron cargar los roles.");
  }

  return Array.isArray(json?.data) ? json.data : [];
}

export default async function RolesUsuariosPage() {
  let roles = [];
  let errorMessage = "";

  try {
    roles = await getRoles();
  } catch (error) {
    errorMessage = error.message;
  }

  return (
    <section className="space-y-6">
      <header className="rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Roles y usuarios</h1>
        <p className="mt-3 text-slate-600">Listado de roles registrados en la base de datos.</p>
      </header>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!errorMessage && roles.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-slate-600 shadow-sm">
          No hay roles disponibles.
        </div>
      ) : null}

      {!errorMessage && roles.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => (
            <Link
              key={role.id}
              href={`/inicio/roles-usuarios/${role.id}`}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Rol #{role.id}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">{role.name}</h2>
              <p className="mt-4 text-sm text-slate-600">
                Creado: {new Date(role.createdAt).toLocaleString("es-AR")}
              </p>
              <p className="mt-4 text-sm font-medium text-slate-800">Ver usuarios del rol</p>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
