import Link from "next/link";

export default function InicioPage() {
  return (
    <div className="space-y-6">
      <header className="rounded-2xl bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">Bienvenido al Dashboard</h1>
        <p className="mt-3 text-slate-600">Selecciona una opción del menú lateral para gestionar el sistema.</p>
        <Link
          href="/inicio/roles-usuarios"
          className="mt-6 inline-block rounded-lg bg-slate-900 px-4 py-2 text-white hover:bg-slate-800 transition-colors"
        >
          Ir a Roles y Usuarios
        </Link>
      </header>
    </div>
  );
}