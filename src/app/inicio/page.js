import Link from "next/link";
import Icon from "@/components/ui/Icon";
import PageHeader from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/Card";
import { Alert, EmptyState, StatCard } from "@/components/ui/Feedback";
import {
  getAssignments,
  getExercises,
  getRoles,
  getRoutines,
  getUserLinks,
  getUsers,
} from "@/lib/backend";
import {
  getUserRoleName,
  isAdminOrGymRoleName,
  isAthleteRoleName,
  isCoachRoleName,
  resolveGymOwnerId,
  sameId,
} from "@/lib/roles";
import { getAssignmentRoutineId, getRoutineOwnerId, isActiveRecord } from "@/lib/routines";
import { getViewer, getViewerGymOwnerId, isSuperAdmin } from "@/lib/viewer";

export const metadata = {
  title: "Panel",
};

function buildRoleHome({ roleKey, isGymRole }) {
  if (roleKey === "super_admin") {
    return {
      eyebrow: "Super administrador",
      title: "Panel general",
      description: "Administra gimnasios, usuarios y visibilidad global del sistema.",
    };
  }

  if (roleKey === "admin") {
    return isGymRole
      ? {
          eyebrow: "Gimnasio",
          title: "Panel del gimnasio",
          description: "Gestiona coaches, atletas y rutinas de tu gimnasio.",
        }
      : {
          eyebrow: "Administrador",
          title: "Panel administrativo",
          description: "Gestiona los roles y usuarios de tu propia estructura.",
        };
  }

  if (roleKey === "coach") {
    return {
      eyebrow: "Coach",
      title: "Tu panel",
      description: "Administra tus atletas y tus rutinas activas.",
    };
  }

  return {
    eyebrow: "Rutina360",
    title: "Bienvenido al panel",
    description: "Selecciona una opcion del menu lateral para gestionar el sistema.",
  };
}

/**
 * Metricas y atajos reales del panel.
 *
 * Hasta ahora la home solo repetia los enlaces del menu lateral, sin un solo
 * dato: habia que entrar a cada seccion para saber cuantos atletas o rutinas
 * habia. Cada rol ve unicamente lo que su alcance le permite, el mismo criterio
 * que aplican las paginas de detalle.
 */
async function loadDashboard(viewer) {
  const [users, roles, routines, assignments, exercises, userLinks, gymOwnerId] = await Promise.all([
    getUsers(viewer.token),
    getRoles(viewer.token),
    getRoutines(viewer.token),
    getAssignments(viewer.token),
    getExercises(viewer.token),
    getUserLinks(viewer.token),
    getViewerGymOwnerId(),
  ]);

  const athleteRoleId = Number(roles.find((role) => isAthleteRoleName(role?.name))?.id) || null;
  const coachRoleId = Number(roles.find((role) => isCoachRoleName(role?.name))?.id) || null;

  const inScope = (user) => {
    if (isSuperAdmin(viewer)) {
      return true;
    }

    if (sameId(user?.id, viewer.id)) {
      return false;
    }

    return sameId(resolveGymOwnerId(user), gymOwnerId);
  };

  const athletes = users.filter((user) => isAthleteRoleName(getUserRoleName(user)) && inScope(user));
  const coaches = users.filter((user) => isCoachRoleName(getUserRoleName(user)) && inScope(user));
  const gyms = users.filter((user) => isAdminOrGymRoleName(getUserRoleName(user)));

  const visibleRoutines = routines.filter((routine) => {
    if (isSuperAdmin(viewer)) {
      return true;
    }

    const ownerId = getRoutineOwnerId(routine);
    return sameId(ownerId, viewer.id) || sameId(ownerId, gymOwnerId);
  });

  const ownRoutines = routines.filter((routine) =>
    sameId(getRoutineOwnerId(routine), viewer.id)
  );

  const activeAssignments = assignments.filter(isActiveRecord);
  const assignedRoutineIds = new Set(
    activeAssignments.map((assignment) => String(getAssignmentRoutineId(assignment)))
  );

  // Atletas vinculados a este coach, para el atajo "Mis atletas".
  const ownAthleteIds = new Set(
    userLinks
      .filter((link) => isActiveRecord(link) && sameId(link?.idCoach || link?.coach?.id, viewer.id))
      .map((link) => String(link?.idAthlete || link?.athlete?.id))
  );
  const ownAthletes = athletes.filter((athlete) => ownAthleteIds.has(String(athlete?.id)));

  return {
    athleteRoleId,
    coachRoleId,
    athletes,
    coaches,
    gyms,
    ownAthletes,
    visibleRoutines,
    ownRoutines,
    exerciseCount: exercises.length,
    roleCount: roles.length,
    assignedRoutineCount: assignedRoutineIds.size,
    activeAssignmentCount: activeAssignments.length,
  };
}

