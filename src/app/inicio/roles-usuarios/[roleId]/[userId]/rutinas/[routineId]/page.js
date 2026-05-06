import Link from "next/link";
import { cookies } from "next/headers";
import RoutineEditButton from "@/components/roles/RoutineEditButton";

const ROUTINES_URL = "https://rutina360-server.onrender.com/routine/";
const EXERCISES_URL = "https://rutina360-server.onrender.com/ejercice";

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

function getRoutineExercises(routine) {
  if (Array.isArray(routine?.exercises)) {
    return routine.exercises;
  }

  if (Array.isArray(routine?.Routine_Ejercices)) {
    return routine.Routine_Ejercices;
  }

  if (Array.isArray(routine?.Ejercices)) {
    return routine.Ejercices;
  }

  if (Array.isArray(routine?.RoutineEjercices)) {
    return routine.RoutineEjercices;
  }

  return [];
}

export default async function RoutineDetailPage({ params, searchParams }) {
  const { roleId, userId, routineId } = await params;
  const { source, coachId } = await searchParams;
  const isFromAthleteProfile = String(source || "").trim().toLowerCase() === "athlete-profile";
  const backToProfileHref = isFromAthleteProfile
    ? coachId
      ? `/inicio/roles-usuarios/${roleId}/${userId}?from=routine&coachId=${coachId}`
      : `/inicio/roles-usuarios/${roleId}/${userId}?from=routine`
    : `/inicio/roles-usuarios/${roleId}/${userId}`;

  let errorMessage = "";
  let routine = null;
  let routineExercises = [];
  let exerciseNameById = new Map();

  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    const [routines, exercises] = await Promise.all([
      fetchList(ROUTINES_URL, "No se pudieron cargar las rutinas.", token),
      fetchList(EXERCISES_URL, "No se pudieron cargar los ejercicios.", token),
    ]);

    routine = routines.find((item) => String(item?.id) === String(routineId)) || null;
    routineExercises = routine ? getRoutineExercises(routine) : [];
    exerciseNameById = new Map(exercises.map((item) => [String(item.id), item.name]));
  } catch (error) {
    errorMessage = error.message;
  }

  if (!errorMessage && !routine) {
    errorMessage = `No se encontro la rutina #${routineId}.`;
  }

  return (
    <section className="space-y-6">
      <header className="rounded-2xl bg-white p-8 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Detalle de rutina</h1>
            <p className="mt-2 text-slate-600">
              {routine ? `${routine.name} · Rutina #${routine.id}` : `Rutina #${routineId}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {routine ? (
              <RoutineEditButton
                routine={routine}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
              />
            ) : null}
            <Link
              href={backToProfileHref}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Volver al perfil
            </Link>
          </div>
        </div>
      </header>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          {errorMessage}
        </div>
      ) : null}

      {!errorMessage && routine ? (
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Cabecera</h2>
          <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-700 md:grid-cols-2">
            <p><span className="font-medium">Nombre:</span> {routine.name || "-"}</p>
            <p><span className="font-medium">Coach (idUser):</span> {routine.idUser || "-"}</p>
            <p><span className="font-medium">Orden:</span> {routine.order || "-"}</p>
            <p><span className="font-medium">Tiempo:</span> {routine.time || "-"} min</p>
          </div>
        </section>
      ) : null}

      {!errorMessage && routine ? (
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Ejercicios</h2>
          {routineExercises.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">La rutina no tiene ejercicios asociados.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {routineExercises.map((item, index) => {
                const idEjercice = item?.idEjercice || item?.id || item?.Ejercice?.id;
                const exerciseName =
                  item?.Ejercice?.name ||
                  item?.name ||
                  exerciseNameById.get(String(idEjercice)) ||
                  `Ejercicio #${idEjercice}`;

                return (
                  <article key={`${idEjercice}-${index}`} className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Ejercicio #{index + 1}</p>
                    <p className="mt-1 font-semibold text-slate-900">{exerciseName}</p>
                    <p className="mt-2 text-sm text-slate-700">Series: {item?.series ?? "-"}</p>
                    <p className="text-sm text-slate-700">Descanso: {item?.rest ?? "-"} min</p>
                    <p className="text-sm text-slate-700">Comentario: {item?.comments || "Sin comentario"}</p>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : null}
    </section>
  );
}
