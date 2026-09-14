import Link from "next/link";
import { redirect } from "next/navigation";
import CoachCreateRoutineButton from "@/components/roles/CoachCreateRoutineButton";
import RoutineDeleteButton from "@/components/roles/RoutineDeleteButton";
import Icon from "@/components/ui/Icon";
import PageHeader from "@/components/ui/PageHeader";
import { Card, SectionCard } from "@/components/ui/Card";
import { Alert, EmptyState, StatCard } from "@/components/ui/Feedback";
import { getAssignmentsStrict, getRoutinesStrict, getUsersStrict } from "@/lib/backend";
import { getUserRoleName, isAdminOrGymRoleName, resolveGymOwnerId, sameId } from "@/lib/roles";
import {
  getAssignmentRoutineId,
  getRoutineExercises,
  getRoutineOwnerCandidate,
  getRoutineOwnerId,
  isActiveRecord,
} from "@/lib/routines";
import { canManageRoutine, getViewer, getViewerGymOwnerId, isSuperAdmin } from "@/lib/viewer";

export const metadata = {
  title: "Rutinas creadas",
};

function getCreatorLabel(creator, creatorId) {
  return (
    creator?.username || creator?.email || (creatorId ? `Usuario #${creatorId}` : "Sin creador")
  );
}

function getAthleteLabel(assignment) {
  return (
    assignment?.athlete?.username ||
    assignment?.athlete?.email ||
    (assignment?.idAthlete ? `Usuario #${assignment.idAthlete}` : "Usuario sin dato")
  );
}

function buildRoutineRows(routines, assignments, users) {
  const routinesById = new Map();
  const usersById = new Map(users.map((user) => [String(user.id), user]));
  const athleteNamesByRoutineId = new Map();

  for (const routine of routines) {
    if (routine?.id) {
      routinesById.set(String(routine.id), routine);
    }
  }

  for (const assignment of assignments) {
    const nestedRoutine = assignment?.Routine;

    if (nestedRoutine?.id && !routinesById.has(String(nestedRoutine.id))) {
      routinesById.set(String(nestedRoutine.id), nestedRoutine);
    }

    const routineId = getAssignmentRoutineId(assignment);

    if (!routineId || !isActiveRecord(assignment)) {
      continue;
    }

    const key = String(routineId);
    const athleteKey = assignment?.idAthlete
      ? String(assignment.idAthlete)
      : `assignment-${assignment.id}`;

    if (!athleteNamesByRoutineId.has(key)) {
      athleteNamesByRoutineId.set(key, new Map());
    }
    athleteNamesByRoutineId.get(key).set(athleteKey, getAthleteLabel(assignment));
  }

  return Array.from(routinesById.values())
    .map((routine) => {
      const ownerId = getRoutineOwnerId(routine);
      const creator = usersById.get(String(ownerId)) || getRoutineOwnerCandidate(routine) || null;
      const athleteNames = Array.from(
        (athleteNamesByRoutineId.get(String(routine.id)) || new Map()).values()
      );

      return {
        routine,
        ownerId,
        creator,
        creatorLabel: getCreatorLabel(creator, ownerId),
        creatorGymOwnerId: resolveGymOwnerId(creator),
        assignedCount: athleteNames.length,
        athleteNames,
        exerciseCount: getRoutineExercises(routine).length,
      };
    })
    .sort((a, b) => {
      const creatorCompare = a.creatorLabel.localeCompare(b.creatorLabel, "es");

      if (creatorCompare !== 0) {
        return creatorCompare;
      }

      return String(a.routine?.name || "").localeCompare(String(b.routine?.name || ""), "es");
    });
}

/**
 * Alcance real de cada rol. Antes esta funcion devolvia todo sin filtrar, con
 * lo cual cualquier perfil veia las rutinas de todos los gimnasios.
 */
function isRowVisibleFor(row, viewer, viewerGymOwnerId) {
  if (isSuperAdmin(viewer)) {
    return true;
  }

  if (sameId(row.ownerId, viewer.id)) {
    return true;
  }

  if (viewer.roleKey === "admin") {
    return sameId(row.creatorGymOwnerId, viewer.id);
  }

  if (viewer.roleKey === "coach") {
    return (
      sameId(row.creatorGymOwnerId, viewerGymOwnerId) || sameId(row.ownerId, viewerGymOwnerId)
    );
  }

  return false;
}

/** Cada fila visible cae en exactamente un grupo mostrado, para que los totales cierren. */
function classifyRow(row, viewer, viewerGymOwnerId) {
  if (isSuperAdmin(viewer)) {
    return "all";
  }

  if (sameId(row.ownerId, viewer.id)) {
    return "own";
  }

  if (viewer.roleKey === "admin") {
    return "coaches";
  }

  if (sameId(row.ownerId, viewerGymOwnerId) || isAdminOrGymRoleName(getUserRoleName(row.creator))) {
    return "gym";
  }

  return "other_coaches";
}

function getDisplayGroups(roleKey) {
  if (roleKey === "coach") {
    return [
      { key: "own", label: "Rutinas del coach" },
      { key: "other_coaches", label: "Rutinas de otros coaches del gym" },
      { key: "gym", label: "Rutinas del gym" },
    ];
  }

  if (roleKey === "admin") {
    return [
      { key: "own", label: "Rutinas del gym" },
      { key: "coaches", label: "Rutinas de coaches del gym" },
    ];
  }

  return [{ key: "all", label: "Todas las rutinas visibles" }];
}

