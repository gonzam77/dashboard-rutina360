import Link from "next/link";

const MENU_BY_ROLE = {
  super_admin: [
    { href: "/inicio", label: "Panel general" },
    { href: "/inicio/roles-usuarios", label: "Administradores y roles" },
    { href: "/inicio/rutinas-creadas", label: "Rutinas globales" },
    { href: "/inicio/catalogo-ejercicios", label: "Catalogo ejercicios" },
  ],
  admin: [
    { href: "/inicio", label: "Panel del gimnasio" },
    { href: "/inicio/roles-usuarios", label: "Coaches y atletas" },
    { href: "/inicio/rutinas-creadas", label: "Rutinas" },
    { href: "/inicio/catalogo-ejercicios", label: "Catalogo ejercicios" },
  ],
  coach: [
    { href: "/inicio", label: "Mi panel" },
    { href: "/inicio/roles-usuarios/4", label: "Mis atletas" },
    { href: "/inicio/rutinas-creadas", label: "Mis rutinas" },
  ],
  unknown: [
    { href: "/inicio", label: "Panel" },
    { href: "/inicio/roles-usuarios", label: "Roles y usuarios" },
    { href: "/inicio/rutinas-creadas", label: "Rutinas creadas" },
    { href: "/inicio/catalogo-ejercicios", label: "Catalogo ejercicios" },
  ],
};

export default function SideMenu({ username = "Usuario", role = "Sin rol", roleKey = "unknown" }) {
  const menuItems = MENU_BY_ROLE[roleKey] || MENU_BY_ROLE.unknown;

  return (
    <aside className="w-full lg:w-72 bg-slate-900 text-slate-100 lg:min-h-screen flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <h2 className="text-xl font-semibold">Rutina360</h2>
        <p className="mt-1 text-sm text-slate-400">Panel administrativo</p>
        <div className="mt-4 rounded-lg bg-slate-800/70 px-3 py-2 text-sm">
          <p className="font-medium text-slate-100">{username}</p>
          <p className="text-slate-300">{role}</p>
        </div>
      </div>

      <nav className="p-4 space-y-2 flex-1">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <form action="/api/auth/logout" method="post" className="p-4 border-t border-slate-800">
        <button
          type="submit"
          className="w-full rounded-lg px-3 py-2 text-sm font-medium text-red-200 transition hover:bg-slate-800 hover:text-red-100"
        >
          Cerrar sesion
        </button>
      </form>
    </aside>
  );
}
