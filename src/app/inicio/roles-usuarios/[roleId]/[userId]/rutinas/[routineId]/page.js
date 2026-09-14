import Link from "next/link";
import RoutineEditButton from "@/components/roles/RoutineEditButton";
import { findUserById, getExercisesStrict, getRoutinesStrict } from "@/lib/backend";
import { getRoutineExerciseId, getRoutineExercises, getRoutineOwnerId } from "@/lib/routines";
import { canManageRoutine, getViewer } from "@/lib/viewer";

export const metadata = {
  title: "Detalle de rutina",
};

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
  let canEditRoutine = false;

  try {
    const viewer = await getViewer();

    if (!viewer) {
      throw new Error("No autenticado.");
    }

    const [routines, exercises] = await Promise.all([
      getRoutinesStrict(viewer.token),
      getExercisesStrict(viewer.token),
    ]);

    routine = routines.find((item) => String(item?.id) === String(routineId)) || null;

    if (!routine) {
      throw new Error(`No se encontro la rutina #${routineId}.`);
    }

    routineExercises = getRoutineExercises(routine);
    exerciseNameById = new Map(exercises.map((item) => [String(item.id), item.name]));

    const ownerId = getRoutineOwnerId(routine);
    const routineOwner = ownerId ? await findUserById(viewer.token, ownerId) : null;

    // El boton de editar solo aparece si la API tambien va a aceptar el cambio.
    canEditRoutine = canManageRoutine({ viewer, routine, routineOwner });
  } catch (error) {
    errorMessage = error?.message || "No se pudo cargar la rutina.";
  }

  return (
    <section className="space-y-6 text-white">
      <header className="rounded-3xl border border-white/15 bg-[#0f2a46] p-8 shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-white">Detalle de rutina</h1>
            <p className="mt-2 text-white/80">
              {routine ? `${routine.name} · Rutina #${routine.id}` : `Rutina #${routineId}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {routine && canEditRoutine ? (
              <RoutineEditButton
                routine={routine}
                className="rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/20"
              />
            ) : null}
            <Link
              href={backToProfileHref}
              className="rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10"
            >
              Volver al perfil
            </Link>
          </div>
        </div>
      </header>

      {errorMessage ? (
        <div className="rounded-2xl border border-red-300/40 bg-red-950/40 p-4 text-red-200">
          {errorMessage}
        </div>
      ) : null}

      {!errorMessage && routine ? (
        <section className="rounded-3xl border border-white/15 bg-[#17385a] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
          <h2 className="text-lg font-semibold text-white">Cabecera</h2>
          <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-white/85 md:grid-cols-2">
            <p>
              <span className="font-medium">Nombre:</span> {routine.name || "-"}
            </p>
            <p>
              <span className="font-medium">Coach (idUser):</span> {routine.idUser || "-"}
            </p>
            <p>
              <span className="font-medium">Orden:</span> {routine.order || "-"}
            </p>
            <p>
              <span className="font-medium">Tiempo:</span> {routine.time || "-"} min
            </p>
          </div>
        </section>
      ) : null}

      {!errorMessage && routine ? (
        <section className="rounded-3xl border border-white/15 bg-[#17385a] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
          <h2 className="text-lg font-semibold text-white">Ejercicios</h2>
          {routineExercises.length === 0 ? (
            <p className="mt-3 text-sm text-white/75">La rutina no tiene ejercicios asociados.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {routineExercises.map((item, index) => {
                const idEjercice = getRoutineExerciseId(item);
                const exerciseName =
                  item?.Ejercice?.name ||
                  item?.name ||
                  exerciseNameById.get(String(idEjercice)) ||
                  `Ejercicio #${idEjercice ?? "-"}`;

                return (
                  <article
                    key={`${idEjercice}-${index}`}
                    className="rounded-2xl border border-white/15 bg-[#0f2a46] p-4"
                  >
                    <p className="text-xs uppercase tracking-wide text-white/60">
                      Ejercicio #{index + 1}
                    </p>
                    <p className="mt-1 font-semibold text-white">{exerciseName}</p>
                    <p className="mt-2 text-sm text-white/80">Series: {item?.series ?? "-"}</p>
                    <p className="text-sm text-white/80">Descanso: {item?.rest ?? "-"} min</p>
                    <p className="text-sm text-white/80">
                      Comentario: {item?.comments || "Sin comentario"}
                    </p>
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