export default async function RutinasCreadasPage() {
  const viewer = await getViewer();

  if (!viewer) {
    redirect("/login");
  }

  let rows = [];
  let errorMessage = "";
  const groupedRows = { own: [], other_coaches: [], gym: [], coaches: [], all: [] };

  try {
    const [routines, users, assignments, viewerGymOwnerId] = await Promise.all([
      getRoutinesStrict(viewer.token),
      getUsersStrict(viewer.token),
      getAssignmentsStrict(viewer.token),
      getViewerGymOwnerId(),
    ]);

    rows = buildRoutineRows(routines, assignments, users).filter((row) =>
      isRowVisibleFor(row, viewer, viewerGymOwnerId)
    );

    for (const row of rows) {
      // Mismo criterio que /api/routines/[routineId]: no se ofrece lo que la API rechaza.
      row.canManage = canManageRoutine({
        viewer,
        routine: row.routine,
        routineOwner: row.creator,
      });
      groupedRows[classifyRow(row, viewer, viewerGymOwnerId)].push(row);
    }
  } catch (error) {
    errorMessage = error?.message || "No se pudieron cargar las rutinas.";
  }

  const assignedRoutinesCount = rows.filter((row) => row.assignedCount > 0).length;
  const totalAssignments = rows.reduce((total, row) => total + row.assignedCount, 0);
  const displayGroups = getDisplayGroups(viewer.roleKey);

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Rutinas"
        title="Rutinas creadas"
        description="Rutinas visibles segun tu perfil, agrupadas por quien las creo."
        breadcrumbs={[{ href: "/inicio", label: "Panel" }, { label: "Rutinas creadas" }]}
        actions={
          viewer.roleKey === "coach" || viewer.roleKey === "admin" ? (
            <CoachCreateRoutineButton coachId={viewer.id} />
          ) : null
        }
      />

      {errorMessage ? <Alert title="No se pudieron cargar las rutinas">{errorMessage}</Alert> : null}

      {!errorMessage ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <StatCard label="Rutinas creadas" value={rows.length} icon="rutinas" />
          <StatCard
            label="Rutinas asignadas"
            value={assignedRoutinesCount}
            hint="con al menos un atleta"
            icon="check"
            tone="exito"
          />
          <StatCard label="Usuarios asignados" value={totalAssignments} icon="usuarios" />
        </div>
      ) : null}

      {!errorMessage && rows.length === 0 ? (
        <Card>
          <EmptyState
            icon="rutinas"
            title="No hay rutinas visibles para tu perfil"
            description="Crea una rutina o pedile a tu gimnasio que comparta las suyas."
          />
        </Card>
      ) : null}

      {!errorMessage && rows.length > 0 ? (
        <div className="space-y-4">
          {displayGroups.map((group) => {
            const groupRows = groupedRows[group.key] || [];

            if (groupRows.length === 0) {
              return null;
            }

            return (
              <SectionCard
                key={group.key}
                title={group.label}
                icon={<Icon name="rutinas" className="text-acento" />}
                actions={<span className="r360-badge r360-badge-neutro">{groupRows.length}</span>}
              >
                {/*
                  Antes esto era una tabla de cinco columnas que en mobile solo se
                  podia leer scrolleando de costado. Como fila-tarjeta entra en
                  cualquier ancho sin perder ningun dato.
                */}
                <ul className="space-y-3">
                  {groupRows.map((row) => {
                    const routine = row.routine;
                    const creatorRoleId = row.creator?.idRole || row.creator?.Rol?.id;
                    const detailHref =
                      routine?.id && row.creator?.id && creatorRoleId
                        ? `/inicio/roles-usuarios/${creatorRoleId}/${row.creator.id}/rutinas/${routine.id}`
                        : "";

                    return (
                      <li
                        key={`${group.key}-${routine.id}`}
                        className="r360-card-inset flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-texto">
                            {routine?.name || `Rutina #${routine.id}`}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-1.5">
                            <span className="r360-badge r360-badge-neutro">ID {routine.id}</span>
                            <span className="r360-badge r360-badge-neutro">
                              Orden {routine?.order || "-"}
                            </span>
                            <span className="r360-badge r360-badge-neutro">
                              {routine?.time || "-"} min
                            </span>
                            <span className="r360-badge r360-badge-neutro">
                              {row.exerciseCount} ejercicio{row.exerciseCount === 1 ? "" : "s"}
                            </span>
                          </div>
                          <p className="mt-2 flex items-center gap-1.5 text-xs text-texto-2">
                            <Icon name="perfil" className="text-texto-3" />
                            {row.creatorLabel}
                            <span className="text-texto-3">
                              · {row.creator?.email || `ID ${row.ownerId || "-"}`}
                            </span>
                          </p>
                        </div>

                        <div className="lg:w-56">
                          <span
                            className={`r360-badge ${
                              row.assignedCount > 0 ? "r360-badge-exito" : "r360-badge-neutro"
                            }`}
                          >
                            {row.assignedCount} usuario{row.assignedCount === 1 ? "" : "s"}
                          </span>
                          {row.athleteNames.length > 0 ? (
                            <p className="mt-1.5 text-xs text-texto-3">
                              {row.athleteNames.slice(0, 3).join(", ")}
                              {row.athleteNames.length > 3
                                ? ` y ${row.athleteNames.length - 3} mas`
                                : ""}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {detailHref ? (
                            <Link href={detailHref} className="r360-btn r360-btn-accent r360-btn-sm">
                              Ver rutina
                              <Icon name="chevron" />
                            </Link>
                          ) : (
                            <span className="text-xs text-texto-3">Sin enlace</span>
                          )}
                          {row.canManage ? (
                            <RoutineDeleteButton
                              routineId={routine.id}
                              routineName={routine?.name || `Rutina #${routine.id}`}
                              assignedCount={row.assignedCount}
                              athleteNames={row.athleteNames}
                            />
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </SectionCard>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
