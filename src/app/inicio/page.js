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
        { href: "/inicio/roles-usuarios", label: "Gestionar Roles" },
        { href: "/inicio/rutinas-creadas", label: "Rutinas globales" },
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
        { href: "/inicio/rutinas-creadas", label: "Rutinas del gimnasio" },
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
        { href: "/inicio/rutinas-creadas", label: "Mis rutinas" },
      ],
    };
  }

  return {
    title: "Bienvenido al Dashboard",
    description: "Selecciona una opcion del menu lateral para gestionar el sistema.",
    actions: [{ href: "/inicio/roles-usuarios", label: "Ir a Roles y Usuarios" }],
  };
}

function getActionStyle(index) {
  const variants = [
    {
      ring: "from-sky-500 to-cyan-500",
      glow: "group-hover:shadow-cyan-200/60",
      icon: "M12 2a10 10 0 100 20 10 10 0 000-20zm0 5a3 3 0 110 6 3 3 0 010-6zm0 13a8 8 0 01-6.4-3.2A6.5 6.5 0 0112 14a6.5 6.5 0 016.4 2.8A8 8 0 0112 20z",
    },
    {
      ring: "from-emerald-500 to-teal-500",
      glow: "group-hover:shadow-emerald-200/60",
      icon: "M4 5h16a1 1 0 011 1v2H3V6a1 1 0 011-1zm-1 5h18v8a1 1 0 01-1 1H4a1 1 0 01-1-1v-8zm4 3v2h4v-2H7z",
    },
    {
      ring: "from-violet-500 to-fuchsia-500",
      glow: "group-hover:shadow-fuchsia-200/60",
      icon: "M6 4h12a2 2 0 012 2v12l-4-2-4 2-4-2-4 2V6a2 2 0 012-2zm2 4h8v2H8V8zm0 4h6v2H8v-2z",
    },
    {
      ring: "from-amber-500 to-orange-500",
      glow: "group-hover:shadow-amber-200/60",
      icon: "M11 2h2v3h-2V2zm5.66 2.34l1.41 1.41-2.12 2.12-1.41-1.41 2.12-2.12zM19 11h3v2h-3v-2zM4 11h3v2H4v-2zm2.34-6.66l2.12 2.12-1.41 1.41L4.93 5.75l1.41-1.41zM12 7a5 5 0 00-5 5c0 1.93 1.09 3.6 2.68 4.43L10 22h4l.32-5.57A5 5 0 0012 7z",
    },
  ];

  return variants[index % variants.length];
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
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-8 text-white shadow-lg">
        <div className="absolute -right-14 -top-14 h-44 w-44 rounded-full bg-cyan-400/20 blur-2xl" />
        <div className="absolute -bottom-10 left-8 h-32 w-32 rounded-full bg-fuchsia-400/20 blur-2xl" />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.2em] text-slate-300">Rutina360</p>
          <h1 className="mt-2 text-3xl font-semibold">{view.title}</h1>
          <p className="mt-3 max-w-2xl text-slate-200">{view.description}</p>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {view.actions.map((action, index) => {
          const style = getActionStyle(index);

          return (
            <Link
              key={action.href}
              href={action.href}
              className={`group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl ${style.glow}`}
            >
              <div className={`absolute right-0 top-0 h-1 w-full bg-gradient-to-r ${style.ring}`} />
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-base font-semibold text-slate-900 transition group-hover:text-slate-700">
                    {action.label}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">Acceso rápido</p>
                </div>
                <div className={`rounded-xl bg-gradient-to-br p-3 text-white shadow-md ${style.ring}`}>
                  <svg viewBox="0 0 24 24" className="h-8 w-8 fill-current" aria-hidden="true">
                    <path d={style.icon} />
                  </svg>
                </div>
              </div>
              <div className="mt-4 inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition group-hover:border-slate-300 group-hover:bg-slate-50">
                Abrir módulo
              </div>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
