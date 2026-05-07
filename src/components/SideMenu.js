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
    <aside className="flex w-full flex-col bg-[#0a233d] text-slate-100 lg:min-h-screen lg:w-72">
      <div className="border-b border-white/10 p-6">
        <h2 className="text-xl font-semibold">Rutina360</h2>
        <p className="mt-1 text-sm text-white/65">Panel administrativo</p>
        <div className="mt-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
          <p className="font-medium text-white">{username}</p>
          <p className="text-cyan-100/90">{role}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-2 p-4">
        {menuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-lg border border-transparent px-3 py-2 text-sm font-medium text-white/85 transition hover:border-cyan-300/30 hover:bg-cyan-300/10 hover:text-white"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <form action="/api/auth/logout" method="post" className="border-t border-white/10 p-4">
        <button
          type="submit"
          className="w-full rounded-lg border border-red-300/40 bg-red-900/20 px-3 py-2 text-sm font-medium text-red-100 transition hover:bg-red-900/35"
        >
          Cerrar sesion
        </button>
      </form>
    </aside>
  );
}
