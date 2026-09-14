import Link from "next/link";
import AthleteAssignedRoutinesList from "@/components/roles/AthleteAssignedRoutinesList";
import AthleteCoachLinkCard from "@/components/roles/AthleteCoachLinkCard";
import AthleteRoutineAssignment from "@/components/roles/AthleteRoutineAssignment";
import BackNavButton from "@/components/BackNavButton";
import CoachAthleteAssignment from "@/components/roles/CoachAthleteAssignment";
import CoachRoutinesList from "@/components/roles/CoachRoutinesList";
import UserProfileEditor from "@/components/roles/UserProfileEditor";
import {
  getAssignments,
  getAthleteAssignedRoutines,
  getRolesStrict,
  getRoutines,
  getUserLinks,
  getUsersStrict,
} from "@/lib/backend";
import {
  getUserRoleName,
  isAdminOrGymRoleName,
  isAthleteRoleName,
  isCoachRoleName,
  resolveGymOwnerId,
  sameId,
} from "@/lib/roles";
import {
  getAssignmentAthleteId,
  getAssignmentRoutineId,
  getRoutineOwnerCandidate,
  getRoutineOwnerId,
  isActiveRecord,
} from "@/lib/routines";
import { canManageUser, getViewer, getViewerGymOwnerId, isSuperAdmin } from "@/lib/viewer";

export const metadata = {
  title: "Perfil de usuario",
};

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

/**
 * Rutinas que se le pueden asignar a este atleta, con la misma regla que aplica
 * /api/routines/assign: propias, o del mismo gimnasio que el atleta.
 * Que la UI y la API usen el mismo criterio evita ofrecer acciones que fallan.
 */
function buildAssignableRoutines({ routines, usersById, viewer, athlete }) {
  const athleteGymOwnerId = resolveGymOwnerId(athlete);
  const groups = { own: [], gym: [], others: [] };
  const assignable = [];

  for (const routine of routines) {
    const ownerId = getRoutineOwnerId(routine);

    if (!ownerId) {
      continue;
    }

    const owner = usersById.get(String(ownerId)) || getRoutineOwnerCandidate(routine);
    const ownerGymOwnerId = resolveGymOwnerId(owner);

    const isVisible =
      isSuperAdmin(viewer) ||
      sameId(ownerId, viewer.id) ||
      sameId(ownerId, athleteGymOwnerId) ||
      sameId(ownerGymOwnerId, athleteGymOwnerId);

    if (!isVisible) {
      continue;
    }

    assignable.push(routine);

    if (sameId(ownerId, viewer.id)) {
      groups.own.push(routine);
      continue;
    }

    if (sameId(ownerId, athleteGymOwnerId) || isAdminOrGymRoleName(getUserRoleName(owner))) {
      groups.gym.push(routine);
      continue;
    }

    groups.others.push(routine);
  }

  return { assignable, groups };
}

