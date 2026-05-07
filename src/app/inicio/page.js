import Link from "next/link";
import { cookies } from "next/headers";
import { firstNonEmptyString, normalizeRoleKey, parseSessionUserCookie } from "@/lib/session";

function buildRoleHome(roleKey, profileHref) {
  if (roleKey === "super_admin") {
    return {
      title: "Panel de Super Administrador",
      description: "Administra gimnasios, usuarios y visibilidad global del sistema.",
      actions: [
        ...(profileHref ? [{ href: profileHref, label: "Ir a mi perfil" }] : []),
        { href: "/inicio/roles-usuarios", label: "Gestionar administradores" },
        { href: "/inicio/rutinas-creadas", label: "Ver rutinas globales" },
        { href: "/inicio/catalogo-ejercicios", label: "Gestionar catalogo" },
      ],
    };
  }

  if (roleKey === "admin") {
    return {
      title: "Panel del Administrador",
      description: "Gestiona coaches, atletas y rutinas de tu gimnasio.",
      actions: [
        ...(profileHref ? [{ href: profileHref, label: "Ir a mi perfil" }] : []),
        { href: "/inicio/roles-usuarios", label: "Gestionar coaches y atletas" },
        { href: "/inicio/rutinas-creadas", label: "Ver rutinas del gimnasio" },
        { href: "/inicio/catalogo-ejercicios", label: "Gestionar catalogo" },
      ],
    };
  }

  if (roleKey === "coach") {
    return {
      title: "Panel del Coach",
      description: "Administra tus atletas y tus rutinas activas.",
      actions: [
        ...(profileHref ? [{ href: profileHref, label: "Ir a mi perfil" }] : []),
        { href: "/inicio/roles-usuarios/4", label: "Ver y asignar atletas" },
        { href: "/inicio/rutinas-creadas", label: "Gestionar mis rutinas" },
      ],
    };
  }

  return {
    title: "Bienvenido al Dashboard",
    description: "Selecciona una opcion del menu lateral para gestionar el sistema.",
    actions: [{ href: "/inicio/roles-usuarios", label: "Ir a Roles y Usuarios" }],
  };
}

export default async function InicioPage() {
  const cookieStore = await cookies();
  const sessionUser = parseSessionUserCookie(cookieStore.get("session_user")?.value);
  const roleName = firstNonEmptyString([sessionUser?.roleName]);
  const roleKey = normalizeRoleKey(roleName);
  const ownRoleId = Number(sessionUser?.idRole);
  const ownUserId = Number(sessionUser?.id);
  const profileHref =
    Number.isFinite(ownRoleId) && ownRoleId > 0 && Number.isFinite(ownUserId) && ownUserId > 0
      ? `/inicio/roles-usuarios/${ownRoleId}/${ownUserId}`
      : "";
  const view = buildRoleHome(roleKey, profileHref);

  return (
    <div className="space-y-6">
      <header className="rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">{view.title}</h1>
        <p className="mt-3 text-slate-600">{view.description}</p>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {view.actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow"
          >
            <p className="text-sm font-medium text-slate-700">{action.label}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
