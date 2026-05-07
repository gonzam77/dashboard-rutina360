import Link from "next/link";

export default function SinAccesoPage() {
  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <section className="w-full max-w-lg rounded-2xl bg-white p-8 shadow-lg text-center">
        <h1 className="text-2xl font-semibold text-slate-900">Acceso restringido</h1>
        <p className="mt-3 text-slate-600">
          Tu rol no tiene acceso al panel administrativo. Si crees que es un error, contacta a tu administrador.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/login"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Volver al login
          </Link>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              Cerrar sesion
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