function buildStats({ roleKey, isGymRole, data }) {
  if (roleKey === "super_admin") {
    return [
      { label: "Gimnasios", value: data.gyms.length, icon: "gym" },
      { label: "Coaches", value: data.coaches.length, icon: "usuarios" },
      { label: "Atletas", value: data.athletes.length, icon: "perfil" },
      {
        label: "Rutinas",
        value: data.visibleRoutines.length,
        hint: `${data.assignedRoutineCount} asignadas`,
        icon: "rutinas",
      },
    ];
  }

  if (roleKey === "admin" && isGymRole) {
    return [
      { label: "Coaches", value: data.coaches.length, icon: "usuarios" },
      { label: "Atletas", value: data.athletes.length, icon: "perfil" },
      {
        label: "Rutinas del gym",
        value: data.visibleRoutines.length,
        hint: `${data.assignedRoutineCount} asignadas`,
        icon: "rutinas",
      },
      { label: "Ejercicios", value: data.exerciseCount, icon: "catalogo" },
    ];
  }

  if (roleKey === "admin") {
    return [
      { label: "Usuarios a cargo", value: data.coaches.length + data.athletes.length, icon: "usuarios" },
      { label: "Roles del sistema", value: data.roleCount, icon: "panel" },
      { label: "Ejercicios", value: data.exerciseCount, icon: "catalogo" },
    ];
  }

  if (roleKey === "coach") {
    return [
      { label: "Mis atletas", value: data.ownAthletes.length, icon: "perfil" },
      { label: "Atletas del gym", value: data.athletes.length, icon: "usuarios" },
      {
        label: "Mis rutinas",
        value: data.ownRoutines.length,
        hint: `${data.visibleRoutines.length} visibles en total`,
        icon: "rutinas",
      },
      { label: "Asignaciones activas", value: data.activeAssignmentCount, icon: "check" },
    ];
  }

  return [];
}

function buildShortcuts({ roleKey, isGymRole, profileHref, athletesHref, coachesHref }) {
  const shortcuts = [];

  if (roleKey === "coach") {
    if (athletesHref) {
      shortcuts.push({
        href: athletesHref,
        label: "Atletas del gym",
        description: "Ver, buscar y abrir el perfil de cada atleta.",
        icon: "usuarios",
      });
    }
    shortcuts.push({
      href: "/inicio/rutinas-creadas",
      label: "Mis rutinas",
      description: "Crear rutinas y revisar a quien estan asignadas.",
      icon: "rutinas",
    });
  } else {
    shortcuts.push({
      href: "/inicio/roles-usuarios",
      label: roleKey === "super_admin" ? "Roles y usuarios" : "Coaches y atletas",
      description: "Estructura de roles y alta de usuarios.",
      icon: "usuarios",
    });

    if (roleKey === "super_admin" || isGymRole) {
      shortcuts.push({
        href: "/inicio/rutinas-creadas",
        label: roleKey === "super_admin" ? "Rutinas globales" : "Rutinas del gimnasio",
        description: "Listado completo con creador y asignaciones.",
        icon: "rutinas",
      });
    }

    shortcuts.push({
      href: "/inicio/catalogo-ejercicios",
      label: "Catalogo de ejercicios",
      description: "Grupos musculares y ejercicios disponibles.",
      icon: "catalogo",
    });

    if (coachesHref && roleKey !== "super_admin") {
      shortcuts.push({
        href: coachesHref,
        label: "Coaches",
        description: "Ir directo al listado de coaches del gimnasio.",
        icon: "gym",
      });
    }
  }

  if (profileHref) {
    shortcuts.push({
      href: profileHref,
      label: "Mi perfil",
      description: "Tus datos de cuenta y accesos.",
      icon: "perfil",
    });
  }

  return shortcuts;
}

