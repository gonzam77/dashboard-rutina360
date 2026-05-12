import Link from "next/link";
import { cookies } from "next/headers";
import CoachRoutinesList from "@/components/roles/CoachRoutinesList";
import AthleteRoutineAssignment from "@/components/roles/AthleteRoutineAssignment";
import AthleteAssignedRoutinesList from "@/components/roles/AthleteAssignedRoutinesList";
import CoachAthleteAssignment from "@/components/roles/CoachAthleteAssignment";
import BackNavButton from "@/components/BackNavButton";
import UserProfileEditor from "@/components/roles/UserProfileEditor";
import AthleteCoachLinkCard from "@/components/roles/AthleteCoachLinkCard";
import { normalizeRoleKey, parseSessionUserCookie } from "@/lib/session";

const ROLES_URL = "https://rutina360-server.onrender.com/rol";
const USERS_URL = "https://rutina360-server.onrender.com/users";
const ROUTINES_URL = "https://rutina360-server.onrender.com/routine";
const USER_LINKS_URL = "https://rutina360-server.onrender.com/users/link";
const ATHLETE_ASSIGNED_ROUTINES_URL = "https://rutina360-server.onrender.com/routine/assign/athlete/";

async function fetchList(url, fallbackMessage, token) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(json?.message || fallbackMessage);
  }

  return Array.isArray(json?.data) ? json.data : [];
}

