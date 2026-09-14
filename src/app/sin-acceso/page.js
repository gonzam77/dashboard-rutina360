import Link from "next/link";
import Icon from "@/components/ui/Icon";

export const metadata = {
  title: "Acceso restringido",
};

export default function SinAccesoPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-fondo p-4 sm:p-6">
      <section className="r360-card w-full max-w-lg p-6 text-center sm:p-8">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-aviso/15 text-2xl text-aviso">
          <Icon name="alerta" />
        </span>
        <h1 className="mt-4 text-2xl font-extrabold text-texto">Acceso restringido</h1>
        <p className="mt-3 text-sm text-texto-2">
          Tu rol no tiene acceso al panel administrativo. Si sos atleta, entra desde la app movil de
          Rutina360. Si crees que es un error, contacta a tu administrador.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <Link href="/login" className="r360-btn r360-btn-ghost">
            <Icon name="atras" />
            Volver al login
          </Link>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="r360-btn r360-btn-accent">
              <Icon name="salir" />
              Cerrar sesion
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
