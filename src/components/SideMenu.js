import Link from "next/link";

const MENU_ITEMS = [
  { href: "/inicio/roles-usuarios", label: "Roles y usuarios" },
  { href: "/inicio/catalogo-ejercicios", label: "Catalogo ejercicios" },
];

export default function SideMenu() {
  return (
    <aside className="w-full lg:w-72 bg-slate-900 text-slate-100 lg:min-h-screen">
      <div className="p-6 border-b border-slate-800">
        <h2 className="text-xl font-semibold">Rutina360</h2>
        <p className="mt-1 text-sm text-slate-400">Panel administrativo</p>
      </div>

      <nav className="p-4 space-y-2">
        {MENU_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
