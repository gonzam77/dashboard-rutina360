import Link from "next/link";
import { cookies } from "next/headers";
import CoachRoutinesList from "@/components/roles/CoachRoutinesList";
import AthleteRoutineAssignment from "@/components/roles/AthleteRoutineAssignment";
import AthleteAssignedRoutinesList from "@/components/roles/AthleteAssignedRoutinesList";
import CoachAthleteAssignment from "@/components/roles/CoachAthleteAssignment";

const ROLES_URL = "https://rutina360-server.onrender.com/rol";
const USERS_URL = "https://rutina360-server.onrender.com/users";
const ROUTINES_URL = "https://rutina360-server.onrender.com/routine/";
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
  const { coachId } = await searchParams;
  const normalizedCoachId = Number(coachId);

  let errorMessage = "";
  let role = null;
  let user = null;
  let userRoleName = "";
  let routines = [];
  let coachRoutines = [];
  let assignedAthletes = [];
  let athleteAssignedRoutines = [];
  let availableAthletes = [];

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    const [roles, users, fetchedRoutines, userLinks] = await Promise.all([
      fetchList(ROLES_URL, "No se pudieron cargar los roles.", token),
      fetchList(USERS_URL, "No se pudieron cargar los usuarios.", token),
      fetchList(ROUTINES_URL, "No se pudieron cargar las rutinas.", token),
      fetchList(USER_LINKS_URL, "No se pudieron cargar los atletas asignados.", token),
    ]);
    routines = fetchedRoutines;

    role = roles.find((item) => String(item?.id) === String(roleId)) || null;
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
      athleteAssignedRoutines = await fetchAthleteAssignedRoutines(user.id, token);
    }
  } catch (error) {
    errorMessage = error.message;
  }

  if (!errorMessage && !user) {
    errorMessage = `No se encontro el usuario #${userId}.`;
  }

  const isCoachProfile = userRoleName.trim().toLowerCase() === "coach";
  const isAthleteProfile = isAthleteRoleName(userRoleName);

  return (
    <section className="space-y-6">
      <header className="rounded-2xl bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Perfil de usuario</h1>
            <p className="mt-2 text-slate-600">
              {user ? `${user.username} · Usuario #${user.id}` : `Usuario #${userId}`}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Rol: {userRoleName || (role ? role.name : `#${roleId}`)}
            </p>
          </div>
          <Link
            href={`/inicio/roles-usuarios/${roleId}`}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Volver a usuarios
          </Link>
        </div>
      </header>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!errorMessage && user ? (
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Datos del perfil</h2>
          <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-slate-700 md:grid-cols-2">
            <p><span className="font-medium">Username:</span> {user.username || "Sin dato"}</p>
            <p><span className="font-medium">Email:</span> {user.email || "Sin dato"}</p>
            <p><span className="font-medium">Nacimiento:</span> {formatDate(user.birthDate)}</p>
            <p><span className="font-medium">Genero:</span> {user.gender || "Sin dato"}</p>
            <p><span className="font-medium">Telefono:</span> {user.phone || "Sin dato"}</p>
            <p><span className="font-medium">Direccion:</span> {user.address || "Sin dato"}</p>
            <p><span className="font-medium">Altura:</span> {user.height || "Sin dato"}</p>
            <p><span className="font-medium">Peso:</span> {user.weight || "Sin dato"}</p>
            <p><span className="font-medium">Objetivo:</span> {user.goal || "Sin dato"}</p>
            <p><span className="font-medium">Disponibilidad:</span> {user.weeklyAvailability || "Sin dato"}</p>
          </div>
        </section>
      ) : null}

      {!errorMessage && user && isCoachProfile ? (
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Rutinas del coach</h2>
          <CoachRoutinesList roleId={roleId} userId={user.id} coachId={user.id} routines={coachRoutines} />
        </section>
      ) : null}

      {!errorMessage && user && isCoachProfile ? (
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Atletas asignados</h2>
          <CoachAthleteAssignment coachId={user.id} athletes={availableAthletes} />
          {assignedAthletes.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">Este coach no tiene atletas asignados.</p>
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              {assignedAthletes.map((link) => (
                <article key={link.id} className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Vinculo #{link.id}</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    {link?.athlete?.username || `Atleta #${link.idAthlete}`}
                  </p>
                  <p className="mt-2 text-sm text-slate-700">
                    Email: {link?.athlete?.email || "Sin dato"}
                  </p>
                  <p className="text-sm text-slate-700">
                    Disponibilidad: {link?.athlete?.weeklyAvailability || "Sin dato"}
                  </p>
                  <p className="text-sm text-slate-700">
                    Alta del vinculo: {formatDate(link?.createdAt)}
                  </p>
                  <Link
                    href={`/inicio/roles-usuarios/${roleId}/${link.idAthlete}?coachId=${user.id}`}
                    className="mt-3 inline-block rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Ir al perfil del atleta
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : null}

      {!errorMessage && user && isAthleteProfile && normalizedCoachId ? (
        <AthleteRoutineAssignment
          athleteId={user.id}
          coachId={normalizedCoachId}
          coachRoutines={routines.filter(
            (routine) => String(routine?.idUser) === String(normalizedCoachId)
          )}
        />
      ) : null}

      {!errorMessage && user && isAthleteProfile ? (
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Rutinas asignadas al atleta</h2>
          <AthleteAssignedRoutinesList
            roleId={roleId}
            athleteId={user.id}
            assignments={athleteAssignedRoutines}
          />
        </section>
      ) : null}
    </section>
  );
}