function PeopleShortlist({ title, description, users, roleId, emptyText }) {
  return (
    <SectionCard
      title={title}
      description={description}
      icon={<Icon name="usuarios" className="text-acento" />}
      actions={
        roleId ? (
          <Link href={`/inicio/roles-usuarios/${roleId}`} className="r360-btn r360-btn-accent r360-btn-sm">
            Ver todos
            <Icon name="chevron" />
          </Link>
        ) : null
      }
    >
      {users.length === 0 ? (
        <EmptyState title={emptyText} description="Cuando haya altas, apareceran aca." />
      ) : (
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {users.slice(0, 6).map((user) => (
            <li key={user.id}>
              <Link
                href={`/inicio/roles-usuarios/${roleId}/${user.id}`}
                className="r360-card-inset r360-card-link flex items-center gap-3 px-3 py-2.5"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-acento/35 bg-acento/10 text-sm font-bold text-acento">
                  {String(user.username || "?").charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-texto">
                    {user.username || `Usuario #${user.id}`}
                  </span>
                  <span className="block truncate text-xs text-texto-3">
                    {user.email || "Sin email"}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

export default async function InicioPage() {
  const viewer = await getViewer();
  const roleKey = viewer?.roleKey || "unknown";
  const isGymRole = Boolean(viewer?.isGym);
  const view = buildRoleHome({ roleKey, isGymRole });

  let data = null;
  let errorMessage = "";

  try {
    data = viewer ? await loadDashboard(viewer) : null;
  } catch (error) {
    errorMessage = error?.message || "No se pudieron cargar los datos del panel.";
  }

  const ownRoleId = Number(viewer?.roleId);
  const ownUserId = Number(viewer?.id);
  const profileHref =
    ownRoleId > 0 && ownUserId > 0 ? `/inicio/roles-usuarios/${ownRoleId}/${ownUserId}` : "";
  const athletesHref = data?.athleteRoleId ? `/inicio/roles-usuarios/${data.athleteRoleId}` : "";
  const coachesHref = data?.coachRoleId ? `/inicio/roles-usuarios/${data.coachRoleId}` : "";

  const stats = data ? buildStats({ roleKey, isGymRole, data }) : [];
  const shortcuts = buildShortcuts({ roleKey, isGymRole, profileHref, athletesHref, coachesHref });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={view.eyebrow}
        title={view.title}
        description={view.description}
        meta={
          viewer?.username ? (
            <span className="r360-badge r360-badge-neutro">
              <Icon name="perfil" />
              {viewer.username}
            </span>
          ) : null
        }
      />

      {errorMessage ? <Alert title="No se pudieron cargar las metricas">{errorMessage}</Alert> : null}

      {stats.length > 0 ? (
        <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </section>
      ) : null}

      <SectionCard
        title="Accesos rapidos"
        description="Las acciones que mas se usan, a un click."
        icon={<Icon name="panel" className="text-acento" />}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {shortcuts.map((shortcut) => (
            <Link
              key={`${shortcut.href}-${shortcut.label}`}
              href={shortcut.href}
              className="r360-card-inset r360-card-link group flex items-start gap-3 p-4"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-acento/12 text-lg text-acento">
                <Icon name={shortcut.icon} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-texto">{shortcut.label}</span>
                <span className="mt-1 block text-xs text-texto-2">{shortcut.description}</span>
              </span>
              <Icon
                name="chevron"
                className="mt-1 text-texto-3 transition group-hover:translate-x-0.5 group-hover:text-acento"
              />
            </Link>
          ))}
        </div>
      </SectionCard>

      {data && roleKey === "coach" ? (
        <PeopleShortlist
          title="Mis atletas"
          description="Atletas vinculados a tu cuenta."
          users={data.ownAthletes}
          roleId={data.athleteRoleId}
          emptyText="Todavia no tenes atletas vinculados"
        />
      ) : null}

      {data && roleKey !== "coach" && data.athletes.length > 0 ? (
        <PeopleShortlist
          title="Ultimos atletas"
          description="Acceso directo al perfil de cada atleta."
          users={data.athletes}
          roleId={data.athleteRoleId}
          emptyText="Todavia no hay atletas cargados"
        />
      ) : null}
    </div>
  );
}
