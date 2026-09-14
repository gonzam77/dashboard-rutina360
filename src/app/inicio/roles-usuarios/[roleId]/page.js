import Link from "next/link";
import RoleUsersManager from "@/components/roles/RoleUsersManager";
import { getAssignments, getRolesStrict, getUserLinks, getUsersStrict } from "@/lib/backend";
import {
  getUserRoleName,
  isAdminOrGymRoleName,
  isAthleteRoleName,
  isCoachRoleName,
  sameId,
} from "@/lib/roles";
import { getAssignmentAthleteId, getAssignmentRoutineId, isActiveRecord } from "@/lib/routines";
import { getViewer, getViewerGymOwnerId, isSuperAdmin } from "@/lib/viewer";

export const metadata = {
  title: "Usuarios por rol",
};

function resolveOwnerId(user) {
  return Number(user?.idAdminOwner) || Number(user?.adminOwner?.id) || null;
}

function filterUsersByViewerRole({ users, roleName, viewer, viewerGymOwnerId }) {
  if (isSuperAdmin(viewer)) {
    return users;
  }

  if (viewer.roleKey === "admin") {
    return users.filter((user) => {
      const userRoleName = getUserRoleName(user);

      if (!isCoachRoleName(userRoleName) && !isAthleteRoleName(userRoleName)) {
        return false;
      }

      return sameId(resolveOwnerId(user), viewer.id);
    });
  }

  if (viewer.roleKey === "coach") {
    if (!isAthleteRoleName(roleName) || !viewerGymOwnerId) {
      return [];
    }

    return users.filter((user) => sameId(resolveOwnerId(user), viewerGymOwnerId));
  }

  return [];
}

/** Etiquetas de coach por atleta, solo de vinculos activos. */
function buildAthleteCoachLabels(userLinks, allUsers) {
  const nameById = new Map(
    allUsers.map((candidate) => [
      String(candidate?.id),
      candidate?.username || candidate?.email || `Coach #${candidate?.id}`,
    ])
  );

  const labelsByAthleteId = new Map();

  for (const link of userLinks) {
    if (!isActiveRecord(link)) {
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
      nameById.get(String(coachId)) ||
      `Coach #${coachId}`;

    if (!labelsByAthleteId.has(String(athleteId))) {
      labelsByAthleteId.set(String(athleteId), new Set());
    }
    labelsByAthleteId.get(String(athleteId)).add(String(coachLabel));
  }

  return Object.fromEntries(
    Array.from(labelsByAthleteId.entries()).map(([athleteId, labels]) => [
      athleteId,
      Array.from(labels).slice(0, 2),
    ])
  );
}

function buildAthleteRoutineCounts(assignments) {
  const routineIdsByAthleteId = new Map();

  for (const assignment of assignments) {
    if (!isActiveRecord(assignment)) {
      continue;
    }

    const athleteId = getAssignmentAthleteId(assignment);
    const routineId = getAssignmentRoutineId(assignment);

    if (!athleteId || !routineId) {
      continue;
    }

    if (!routineIdsByAthleteId.has(String(athleteId))) {
      routineIdsByAthleteId.set(String(athleteId), new Set());
    }
    routineIdsByAthleteId.get(String(athleteId)).add(String(routineId));
  }

  return Object.fromEntries(
    Array.from(routineIdsByAthleteId.entries()).map(([athleteId, routineIds]) => [
      athleteId,
      routineIds.size,
    ])
  );
}

export default async function RolUsuariosDetallePage({ params }) {
  const { roleId } = await params;

  let role = null;
  let users = [];
  let errorMessage = "";
  let roleKey = "unknown";
  let viewerUserId = null;
  let viewerRoleId = null;
  let gymOwners = [];
  let athleteCoachLabelsByUserId = {};
  let athleteAssignedRoutinesCountByUserId = {};

  try {
    const viewer = await getViewer();

    if (!viewer) {
      throw new Error("No autenticado.");
    }

    roleKey = viewer.roleKey;
    viewerUserId = viewer.id;
    viewerRoleId = viewer.roleId;

    // Una sola lectura de cada recurso: el DAL las memoriza por request.
    const [roles, allUsers, viewerGymOwnerId] = await Promise.all([
      getRolesStrict(viewer.token),
      getUsersStrict(viewer.token),
      getViewerGymOwnerId(),
    ]);

    role = roles.find((item) => String(item?.id) === String(roleId)) || null;

    const usersInRole = allUsers.filter(
      (user) =>
        String(user?.idRole) === String(roleId) || String(user?.Rol?.id) === String(roleId)
    );

    users = filterUsersByViewerRole({
      users: usersInRole,
      roleName: role?.name || "",
      viewer,
      viewerGymOwnerId,
    });

    if (isSuperAdmin(viewer)) {
      gymOwners = allUsers
        .filter((candidate) => isAdminOrGymRoleName(getUserRoleName(candidate)))
        .map((candidate) => ({
          id: candidate.id,
          username: candidate.username || `Gym #${candidate.id}`,
          email: candidate.email || "",
        }))
        .sort((a, b) => String(a.username).localeCompare(String(b.username), "es"));
    }

    if (isAthleteRoleName(role?.name)) {
      const [userLinks, assignments] = await Promise.all([
        getUserLinks(viewer.token),
        getAssignments(viewer.token),
      ]);

      athleteCoachLabelsByUserId = buildAthleteCoachLabels(userLinks, allUsers);
      athleteAssignedRoutinesCountByUserId = buildAthleteRoutineCounts(assignments);
    }
  } catch (error) {
    errorMessage = error?.message || "No se pudieron cargar los usuarios del rol.";
  }

  const shouldShowAssignAthleteButton =
    roleKey === "coach" && isAthleteRoleName(role?.name) && viewerUserId && viewerRoleId;

  return (
    <section className="space-y-6">
      <header className="rounded-3xl border border-white/15 bg-[#0f2a46] p-8 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white">
              {role ? `Usuarios del rol: ${role.name}` : "Usuarios por rol"}
            </h1>
            <p className="mt-3 text-white/80">{role ? `Rol #${role.id}` : `Rol #${roleId}`}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/inicio/roles-usuarios"
              className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Volver a roles
            </Link>
            {shouldShowAssignAthleteButton ? (
              <Link
                href={`/inicio/roles-usuarios/${viewerRoleId}/${viewerUserId}`}
                className="rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/20"
              >
                Asignar nuevo atleta
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-300/40 bg-red-950/40 p-4 text-red-200">
          {errorMessage}
        </div>
      ) : (
        <RoleUsersManager
          roleId={roleId}
          roleName={role?.name || ""}
          users={users}
          viewerRoleKey={roleKey}
          gymOwners={gymOwners}
          athleteCoachLabelsByUserId={athleteCoachLabelsByUserId}
          athleteAssignedRoutinesCountByUserId={athleteAssignedRoutinesCountByUserId}
        />
      )}
    </section>
  );
}
