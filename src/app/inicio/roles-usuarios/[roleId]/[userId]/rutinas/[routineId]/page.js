import Link from "next/link";
import RoutineEditButton from "@/components/roles/RoutineEditButton";
import Icon from "@/components/ui/Icon";
import PageHeader from "@/components/ui/PageHeader";
import { SectionCard } from "@/components/ui/Card";
import { Alert, EmptyState } from "@/components/ui/Feedback";
import { findUserById, getExercisesStrict, getRoutinesStrict } from "@/lib/backend";
import { getRoutineExerciseId, getRoutineExercises, getRoutineOwnerId } from "@/lib/routines";
import { canManageRoutine, getViewer } from "@/lib/viewer";
import { formatRest, restSecondsOf } from "@/lib/rest";
import ExerciseImage from "@/components/ui/ExerciseImage";
import KindBadge from "@/components/ui/KindBadge";
import {
  formatDuration,
  formatSeconds,
  isFunctional,
  itemsLabel,
  modeLabel,
  routineDurationSeconds,
  routineTimeLabel,
} from "@/lib/functional";

export const metadata = {
  title: "Detalle de rutina",
};

/** Dato suelto de la cabecera: etiqueta arriba, valor abajo. */
function DataItem({ label, value }) {
  return (
    <div className="r360-card-inset px-3 py-2.5">
      <p className="text-xs font-semibold uppercase tracking-wide text-texto-3">{label}</p>
      <p className="mt-1 text-sm font-bold text-texto">{value}</p>
    </div>
  );
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
  let canEditRoutine = false;
  let profileLabel = `Usuario #${userId}`;

  try {
    const viewer = await getViewer();

    if (!viewer) {
      throw new Error("No autenticado.");
    }

    const [routines, exercises, profileUser] = await Promise.all([
      getRoutinesStrict(viewer.token),
      getExercisesStrict(viewer.token),
      // Solo para la miga de pan: sin el nombre, la ruta no dice de quien es la rutina.
      findUserById(viewer.token, userId),
    ]);

    profileLabel = profileUser?.username || profileLabel;
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

  const routineLabel = routine?.name || `Rutina #${routineId}`;
  // Un funcional no tiene series: se lee por tiempos y vueltas.
  const functional = isFunctional(routine);
  const rounds = Math.max(1, Number(routine?.rounds) || 1);

  return (
    <section className="space-y-5">
      <PageHeader
        eyebrow="Detalle de rutina"
        title={routineLabel}
        breadcrumbs={[
          { href: "/inicio", label: "Panel" },
          { href: "/inicio/roles-usuarios", label: "Roles y usuarios" },
          { href: `/inicio/roles-usuarios/${roleId}`, label: `Rol #${roleId}` },
          { href: backToProfileHref, label: profileLabel },
          { label: routineLabel },
        ]}
        meta={
          routine ? (
            <>
              <KindBadge routine={routine} />
              <span className="r360-badge r360-badge-neutro">ID {routine.id}</span>
              <span className="r360-badge r360-badge-neutro">
                {itemsLabel(routine, routineExercises.length)}
              </span>
              {routine.time || functional ? (
                <span className="r360-badge r360-badge-neutro">{routineTimeLabel(routine)}</span>
              ) : null}
            </>
          ) : null
        }
        actions={
          <>
            {routine && canEditRoutine ? (
              <RoutineEditButton routine={routine} className="r360-btn r360-btn-accent" />
            ) : null}
            <Link href={backToProfileHref} className="r360-btn r360-btn-ghost">
              <Icon name="atras" />
              Volver al perfil
            </Link>
          </>
        }
      />

      {errorMessage ? <Alert title="No se pudo cargar la rutina">{errorMessage}</Alert> : null}

      {!errorMessage && routine ? (
        <SectionCard
          title="Cabecera"
          description="Datos generales de la rutina."
          icon={<Icon name="info" className="text-acento" />}
        >
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <DataItem label="Nombre" value={routine.name || "-"} />
            <DataItem label="Coach (idUser)" value={routine.idUser || "-"} />
            <DataItem label="Orden" value={routine.order || "-"} />
            {functional ? (
              <>
                <DataItem label="Duracion" value={formatDuration(routineDurationSeconds(routine))} />
                <DataItem label="Vueltas" value={rounds} />
                <DataItem
                  label="Descanso entre vueltas"
                  value={rounds > 1 ? formatSeconds(routine.roundRestSeconds) : "-"}
                />
                <DataItem label="Modo" value={modeLabel(routine.defaultMode)} />
              </>
            ) : (
              <DataItem label="Tiempo" value={`${routine.time || "-"} min`} />
            )}
          </div>
        </SectionCard>
      ) : null}

      {!errorMessage && routine ? (
        <SectionCard
          title={functional ? "Bloques" : "Ejercicios"}
          description={
            functional
              ? "Se repiten en cada vuelta, en el orden en que los hace el atleta."
              : "En el orden en que los ve el atleta en la app."
          }
          icon={<Icon name="catalogo" className="text-acento" />}
        >
          {routineExercises.length === 0 ? (
            <EmptyState
              icon="catalogo"
              title={functional ? "El funcional no tiene bloques" : "La rutina no tiene ejercicios"}
              description="Edita la rutina para agregarle ejercicios."
            />
          ) : (
            <ol className="space-y-3">
              {routineExercises.map((item, index) => {
                const idEjercice = getRoutineExerciseId(item);
                const exerciseName =
                  item?.Ejercice?.name ||
                  item?.name ||
                  exerciseNameById.get(String(idEjercice)) ||
                  `Ejercicio #${idEjercice ?? "-"}`;

                return (
                  <li key={`${idEjercice}-${index}`} className="r360-card-inset p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-acento/12 text-sm font-bold text-acento">
                        {index + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-texto">{exerciseName}</p>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {functional ? (
                            <>
                              <span className="r360-badge r360-badge-aviso">
                                Trabajo: {formatSeconds(item?.workSeconds, "-")}
                              </span>
                              {/* Igual que en la app: el ultimo bloque no descansa, sigue la vuelta. */}
                              <span className="r360-badge r360-badge-neutro">
                                {index < routineExercises.length - 1
                                  ? `Descanso: ${formatSeconds(restSecondsOf(item) ?? 0)}`
                                  : rounds > 1
                                    ? `Despues: descanso entre vueltas (${formatSeconds(routine.roundRestSeconds)})`
                                    : "Ultimo bloque"}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="r360-badge r360-badge-neutro">
                                Series: {item?.series ?? "-"}
                              </span>
                              <span className="r360-badge r360-badge-neutro">
                                Descanso: {formatRest(restSecondsOf(item))}
                              </span>
                            </>
                          )}
                        </div>
                        {item?.comments ? (
                          <p className="mt-2 text-sm text-texto-2">{item.comments}</p>
                        ) : null}
                        <ExerciseImage exerciseId={idEjercice} name={exerciseName} className="mt-3 w-full max-w-md" />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </SectionCard>
      ) : null}
    </section>
  );
}