async function fetchListSafe(url, token) {
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

function formatDate(value) {
  if (!value) {
    return "Sin dato";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sin dato";
  }

  return date.toLocaleDateString("es-AR");
}

function isAthleteRoleName(value) {
  return ["athlete", "atleta"].includes(String(value || "").trim().toLowerCase());
}

function isAdminOrGymRoleName(value) {
  return ["admin", "administrador", "gym", "gimnasio"].includes(
    String(value || "").trim().toLowerCase()
  );
}

function isGymRoleName(value) {
  return ["gym", "gimnasio"].includes(String(value || "").trim().toLowerCase());
}

function resolveGymOwnerId(candidate) {
  if (!candidate) {
    return null;
  }

  const roleName = candidate?.Rol?.name || "";
  if (isAdminOrGymRoleName(roleName)) {
    const ownId = Number(candidate?.id);
    return Number.isFinite(ownId) && ownId > 0 ? ownId : null;
  }

  const ownerId = Number(candidate?.idAdminOwner);
  return Number.isFinite(ownerId) && ownerId > 0 ? ownerId : null;
}

function getRoutineOwnerCandidate(routine) {
  return (
    routine?.creator ||
    routine?.Creator ||
    routine?.User ||
    routine?.user ||
    routine?.Owner ||
    routine?.owner ||
    routine?.Coach ||
    routine?.coach ||
    null
  );
}

function getOwnerRoleName(ownerUser, ownerFromRoutine) {
  return String(
    ownerUser?.Rol?.name ||
    ownerFromRoutine?.Rol?.name ||
    ownerFromRoutine?.role?.name ||
    ownerFromRoutine?.Role?.name ||
    ""
  ).trim().toLowerCase();
}

async function fetchAthleteAssignedRoutines(athleteId, token) {
  const response = await fetch(`${ATHLETE_ASSIGNED_ROUTINES_URL}${athleteId}`, {
    cache: "no-store",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const json = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(json?.message || "No se pudieron cargar las rutinas asignadas al atleta.");
  }

  return Array.isArray(json?.data) ? json.data : [];
}

export default async function UserProfilePage({ params, searchParams }) {
  const { roleId, userId } = await params;
  const { coachId, from } = await searchParams;
  const normalizedCoachId = Number(coachId);
  const cameFromRoutineDetail = String(from || "").trim().toLowerCase() === "routine";
  let viewerRoleKey = "unknown";
  let viewerUserId = null;
  let viewerRoleName = "";

  let errorMessage = "";
  let role = null;
  let user = null;
  let users = [];
  let userRoleName = "";
  let athleteRoleId = null;
  let routines = [];
  let userLinks = [];
  let coachRoutines = [];
  let assignedAthletes = [];
  let athleteAssignedRoutines = [];
  let availableAthletes = [];

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    const sessionUser = parseSessionUserCookie(cookieStore.get("session_user")?.value);
    viewerRoleKey = normalizeRoleKey(sessionUser?.roleName);
    viewerUserId = Number(sessionUser?.id) || null;
    viewerRoleName = String(sessionUser?.roleName || "").trim().toLowerCase();

    // Roles y usuarios son el minimo necesario para renderizar el perfil.
    const [roles, fetchedUsers] = await Promise.all([
      fetchList(ROLES_URL, "No se pudieron cargar los roles.", token),
      fetchList(USERS_URL, "No se pudieron cargar los usuarios.", token),
    ]);
    users = fetchedUsers;

    // Estos recursos pueden fallar por permisos de rol; la vista sigue operativa con estados vacios.
    const [fetchedRoutines, fetchedUserLinks] = await Promise.all([
      fetchListSafe(ROUTINES_URL, token),
      fetchListSafe(USER_LINKS_URL, token),
    ]);
    routines = fetchedRoutines;
    userLinks = fetchedUserLinks;

    role = roles.find((item) => String(item?.id) === String(roleId)) || null;
    const athleteRole = roles.find((item) => isAthleteRoleName(item?.name));
    athleteRoleId = Number(athleteRole?.id) || null;
    user = users.find((item) => String(item?.id) === String(userId)) || null;
    userRoleName = user?.Rol?.name || role?.name || "";

    const isCoach = userRoleName.trim().toLowerCase() === "coach";

    if (isCoach && user) {
      coachRoutines = routines.filter((routine) => String(routine?.idUser) === String(user.id));
      assignedAthletes = userLinks.filter((link) => String(link?.idCoach) === String(user.id));

      const assignedAthleteIds = new Set(assignedAthletes.map((link) => String(link?.idAthlete)));
      availableAthletes = users.filter((candidate) => {
        if (!candidate || String(candidate?.id) === String(user.id)) {
          return false;
        }

        const roleName = candidate?.Rol?.name || "";
        if (!isAthleteRoleName(roleName)) {
          return false;
        }

        return !assignedAthleteIds.has(String(candidate?.id));
      });
    }

    if (!isCoach && user && isAthleteRoleName(userRoleName)) {
      try {
        athleteAssignedRoutines = await fetchAthleteAssignedRoutines(user.id, token);
      } catch {
        athleteAssignedRoutines = [];
      }
    }
  } catch (error) {
    errorMessage = error.message;
  }

  if (!errorMessage && !user) {
    errorMessage = `No se encontro el usuario #${userId}.`;
  }

  const isCoachProfile = userRoleName.trim().toLowerCase() === "coach";
  const isAthleteProfile = isAthleteRoleName(userRoleName);
  const isViewerGym = isGymRoleName(viewerRoleName);
  const viewerUser = users.find((item) => Number(item?.id) === Number(viewerUserId)) || null;
  const viewerGymOwnerId = resolveGymOwnerId(viewerUser);
  const fallbackCoachId = viewerRoleKey === "coach" ? viewerUserId : null;
  const fallbackGymId = isViewerGym ? viewerUserId : null;
  const effectiveCoachId =
    Number.isFinite(normalizedCoachId) && normalizedCoachId > 0
      ? normalizedCoachId
      : Number.isFinite(fallbackCoachId) && fallbackCoachId > 0
        ? fallbackCoachId
        : Number.isFinite(fallbackGymId) && fallbackGymId > 0
          ? fallbackGymId
        : null;
  const backFallbackHref = effectiveCoachId
    ? `/inicio/roles-usuarios/${roleId}/${effectiveCoachId}`
    : `/inicio/roles-usuarios/${roleId}`;
  const selectedCoachUser = effectiveCoachId
    ? users.find((item) => Number(item?.id) === Number(effectiveCoachId)) || null
    : null;
  const athleteGymOwnerId = Number(user?.idAdminOwner) || Number(user?.adminOwner?.id) || null;
  const selectedCoachGymOwnerId = resolveGymOwnerId(selectedCoachUser);
  const targetGymOwnerId = selectedCoachGymOwnerId || athleteGymOwnerId || null;
  const assignableRoutinesWithinGym = routines.filter((routine) => {
    const routineOwnerId = Number(routine?.idUser);
    if (!Number.isFinite(routineOwnerId) || routineOwnerId <= 0) {
      return false;
    }

    const ownerUser = users.find((item) => Number(item?.id) === routineOwnerId) || null;
    const ownerFromRoutine = getRoutineOwnerCandidate(routine);
    const ownerRoleName = getOwnerRoleName(ownerUser, ownerFromRoutine);
    const ownerGymOwnerId = resolveGymOwnerId(ownerUser) || resolveGymOwnerId(ownerFromRoutine);

    if (viewerRoleKey === "coach") {
      if (routineOwnerId === Number(viewerUserId)) {
        return true;
      }

      if (targetGymOwnerId && routineOwnerId === Number(targetGymOwnerId)) {
        return true;
      }

      if (ownerRoleName === "coach" && targetGymOwnerId && ownerGymOwnerId === Number(targetGymOwnerId)) {
        return true;
      }

      return false;
    }

    if (viewerRoleKey === "admin") {
      if (routineOwnerId === Number(viewerUserId)) {
        return true;
      }

      if (ownerRoleName === "coach" && ownerGymOwnerId === Number(viewerUserId)) {
        return true;
      }

      return false;
    }

    if (routineOwnerId === Number(effectiveCoachId)) {
      return true;
    }

    if (targetGymOwnerId && routineOwnerId === Number(targetGymOwnerId)) {
      return true;
    }

    if (targetGymOwnerId && resolveGymOwnerId(ownerUser) === Number(targetGymOwnerId)) {
      return true;
    }

    return targetGymOwnerId && resolveGymOwnerId(ownerFromRoutine) === Number(targetGymOwnerId);
  });
  const athleteLink =
    isAthleteProfile && user
      ? userLinks.find((link) => Number(link?.idAthlete) === Number(user.id)) ||
        userLinks.find((link) => Number(link?.athlete?.id) === Number(user.id)) ||
        null
      : null;
  const athleteCoachLinks =
    isAthleteProfile && user
      ? userLinks.filter(
          (link) =>
            (Number(link?.idAthlete) === Number(user.id) || Number(link?.athlete?.id) === Number(user.id)) &&
            link?.isDeleted !== true &&
            link?.isActive !== false
        )
      : [];
  const assignedCoaches = Array.from(
    new Map(
      athleteCoachLinks
        .map((link) => {
          const coachId = Number(link?.idCoach || link?.coach?.id);
          if (!Number.isFinite(coachId) || coachId <= 0) {
            return null;
          }

          const coachUser =
            link?.coach ||
            users.find((item) => Number(item?.id) === coachId) ||
            null;

          return [
            String(coachId),
            {
              id: coachId,
              username: coachUser?.username || `Coach #${coachId}`,
              email: coachUser?.email || "",
            },
          ];
        })
        .filter(Boolean)
    ).values()
  );
  const assignedCoachIds = new Set(assignedCoaches.map((coachItem) => Number(coachItem.id)));
  const availableCoaches = users.filter((candidate) => {
    const candidateRoleName = String(candidate?.Rol?.name || "").trim().toLowerCase();
    if (candidateRoleName !== "coach") {
      return false;
    }

    const candidateId = Number(candidate?.id);
    if (!Number.isFinite(candidateId) || candidateId <= 0) {
      return false;
    }

    if (assignedCoachIds.has(candidateId)) {
      return false;
    }

    if (!targetGymOwnerId) {
      return true;
    }

    return resolveGymOwnerId(candidate) === Number(targetGymOwnerId);
  });
  const assignedCoachId = Number(athleteLink?.idCoach) || null;
  const assignedCoachUser =
    athleteLink?.coach ||
    (assignedCoachId ? users.find((item) => Number(item?.id) === assignedCoachId) || null : null);

  const assignmentRoutineGroups = (() => {
    const source = Array.isArray(assignableRoutinesWithinGym) ? assignableRoutinesWithinGym : [];
    const own = [];
    const others = [];
    const gym = [];
    const groupGymOwnerId = Number(targetGymOwnerId) || Number(viewerGymOwnerId) || null;

    for (const routine of source) {
      const ownerId = Number(routine?.idUser);
      if (!Number.isFinite(ownerId) || ownerId <= 0) {
        continue;
      }

      const ownerUser = users.find((item) => Number(item?.id) === ownerId) || null;
      const ownerFromRoutine = getRoutineOwnerCandidate(routine);
      const ownerRoleName = getOwnerRoleName(ownerUser, ownerFromRoutine);
      const ownerGymOwnerId = resolveGymOwnerId(ownerUser) || resolveGymOwnerId(ownerFromRoutine);

      if (viewerRoleKey === "coach") {
        if (ownerId === Number(viewerUserId)) {
          own.push(routine);
          continue;
        }

        if (groupGymOwnerId && ownerId === Number(groupGymOwnerId)) {
          gym.push(routine);
          continue;
        }

        if (ownerRoleName === "coach" && ownerGymOwnerId && groupGymOwnerId && ownerGymOwnerId === groupGymOwnerId) {
          others.push(routine);
          continue;
        }

        if (isAdminOrGymRoleName(ownerRoleName) && groupGymOwnerId && ownerId === groupGymOwnerId) {
          gym.push(routine);
          continue;
        }

        if (ownerGymOwnerId && groupGymOwnerId && ownerGymOwnerId === groupGymOwnerId) {
          others.push(routine);
          continue;
        }
      }

      if (viewerRoleKey === "admin") {
        if (ownerId === Number(viewerUserId)) {
          own.push(routine);
          continue;
        }

        if (ownerRoleName === "coach" && ownerGymOwnerId && ownerGymOwnerId === Number(viewerUserId)) {
          others.push(routine);
          continue;
        }
      }
    }

    if (viewerRoleKey === "coach") {
      return {
        own,
        others,
        gym,
      };
    }

    if (viewerRoleKey === "admin") {
      return {
        own,
        others,
      };
    }

    return {
      own: source,
      others: [],
      gym: [],
    };
  })();

  return (
    <section className="space-y-6 text-slate-100">
      <header className="rounded-3xl border border-white/15 bg-[#0f2a46] p-8 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Rutina360</p>
            <h1 className="mt-1 text-3xl font-extrabold text-white">Perfil de usuario</h1>
            <p className="mt-2 text-white/80">
              {user ? `${user.username} · Usuario #${user.id}` : `Usuario #${userId}`}
            </p>
            <p className="mt-1 text-sm text-cyan-300">
              Rol: {userRoleName || (role ? role.name : `#${roleId}`)}
            </p>
          </div>
          <BackNavButton
            fallbackHref={backFallbackHref}
            allowHistoryBack={!cameFromRoutineDetail}
            className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Volver a usuarios
          </BackNavButton>
        </div>
      </header>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-300/40 bg-red-950/40 p-4 text-red-200">
          {errorMessage}
        </div>
      ) : null}

      {!errorMessage && user ? (
        isAthleteProfile ? (
          <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <UserProfileEditor user={user} roleName={userRoleName} />
            <AthleteCoachLinkCard
              roleId={roleId}
              athleteId={user.id}
              coach={assignedCoachUser}
              assignedCoaches={assignedCoaches}
              availableCoaches={availableCoaches}
            />
          </section>
        ) : (
          <UserProfileEditor user={user} roleName={userRoleName} />
        )
      ) : null}

      {!errorMessage && user && isCoachProfile ? (
        <section className="rounded-3xl border border-white/15 bg-[#17385a] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
          <h2 className="text-lg font-bold text-white">Rutinas del coach</h2>
          <CoachRoutinesList
            roleId={roleId}
            userId={user.id}
            coachId={user.id}
            routines={coachRoutines}
            viewerRoleKey={viewerRoleKey}
          />
        </section>
      ) : null}

      {!errorMessage && user && isCoachProfile ? (
        <section className="rounded-3xl border border-white/15 bg-[#17385a] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
          <h2 className="text-lg font-bold text-white">Atletas asignados</h2>
          <CoachAthleteAssignment coachId={user.id} athletes={availableAthletes} athleteRoleId={athleteRoleId} />
          {assignedAthletes.length === 0 ? (
            <p className="mt-3 text-sm text-white/75">Este coach no tiene atletas asignados.</p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {assignedAthletes.map((link) => (
                <article
                  key={link.id}
                  className="rounded-2xl border border-white/15 bg-[#0f2a46] p-4 shadow-[0_6px_18px_rgba(0,0,0,0.22)]"
                >
                  <p className="text-xs uppercase tracking-wide text-white/60">Vinculo #{link.id}</p>
                  <p className="mt-1 font-semibold text-white">
                    {link?.athlete?.username || `Atleta #${link.idAthlete}`}
                  </p>
                  <p className="mt-2 text-sm text-white/80">
                    Email: {link?.athlete?.email || "Sin dato"}
                  </p>
                  <p className="text-sm text-white/80">
                    Disponibilidad: {link?.athlete?.weeklyAvailability || "Sin dato"}
                  </p>
                  <p className="text-sm text-white/80">
                    Alta del vinculo: {formatDate(link?.createdAt)}
                  </p>
                  <Link
                    href={`/inicio/roles-usuarios/${roleId}/${link.idAthlete}?coachId=${user.id}`}
                    className="mt-3 inline-block rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
                  >
                    Ir al perfil del atleta
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {!errorMessage && user && isAthleteProfile && effectiveCoachId ? (
        <AthleteRoutineAssignment
          athleteId={user.id}
          coachId={effectiveCoachId}
          coachRoutines={assignableRoutinesWithinGym}
          assignedRoutines={athleteAssignedRoutines}
          viewerRoleKey={viewerRoleKey}
          routineGroups={assignmentRoutineGroups}
        />
      ) : null}

      {!errorMessage && user && isAthleteProfile ? (
        <section className="rounded-3xl border border-white/15 bg-[#17385a] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
          <h2 className="text-lg font-bold text-white">Rutinas asignadas al atleta</h2>
          <AthleteAssignedRoutinesList
            roleId={roleId}
            athleteId={user.id}
            coachId={effectiveCoachId || ""}
            assignments={athleteAssignedRoutines}
          />
        </section>
      ) : null}
    </section>
  );
}