export default async function UserProfilePage({ params, searchParams }) {
  const { roleId, userId } = await params;
  const { coachId, from } = await searchParams;
  const cameFromRoutineDetail = String(from || "").trim().toLowerCase() === "routine";

  let errorMessage = "";
  let viewerRoleKey = "unknown";
  let role = null;
  let user = null;
  let userRoleName = "";
  let athleteRoleId = null;
  let coachRoutines = [];
  let assignedAthletes = [];
  let availableAthletes = [];
  let assignedCoaches = [];
  let availableCoaches = [];
  let athleteAssignedRoutines = [];
  let assignableRoutines = [];
  let routineGroups = { own: [], gym: [], others: [] };
  let coachAssignmentsByRoutineId = {};
  let canAssignRoutines = false;
  let assignedRoutinesError = "";

  try {
    const viewer = await getViewer();

    if (!viewer) {
      throw new Error("No autenticado.");
    }

    viewerRoleKey = viewer.roleKey;

    const [roles, users, gymOwnerId] = await Promise.all([
      getRolesStrict(viewer.token),
      getUsersStrict(viewer.token),
      getViewerGymOwnerId(),
    ]);

    role = roles.find((item) => String(item?.id) === String(roleId)) || null;
    athleteRoleId = Number(roles.find((item) => isAthleteRoleName(item?.name))?.id) || null;
    user = users.find((item) => String(item?.id) === String(userId)) || null;

    if (!user) {
      throw new Error(`No se encontro el usuario #${userId}.`);
    }

    if (!canManageUser({ viewer, viewerGymOwnerId: gymOwnerId, targetUser: user })) {
      throw new Error("No tenes permisos para ver este perfil.");
    }

    userRoleName = getUserRoleName(user) || role?.name || "";

    const usersById = new Map(users.map((item) => [String(item?.id), item]));
    const isCoachProfile = isCoachRoleName(userRoleName);
    const isAthleteProfile = isAthleteRoleName(userRoleName);

    if (isCoachProfile) {
      const [routines, userLinks, assignments] = await Promise.all([
        getRoutines(viewer.token),
        getUserLinks(viewer.token),
        getAssignments(viewer.token),
      ]);

      const coachGymOwnerId = resolveGymOwnerId(user);

      coachRoutines = routines.filter((routine) => sameId(getRoutineOwnerId(routine), user.id));

      // Quien tiene cada rutina: se usa para avisar antes de una eliminacion en cascada.
      const athleteNamesByRoutineId = new Map();

      for (const assignment of assignments) {
        if (!isActiveRecord(assignment)) {
          continue;
        }

        const routineId = getAssignmentRoutineId(assignment);
        const athleteId = getAssignmentAthleteId(assignment);

        if (!routineId || !athleteId) {
          continue;
        }

        if (!athleteNamesByRoutineId.has(String(routineId))) {
          athleteNamesByRoutineId.set(String(routineId), new Map());
        }

        athleteNamesByRoutineId
          .get(String(routineId))
          .set(String(athleteId), assignment?.athlete?.username || `Atleta #${athleteId}`);
      }

      coachAssignmentsByRoutineId = Object.fromEntries(
        Array.from(athleteNamesByRoutineId.entries()).map(([routineId, names]) => [
          routineId,
          { athleteNames: Array.from(names.values()) },
        ])
      );
      assignedAthletes = userLinks.filter(
        (link) => sameId(link?.idCoach || link?.coach?.id, user.id) && isActiveRecord(link)
      );

      const assignedAthleteIds = new Set(
        assignedAthletes.map((link) => String(link?.idAthlete || link?.athlete?.id))
      );

      // Solo atletas del mismo gimnasio que el coach.
      availableAthletes = users.filter((candidate) => {
        if (sameId(candidate?.id, user.id) || assignedAthleteIds.has(String(candidate?.id))) {
          return false;
        }

        if (!isAthleteRoleName(getUserRoleName(candidate))) {
          return false;
        }

        return !coachGymOwnerId || sameId(resolveGymOwnerId(candidate), coachGymOwnerId);
      });
    }

    if (isAthleteProfile) {
      const [routines, userLinks] = await Promise.all([
        getRoutines(viewer.token),
        getUserLinks(viewer.token),
      ]);

      // Seccion secundaria: si falla se avisa ahi, sin tumbar el resto del perfil.
      try {
        athleteAssignedRoutines = await getAthleteAssignedRoutines(viewer.token, user.id);
      } catch (assignedError) {
        assignedRoutinesError =
          assignedError?.message || "No se pudieron cargar las rutinas asignadas al atleta.";
      }

      const athleteGymOwnerId = resolveGymOwnerId(user);
      const athleteLinks = userLinks.filter(
        (link) => sameId(link?.idAthlete || link?.athlete?.id, user.id) && isActiveRecord(link)
      );

      assignedCoaches = Array.from(
        new Map(
          athleteLinks
            .map((link) => {
              const linkedCoachId = Number(link?.idCoach || link?.coach?.id);

              if (!Number.isFinite(linkedCoachId) || linkedCoachId <= 0) {
                return null;
              }

              const coachUser = link?.coach || usersById.get(String(linkedCoachId)) || null;

              return [
                String(linkedCoachId),
                {
                  id: linkedCoachId,
                  username: coachUser?.username || `Coach #${linkedCoachId}`,
                  email: coachUser?.email || "",
                },
              ];
            })
            .filter(Boolean)
        ).values()
      );

      const assignedCoachIds = new Set(assignedCoaches.map((item) => Number(item.id)));

      availableCoaches = users.filter((candidate) => {
        if (!isCoachRoleName(getUserRoleName(candidate)) || assignedCoachIds.has(Number(candidate?.id))) {
          return false;
        }

        return !athleteGymOwnerId || sameId(resolveGymOwnerId(candidate), athleteGymOwnerId);
      });

      const built = buildAssignableRoutines({ routines, usersById, viewer, athlete: user });
      assignableRoutines = built.assignable;
      routineGroups = built.groups;
      canAssignRoutines = true;
    }
  } catch (error) {
    errorMessage = error?.message || "No se pudo cargar el perfil.";
  }

  const isCoachProfile = isCoachRoleName(userRoleName);
  const isAthleteProfile = isAthleteRoleName(userRoleName);
  const backFallbackHref = coachId
    ? `/inicio/roles-usuarios/${roleId}/${coachId}`
    : `/inicio/roles-usuarios/${roleId}`;

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
              assignedCoaches={assignedCoaches}
              availableCoaches={availableCoaches}
            />
          </section>
        ) : (
          <UserProfileEditor user={user} roleName={userRoleName} />
        )
      ) : null}

      {!errorMessage && user && isCoachProfile ? (
        <>
          <section className="rounded-3xl border border-white/15 bg-[#17385a] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
            <h2 className="text-lg font-bold text-white">Rutinas del coach</h2>
            <CoachRoutinesList
              roleId={roleId}
              userId={user.id}
              routines={coachRoutines}
              assignmentsByRoutineId={coachAssignmentsByRoutineId}
            />
          </section>

          <section className="rounded-3xl border border-white/15 bg-[#17385a] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
            <h2 className="text-lg font-bold text-white">Atletas asignados</h2>
            <CoachAthleteAssignment
              coachId={user.id}
              athletes={availableAthletes}
              athleteRoleId={athleteRoleId}
            />
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
                    {athleteRoleId ? (
                      <Link
                        href={`/inicio/roles-usuarios/${athleteRoleId}/${link.idAthlete}?coachId=${user.id}`}
                        className="mt-3 inline-block rounded-lg border border-cyan-300/40 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20"
                      >
                        Ir al perfil del atleta
                      </Link>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}

      {!errorMessage && user && isAthleteProfile && canAssignRoutines ? (
        <AthleteRoutineAssignment
          athleteId={user.id}
          availableRoutines={assignableRoutines}
          assignedRoutines={athleteAssignedRoutines}
          viewerRoleKey={viewerRoleKey}
          routineGroups={routineGroups}
        />
      ) : null}

      {!errorMessage && user && isAthleteProfile ? (
        <section className="rounded-3xl border border-white/15 bg-[#17385a] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
          <h2 className="text-lg font-bold text-white">Rutinas asignadas al atleta</h2>
          {assignedRoutinesError ? (
            <p className="mt-3 rounded-xl border border-amber-300/40 bg-amber-900/30 p-3 text-sm text-amber-100">
              {assignedRoutinesError}
            </p>
          ) : null}
          <AthleteAssignedRoutinesList
            roleId={roleId}
            athleteId={user.id}
            coachId={coachId || ""}
            assignments={athleteAssignedRoutines}
          />
        </section>
      ) : null}
    </section>
  );
}
