"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Menu por rol. Las entradas que dependen de un id (perfil propio, listado de
 * atletas) se arman con los ids reales que llegan por props: antes el rol de
 * atleta estaba cableado como "4" y se rompia si cambiaba en la base.
 */
function buildMenuItems({ roleKey, isGymRole, profileHref, athletesHref }) {
  if (roleKey === "super_admin") {
    return [
      { href: "/inicio", label: "Panel general" },
      { href: "/inicio/roles-usuarios", label: "Administradores y roles" },
      { href: "/inicio/rutinas-creadas", label: "Rutinas globales" },
      { href: "/inicio/catalogo-ejercicios", label: "Catalogo ejercicios" },
    ];
  }

  if (roleKey === "admin" && !isGymRole) {
    return [
      { href: "/inicio", label: "Panel administrativo" },
      { href: "/inicio/roles-usuarios", label: "Roles y usuarios" },
      { href: "/inicio/catalogo-ejercicios", label: "Catalogo ejercicios" },
    ];
  }

  if (roleKey === "admin") {
    return [
      { href: "/inicio", label: "Panel del gimnasio" },
      { href: "/inicio/roles-usuarios", label: "Coaches y atletas" },
      { href: "/inicio/rutinas-creadas", label: "Rutinas" },
      { href: "/inicio/catalogo-ejercicios", label: "Catalogo ejercicios" },
    ];
  }

  if (roleKey === "coach") {
    return [
      { href: "/inicio", label: "Inicio" },
      ...(athletesHref ? [{ href: athletesHref, label: "Atletas del gym" }] : []),
      { href: profileHref, label: "Mi perfil" },
      { href: "/inicio/rutinas-creadas", label: "Rutinas" },
    ];
  }

  return [
    { href: "/inicio", label: "Panel" },
    { href: "/inicio/roles-usuarios", label: "Roles y usuarios" },
  ];
}

export default function SideMenu({
  username = "Usuario",
  role = "Sin rol",
  roleKey = "unknown",
  isGymRole = false,
  ownRoleId = null,
  ownUserId = null,
  athleteRoleId = null,
}) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const profileHref =
    Number(ownRoleId) > 0 && Number(ownUserId) > 0
      ? `/inicio/roles-usuarios/${Number(ownRoleId)}/${Number(ownUserId)}`
      : "/inicio/roles-usuarios";
  const athletesHref =
    Number(athleteRoleId) > 0 ? `/inicio/roles-usuarios/${Number(athleteRoleId)}` : "";

  const menuItems = buildMenuItems({ roleKey, isGymRole, profileHref, athletesHref });

  // Con el menu abierto en mobile, el fondo no debe scrollear.
  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-[#0a233d] px-4 py-3 lg:hidden">
        <div>
          <p className="text-base font-semibold text-white">Rutina360</p>
          <p className="text-xs text-white/65">Panel administrativo</p>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          aria-expanded={isOpen}
          aria-label="Abrir menu"
          className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white"
        >
          ☰
        </button>
      </div>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 bg-[#071a2f]/70 lg:hidden"
          aria-hidden="true"
          onClick={() => setIsOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col bg-[#0a233d] text-slate-100 transition-transform duration-300 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-white/10 p-6">
          <div className="flex items-center justify-between gap-3 lg:block">
            <div>
              <h2 className="text-xl font-semibold">Rutina360</h2>
              <p className="mt-1 text-sm text-white/65">Panel administrativo</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Cerrar menu"
              className="rounded-lg border border-white/20 px-2 py-1 text-sm text-white/85 lg:hidden"
            >
              ✕
            </button>
          </div>
          <div className="mt-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
            <p className="font-medium text-white">{username}</p>
            <p className="text-cyan-100/90">{role}</p>
          </div>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto p-4">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                onClick={() => setIsOpen(false)}
                aria-current={isActive ? "page" : undefined}
                className={`block rounded-lg border px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "border-cyan-300/40 bg-cyan-300/15 text-white"
                    : "border-transparent text-white/85 hover:border-cyan-300/30 hover:bg-cyan-300/10 hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <form action="/api/auth/logout" method="post" className="border-t border-white/10 p-4">
          <button
            type="submit"
            className="mb-2 w-full rounded-lg border border-red-300/40 bg-red-900/20 px-3 py-2 text-sm font-medium text-red-100 transition hover:bg-red-900/35"
          >
            Cerrar sesion
          </button>
        </form>
        <form action="/api/auth/logout-all" method="post" className="px-4 pb-4">
          <button
            type="submit"
            className="w-full rounded-lg border border-amber-200/35 bg-amber-900/20 px-3 py-2 text-sm font-medium text-amber-100 transition hover:bg-amber-900/35"
          >
            Cerrar todas las sesiones
          </button>
        </form>
      </aside>
    </>
  );
}
