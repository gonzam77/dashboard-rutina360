 "use client";

import Link from "next/link";
import { useState } from "react";

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
    { href: "/inicio", label: "Inicio" },
    { href: "/inicio/roles-usuarios/4", label: "Atletas del gym" },
    { href: "/inicio/roles-usuarios", label: "Mi perfil" },
    { href: "/inicio/rutinas-creadas", label: "Rutinas" },
  ],
  unknown: [
    { href: "/inicio", label: "Panel" },
    { href: "/inicio/roles-usuarios", label: "Roles y usuarios" },
    { href: "/inicio/rutinas-creadas", label: "Rutinas creadas" },
    { href: "/inicio/catalogo-ejercicios", label: "Catalogo ejercicios" },
  ],
};

export default function SideMenu({
  username = "Usuario",
  role = "Sin rol",
  roleKey = "unknown",
  ownRoleId = null,
  ownUserId = null,
}) {
  const normalizedRoleName = String(role || "").trim().toLowerCase();
  const isGymRole = normalizedRoleName === "gym" || normalizedRoleName === "gimnasio";
  const menuItems =
    roleKey === "admin" && !isGymRole
      ? [
          { href: "/inicio", label: "Panel administrativo" },
          { href: "/inicio/roles-usuarios", label: "Roles y usuarios" },
        ]
      : MENU_BY_ROLE[roleKey] || MENU_BY_ROLE.unknown;
  const coachProfileHref =
    Number.isFinite(Number(ownRoleId)) &&
    Number(ownRoleId) > 0 &&
    Number.isFinite(Number(ownUserId)) &&
    Number(ownUserId) > 0
      ? `/inicio/roles-usuarios/${Number(ownRoleId)}/${Number(ownUserId)}`
      : "/inicio/roles-usuarios";
  const effectiveMenuItems =
    roleKey === "coach"
      ? menuItems.map((item) =>
          item.label === "Mi perfil" ? { ...item, href: coachProfileHref } : item
        )
      : menuItems;
  const [isOpen, setIsOpen] = useState(false);

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

      <nav className="flex-1 space-y-2 p-4">
        {effectiveMenuItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setIsOpen(false)}
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
    </>
  );
}
