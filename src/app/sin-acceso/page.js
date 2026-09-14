import Link from "next/link";

export const metadata = {
  title: "Acceso restringido",
};

export default function SinAccesoPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#071a2f] via-[#0f2a46] to-[#17385a] p-6">
      <section className="w-full max-w-lg rounded-3xl border border-white/15 bg-[#17385a]/90 p-8 text-center text-white shadow-[0_18px_45px_rgba(0,0,0,0.35)]">
        <h1 className="text-2xl font-semibold">Acceso restringido</h1>
        <p className="mt-3 text-white/80">
          Tu rol no tiene acceso al panel administrativo. Si crees que es un error, contacta a tu
          administrador.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/login"
            className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Volver al login
          </Link>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
            >
              Cerrar sesion
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
