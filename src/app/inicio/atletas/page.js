import Link from "next/link";
import { cookies } from "next/headers";
import { normalizeRoleKey, parseSessionUserCookie } from "@/lib/session";
import RoleUsersManager from "@/components/roles/RoleUsersManager";

const ROLES_URL = "https://rutina360-server.onrender.com/rol";
const USERS_URL = "https://rutina360-server.onrender.com/users";
const USER_LINKS_URL = "https://rutina360-server.onrender.com/users/link";

function isAthleteRoleName(value) {
  return ["athlete", "atleta"].includes(String(value || "").trim().toLowerCase());
}

async function fetchList(url, token) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    return [];
  }

  const json = await response.json().catch(() => ({}));
  return Array.isArray(json?.data) ? json.data : [];
}

export default async function AtletasPage() {
  let errorMessage = "";
  let athleteUsers = [];
  let athleteRoleId = null;
  let athleteCoachLabelsByUserId = {};
  let roleKey = "unknown";
  let profileHref = "/inicio/roles-usuarios";

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    const sessionUser = parseSessionUserCookie(cookieStore.get("session_user")?.value);
    roleKey = normalizeRoleKey(sessionUser?.roleName);
    const viewerId = Number(sessionUser?.id) || null;
    const viewerRoleId = Number(sessionUser?.idRole) || null;
    if (viewerId && viewerRoleId) {
      profileHref = `/inicio/roles-usuarios/${viewerRoleId}/${viewerId}`;
    }

    const [roles, users, userLinks] = await Promise.all([
      fetchList(ROLES_URL, token),
      fetchList(USERS_URL, token),
      fetchList(USER_LINKS_URL, token),
    ]);

    const athleteRole = roles.find((role) => isAthleteRoleName(role?.name));
    athleteRoleId = Number(athleteRole?.id) || null;

    const viewerUser = users.find((user) => Number(user?.id) === Number(viewerId)) || null;
    const viewerGymOwnerId =
      Number(viewerUser?.idAdminOwner) ||
      Number(viewerUser?.adminOwner?.id) ||
      (roleKey === "admin" ? Number(viewerId) : null);

    athleteUsers = users.filter((user) => {
      const userRoleName = user?.Rol?.name || "";
      if (!isAthleteRoleName(userRoleName)) {
        return false;
      }

      if (roleKey === "super_admin") {
        return true;
      }

      if (!viewerGymOwnerId) {
        return false;
      }

      return (
        Number(user?.idAdminOwner) === Number(viewerGymOwnerId) ||
        Number(user?.adminOwner?.id) === Number(viewerGymOwnerId)
      );
    });

    athleteUsers.sort((a, b) => String(a?.username || "").localeCompare(String(b?.username || ""), "es"));

    const coachNameById = new Map(
      users.map((candidate) => [
        String(candidate?.id),
        candidate?.username || candidate?.email || `Coach #${candidate?.id}`,
      ])
    );

    const labelsByAthleteId = new Map();
    for (const link of Array.isArray(userLinks) ? userLinks : []) {
      if (link?.isDeleted === true || link?.isActive === false) {
        continue;
      }

      const athleteId = Number(link?.idAthlete || link?.athlete?.id);
      const coachId = Number(link?.idCoach || link?.coach?.id);
      if (!Number.isFinite(athleteId) || athleteId <= 0 || !Number.isFinite(coachId) || coachId <= 0) {
        continue;
      }

      const coachLabel =
        link?.coach?.username ||
        link?.coach?.email ||
        coachNameById.get(String(coachId)) ||
        `Coach #${coachId}`;

      if (!labelsByAthleteId.has(String(athleteId))) {
        labelsByAthleteId.set(String(athleteId), new Set());
      }
      labelsByAthleteId.get(String(athleteId)).add(String(coachLabel));
    }

    athleteCoachLabelsByUserId = Object.fromEntries(
      Array.from(labelsByAthleteId.entries()).map(([athleteId, labels]) => [
        athleteId,
        Array.from(labels).slice(0, 2),
      ])
    );
  } catch (error) {
    errorMessage = error.message;
  }

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-white/15 bg-[#0f2a46] p-8 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-extrabold text-white">Atletas del gym</h1>
            <p className="mt-3 text-white/80">Listado completo de atletas visibles y acceso directo a su perfil.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={profileHref}
              className="rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/20"
            >
              Agregar atleta
            </Link>
            <Link
              href="/inicio/roles-usuarios"
              className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Ver roles
            </Link>
          </div>
        </div>
      </header>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-300/40 bg-red-950/40 p-4 text-red-200">{errorMessage}</div>
      ) : null}

      {!errorMessage && !athleteRoleId ? (
        <div className="rounded-2xl border border-amber-300/40 bg-amber-950/40 p-4 text-amber-100">
          No se encontro el rol de atleta en el sistema.
        </div>
      ) : null}

      {!errorMessage && athleteRoleId ? (
        <RoleUsersManager
          roleId={athleteRoleId}
          roleName="athlete"
          users={athleteUsers}
          viewerRoleKey={roleKey}
          athleteCoachLabelsByUserId={athleteCoachLabelsByUserId}
        />
      ) : null}
    </section>
  );
}
