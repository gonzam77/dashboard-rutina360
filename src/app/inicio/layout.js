import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SideMenu from "@/components/SideMenu";
import { firstNonEmptyString, normalizeRoleKey, parseSessionUserCookie } from "@/lib/session";

const USERS_URL = "https://rutina360-server.onrender.com/users";

function parseJwtPayload(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length < 2) {
      return null;
    }

    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const normalized = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const payloadJson = Buffer.from(normalized, "base64").toString("utf8");
    return JSON.parse(payloadJson);
  } catch {
    return null;
  }
}

function getUserIdFromJwtPayload(payload) {
  const candidates = [payload?.idUser, payload?.userId, payload?.id, payload?.sub];

  for (const value of candidates) {
    const id = Number(value);
    if (Number.isFinite(id) && id > 0) {
      return id;
    }
  }

  return null;
}

function resolveRoleLabel(payload) {
  const directRole = firstNonEmptyString([
    payload?.Rol?.name,
    payload?.role,
    payload?.rol,
    payload?.roleName,
    payload?.nombreRol,
  ]);

  if (directRole) {
    return directRole;
  }

  return "Sin rol";
}

async function fetchCurrentUser(token, userId) {
  if (!token || !userId) {
    return null;
  }

  try {
    const response = await fetch(USERS_URL, {
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const json = await response.json().catch(() => ({}));
    const users = Array.isArray(json?.data) ? json.data : [];
    return users.find((user) => Number(user?.id) === Number(userId)) || null;
  } catch {
    return null;
  }
}

export default async function InicioLayout({ children }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    redirect("/login");
  }

  const payload = parseJwtPayload(token);
  const userId = getUserIdFromJwtPayload(payload);
  const sessionUser = parseSessionUserCookie(cookieStore.get("session_user")?.value);
  const currentUser = await fetchCurrentUser(token, userId);

  const username = firstNonEmptyString([
    sessionUser?.username,
    currentUser?.username,
    payload?.username,
    payload?.userName,
    payload?.name,
    payload?.nombre,
    payload?.user?.username,
  ]) || "Usuario";

  const role =
    firstNonEmptyString([sessionUser?.roleName, currentUser?.Rol?.name, resolveRoleLabel(payload)]) || "Sin rol";
  const roleKey = normalizeRoleKey(role);

  if (roleKey === "athlete") {
    redirect("/sin-acceso");
  }

  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      <SideMenu username={username} role={role} roleKey={roleKey} />
      <main className="flex-1 p-6 lg:p-8">{children}</main>
    </div>
  );
}
