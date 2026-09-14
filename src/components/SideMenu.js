"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";

/**
 * Menu por rol, agrupado por seccion.
 *
 * Las entradas que dependen de un id (perfil propio, listado de atletas) se
 * arman con los ids reales que llegan por props: antes el rol de atleta estaba
 * cableado como "4" y se rompia si cambiaba en la base.
 */
function buildMenuGroups({ roleKey, isGymRole, profileHref, athletesHref }) {
  if (roleKey === "super_admin") {
    return [
      {
        label: "General",
        items: [{ href: "/inicio", label: "Panel general", icon: "panel" }],
      },
      {
        label: "Administracion",
        items: [
          { href: "/inicio/roles-usuarios", label: "Administradores y roles", icon: "usuarios" },
          { href: "/inicio/rutinas-creadas", label: "Rutinas globales", icon: "rutinas" },
          { href: "/inicio/catalogo-ejercicios", label: "Catalogo ejercicios", icon: "catalogo" },
        ],
      },
      ...(profileHref
        ? [{ label: "Mi cuenta", items: [{ href: profileHref, label: "Mi perfil", icon: "perfil" }] }]
        : []),
    ];
  }

  if (roleKey === "admin" && !isGymRole) {
    return [
      {
        label: "General",
        items: [{ href: "/inicio", label: "Panel administrativo", icon: "panel" }],
      },
      {
        label: "Administracion",
        items: [
          { href: "/inicio/roles-usuarios", label: "Roles y usuarios", icon: "usuarios" },
          { href: "/inicio/catalogo-ejercicios", label: "Catalogo ejercicios", icon: "catalogo" },
        ],
      },
      ...(profileHref
        ? [{ label: "Mi cuenta", items: [{ href: profileHref, label: "Mi perfil", icon: "perfil" }] }]
        : []),
    ];
  }

  if (roleKey === "admin") {
    return [
      {
        label: "General",
        items: [{ href: "/inicio", label: "Panel del gimnasio", icon: "panel" }],
      },
      {
        label: "Mi gimnasio",
        items: [
          { href: "/inicio/roles-usuarios", label: "Coaches y atletas", icon: "usuarios" },
          { href: "/inicio/rutinas-creadas", label: "Rutinas", icon: "rutinas" },
          { href: "/inicio/catalogo-ejercicios", label: "Catalogo ejercicios", icon: "catalogo" },
        ],
      },
      ...(profileHref
        ? [{ label: "Mi cuenta", items: [{ href: profileHref, label: "Mi perfil", icon: "perfil" }] }]
        : []),
    ];
  }

  if (roleKey === "coach") {
    return [
      {
        label: "General",
        items: [{ href: "/inicio", label: "Inicio", icon: "panel" }],
      },
      {
        label: "Entrenamiento",
        items: [
          ...(athletesHref
            ? [{ href: athletesHref, label: "Atletas del gym", icon: "usuarios" }]
            : []),
          { href: "/inicio/rutinas-creadas", label: "Rutinas", icon: "rutinas" },
        ],
      },
      { label: "Mi cuenta", items: [{ href: profileHref, label: "Mi perfil", icon: "perfil" }] },
    ];
  }

  return [
    {
      label: "General",
      items: [
        { href: "/inicio", label: "Panel", icon: "panel" },
        { href: "/inicio/roles-usuarios", label: "Roles y usuarios", icon: "usuarios" },
      ],
    },
  ];
}

/**
 * Un item sigue activo dentro de sus subrutas: estando en
 * /inicio/roles-usuarios/3/12 antes no se marcaba nada y el menu no decia donde
 * estabas. "/inicio" se compara exacto porque es prefijo de todo el panel.
 */
function isItemActive(pathname, href) {
  if (href === "/inicio") {
    return pathname === "/inicio";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
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

  const menuGroups = buildMenuGroups({ roleKey, isGymRole, profileHref, athletesHref });
  const initial = String(username).trim().charAt(0).toUpperCase() || "U";

  // El menu abierto en mobile es un drawer: el fondo no debe scrollear.
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
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-linea-suave bg-sidebar px-4 py-3 lg:hidden">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-principal text-sm font-black text-fondo">
            R
          </span>
          <div>
            <p className="text-sm font-bold text-texto">Rutina360</p>
            <p className="text-xs text-texto-3">{role}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          aria-expanded={isOpen}
          aria-controls="menu-lateral"
          aria-label="Abrir menu de navegacion"
          className="r360-btn r360-btn-ghost r360-btn-sm text-lg"
        >
          <Icon name="menu" />
        </button>
      </div>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 bg-fondo/80 backdrop-blur-sm lg:hidden"
          aria-hidden="true"
          onClick={() => setIsOpen(false)}
        />
      ) : null}

      <aside
        id="menu-lateral"
        className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-linea-suave bg-sidebar transition-transform duration-300 lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-linea-suave px-5 py-5">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-principal text-lg font-black text-fondo">
              R
            </span>
            <div>
              <p className="text-base font-extrabold text-texto">Rutina360</p>
              <p className="text-xs text-texto-3">Panel administrativo</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            aria-label="Cerrar menu"
            className="r360-btn r360-btn-ghost r360-btn-sm lg:hidden"
          >
            <Icon name="cerrar" />
          </button>
        </div>

        <Link
          href={profileHref}
          onClick={() => setIsOpen(false)}
          className="mx-4 mt-4 flex items-center gap-3 rounded-lg border border-linea-suave bg-superficie px-3 py-3 transition hover:border-acento/40"
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-acento/40 bg-acento/10 text-sm font-bold text-acento">
            {initial}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold text-texto">{username}</span>
            <span className="block truncate text-xs text-acento">{role}</span>
          </span>
        </Link>

        <nav className="flex-1 space-y-5 overflow-y-auto px-4 py-5">
          {menuGroups.map((group) => (
            <div key={group.label}>
              <p className="px-2 pb-2 text-[0.68rem] font-bold uppercase tracking-[0.15em] text-texto-3">
                {group.label}
              </p>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const isActive = isItemActive(pathname, item.href);

                  return (
                    <li key={`${item.href}-${item.label}`}>
                      <Link
                        href={item.href}
                        onClick={() => setIsOpen(false)}
                        aria-current={isActive ? "page" : undefined}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition ${
                          isActive
                            ? "bg-acento/15 text-acento"
                            : "text-texto-2 hover:bg-linea-suave hover:text-texto"
                        }`}
                      >
                        <Icon name={item.icon} className="text-lg" />
                        <span className="truncate">{item.label}</span>
                        {isActive ? (
                          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-acento" aria-hidden="true" />
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/*
          "Cerrar todas las sesiones" estaba al mismo nivel visual que el logout
          normal y se tocaba por error. Ahora queda plegado dentro del detalle.
        */}
        <div className="space-y-2 border-t border-linea-suave p-4">
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="r360-btn r360-btn-ghost w-full">
              <Icon name="salir" className="text-base" />
              Cerrar sesion
            </button>
          </form>
          <details className="group">
            <summary className="cursor-pointer list-none px-3 py-1.5 text-center text-xs font-semibold text-texto-3 transition hover:text-texto">
              Mas opciones de sesion
            </summary>
            <form action="/api/auth/logout-all" method="post" className="mt-2">
              <button type="submit" className="r360-btn r360-btn-danger r360-btn-sm w-full">
                Cerrar todas las sesiones
              </button>
            </form>
          </details>
        </div>
      </aside>
    </>
  );
}
