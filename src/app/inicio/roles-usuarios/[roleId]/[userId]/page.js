import Link from "next/link";
import AthleteAssignedRoutinesList from "@/components/roles/AthleteAssignedRoutinesList";
import AthleteCoachLinkCard from "@/components/roles/AthleteCoachLinkCard";
import AthleteRoutineAssignment from "@/components/roles/AthleteRoutineAssignment";
import BackNavButton from "@/components/BackNavButton";
import Icon from "@/components/ui/Icon";
import PageHeader from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/Card";
import { Alert, EmptyState } from "@/components/ui/Feedback";
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

  const roleLabel = userRoleName || (role ? role.name : `Rol #${roleId}`);
  const userLabel = user ? user.username || `Usuario #${user.id}` : `Usuario #${userId}`;

  // La miga intermedia cambia si se llego desde la ficha de un coach: asi la
  // ruta de vuelta refleja el camino real y no uno inventado.
  const breadcrumbs = [
    { href: "/inicio", label: "Panel" },
    { href: "/inicio/roles-usuarios", label: "Roles y usuarios" },
    { href: `/inicio/roles-usuarios/${roleId}`, label: roleLabel },
    ...(coachId ? [{ href: `/inicio/roles-usuarios/${roleId}/${coachId}`, label: "Coach" }] : []),
    { label: userLabel },
  ];

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Perfil de usuario"
        title={userLabel}
        breadcrumbs={breadcrumbs}
        meta={
          <>
            <span className="r360-badge r360-badge-acento">
              <Icon name={isAthleteProfile ? "perfil" : isCoachProfile ? "usuarios" : "gym"} />
              {roleLabel}
            </span>
            {user ? <span className="r360-badge r360-badge-neutro">ID {user.id}</span> : null}
            {user?.email ? (
              <span className="r360-badge r360-badge-neutro">{user.email}</span>
            ) : null}
          </>
        }
        actions={
          <BackNavButton
            fallbackHref={backFallbackHref}
            allowHistoryBack={!cameFromRoutineDetail}
            className="r360-btn r360-btn-ghost"
          >
            <Icon name="atras" />
            Volver
          </BackNavButton>
        }
      />

      {errorMessage ? <Alert title="No se pudo cargar el perfil">{errorMessage}</Alert> : null}

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
          <SectionCard
            title="Rutinas del coach"
            description="Rutinas creadas por este coach y a quien estan asignadas."
            icon={<Icon name="rutinas" className="text-acento" />}
          >
            <CoachRoutinesList
              roleId={roleId}
              userId={user.id}
              routines={coachRoutines}
              assignmentsByRoutineId={coachAssignmentsByRoutineId}
            />
          </SectionCard>

          <SectionCard
            title="Atletas asignados"
            description="Atletas vinculados a este coach dentro del gimnasio."
            icon={<Icon name="usuarios" className="text-acento" />}
          >
            <CoachAthleteAssignment
              coachId={user.id}
              athletes={availableAthletes}
              athleteRoleId={athleteRoleId}
            />
            {assignedAthletes.length === 0 ? (
              <EmptyState
                className="mt-4"
                icon="usuarios"
                title="Este coach no tiene atletas asignados"
                description="Usa el buscador de arriba para vincular atletas del gimnasio."
              />
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                {assignedAthletes.map((link) => (
                  <article key={link.id} className="r360-card-inset p-4">
                    <div className="flex items-center gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-acento/35 bg-acento/10 text-sm font-bold text-acento">
                        {String(link?.athlete?.username || "?").charAt(0).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-texto">
                          {link?.athlete?.username || `Atleta #${link.idAthlete}`}
                        </p>
                        <p className="truncate text-xs text-texto-3">
                          {link?.athlete?.email || "Sin email"}
                        </p>
                      </div>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <dt className="text-texto-3">Disponibilidad</dt>
                        <dd className="mt-0.5 text-texto-2">
                          {link?.athlete?.weeklyAvailability || "Sin dato"}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-texto-3">Alta del vinculo</dt>
                        <dd className="mt-0.5 text-texto-2">{formatDate(link?.createdAt)}</dd>
                      </div>
                    </dl>
                    {athleteRoleId ? (
                      <Link
                        href={`/inicio/roles-usuarios/${athleteRoleId}/${link.idAthlete}?coachId=${user.id}`}
                        className="r360-btn r360-btn-accent r360-btn-sm mt-3 w-full"
                      >
                        Ir al perfil del atleta
                        <Icon name="chevron" />
                      </Link>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </SectionCard>
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
        <SectionCard
          title="Rutinas asignadas al atleta"
          description="Rutinas activas que el atleta ve en la app."
          icon={<Icon name="rutinas" className="text-acento" />}
        >
          {assignedRoutinesError ? (
            <Alert tone="aviso" className="mb-4">
              {assignedRoutinesError}
            </Alert>
          ) : null}
          <AthleteAssignedRoutinesList
            roleId={roleId}
            athleteId={user.id}
            coachId={coachId || ""}
            assignments={athleteAssignedRoutines}
          />
        </SectionCard>
      ) : null}
    </section>
  );
}
