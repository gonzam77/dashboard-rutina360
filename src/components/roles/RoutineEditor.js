"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Feedback";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { extractArrayPayload } from "@/lib/api-response";
import { getRoutineExerciseId, getRoutineExercises } from "@/lib/routines";

const MUSCLE_GROUPS_URL = "/api/muscle-groups";
const EXERCISES_URL = "/api/exercises";

const INPUT_CLASS =
  "r360-input placeholder:text-texto-3";
const SELECT_CLASS =
  "r360-input disabled:bg-[#0b223a] disabled:text-texto/45";
const OPTION_CLASS = "bg-superficie-alta text-texto";

function createInitialExerciseRows(routine) {
  return getRoutineExercises(routine).map((item, index) => {
    const exerciseId = getRoutineExerciseId(item);

    return {
      rowKey: `${exerciseId || "exercise"}-${index}`,
      muscleGroupId: String(
        item?.idMuscleGroup ||
          item?.Ejercice?.idMuscleGroup ||
          item?.exercise?.idMuscleGroup ||
          item?.Exercise?.idMuscleGroup ||
          ""
      ),
      idEjercice: exerciseId ? String(exerciseId) : "",
      series: item?.series != null ? String(item.series) : "",
      rest: item?.rest != null ? String(item.rest) : "",
      comments: item?.comments || "",
    };
  });
}

export default function RoutineEditor({ routine, isInModal = false, onSaved }) {
  const router = useRouter();
  const [routineName, setRoutineName] = useState(routine?.name || "");
  const [routineOrder, setRoutineOrder] = useState(routine?.order != null ? String(routine.order) : "");
  const [routineTime, setRoutineTime] = useState(routine?.time != null ? String(routine.time) : "");
  const [muscleGroups, setMuscleGroups] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [exerciseRows, setExerciseRows] = useState(() => createInitialExerciseRows(routine));
  const [newRowCounter, setNewRowCounter] = useState(0);
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isEmptyConfirmOpen, setIsEmptyConfirmOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadCatalogs() {
      setLoadingCatalogs(true);
      setError("");

      try {
        const [groupsResponse, exercisesResponse] = await Promise.all([
          fetch(MUSCLE_GROUPS_URL, { cache: "no-store", credentials: "include" }),
          fetch(EXERCISES_URL, { cache: "no-store", credentials: "include" }),
        ]);

        const groupsJson = await groupsResponse.json().catch(() => ({}));
        const exercisesJson = await exercisesResponse.json().catch(() => ({}));

        if (!mounted) {
          return;
        }

        if (!groupsResponse.ok || !exercisesResponse.ok) {
          setError(
            groupsJson?.message ||
              exercisesJson?.message ||
              "No se pudieron cargar grupos musculares y ejercicios."
          );
          return;
        }

        setMuscleGroups(extractArrayPayload(groupsJson));
        setExercises(extractArrayPayload(exercisesJson));
      } catch {
        if (mounted) {
          setError("No se pudieron cargar grupos musculares y ejercicios.");
        }
      } finally {
        if (mounted) {
          setLoadingCatalogs(false);
        }
      }
    }

    loadCatalogs();

    return () => {
      mounted = false;
    };
  }, []);

  const exerciseById = useMemo(
    () => new Map(exercises.map((exercise) => [String(exercise.id), exercise])),
    [exercises]
  );

  const exercisesByGroup = useMemo(() => {
    const map = new Map();

    for (const item of exercises) {
      const key = String(item?.idMuscleGroup || "");

      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(item);
    }

    return map;
  }, [exercises]);

  function updateExerciseRow(rowKey, key, value) {
    setExerciseRows((current) =>
      current.map((row) => {
        if (row.rowKey !== rowKey) {
          return row;
        }

        if (key === "muscleGroupId") {
          return { ...row, muscleGroupId: value, idEjercice: "" };
        }

        return { ...row, [key]: value };
      })
    );
  }

  function addExerciseRow() {
    setExerciseRows((current) => [
      ...current,
      {
        rowKey: `new-${newRowCounter}`,
        muscleGroupId: "",
        idEjercice: "",
        series: "",
        rest: "",
        comments: "",
      },
    ]);
    setNewRowCounter((current) => current + 1);
  }

  function removeExerciseRow(rowKey) {
    setExerciseRows((current) => current.filter((row) => row.rowKey !== rowKey));
  }

  function buildPayloadExercises() {
    const payloadExercises = [];

    for (const row of exerciseRows) {
      const idEjercice = Number(row.idEjercice);
      const series = Number(row.series);
      const rest = Number(row.rest);

      if (!Number.isFinite(idEjercice) || idEjercice <= 0) {
        throw new Error("Todos los ejercicios deben tener un ejercicio seleccionado.");
      }

      if (!Number.isFinite(series) || series <= 0) {
        throw new Error("Todos los ejercicios deben tener una cantidad valida de series.");
      }

      if (!Number.isFinite(rest) || rest < 0) {
        throw new Error("Todos los ejercicios deben tener un descanso valido.");
      }

      payloadExercises.push({
        idEjercice,
        series,
        rest,
        comments: row.comments?.trim() || "",
      });
    }

    return payloadExercises;
  }

  async function saveRoutine() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payloadExercises = buildPayloadExercises();

      const response = await fetch(`/api/routines/${routine.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: routineName.trim(),
          idUser: Number(routine?.idUser),
          order: Number(routineOrder),
          time: Number(routineTime),
          exercises: payloadExercises,
        }),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(json?.message || "No se pudo actualizar la rutina.");
        return;
      }

      setMessage("Rutina actualizada correctamente.");
      router.refresh();

      if (typeof onSaved === "function") {
        onSaved();
      }
    } catch (submitError) {
      setError(submitError.message || "Error de conexion al actualizar rutina.");
    } finally {
      setSaving(false);
      setIsEmptyConfirmOpen(false);
    }
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const name = routineName.trim();
    const order = Number(routineOrder);
    const time = Number(routineTime);

    if (!name) {
      setError("El nombre de la rutina es obligatorio.");
      return;
    }

    if (!Number.isFinite(order) || order <= 0) {
      setError("El orden de la rutina es invalido.");
      return;
    }

    if (!Number.isFinite(time) || time <= 0) {
      setError("El tiempo de la rutina es invalido.");
      return;
    }

    if (exerciseRows.length === 0) {
      setIsEmptyConfirmOpen(true);
      return;
    }

    saveRoutine();
  }

  return (
    <section
      className={
        isInModal ? "" : "rounded-2xl border border-linea bg-superficie-alta p-6 shadow-sm"
      }
    >
      {!isInModal ? <h2 className="text-lg font-semibold text-texto">Editar rutina</h2> : null}
      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            required
            type="text"
            placeholder="Nombre de la rutina"
            value={routineName}
            onChange={(event) => setRoutineName(event.target.value)}
            className={`${INPUT_CLASS} md:col-span-2`}
          />
          <input
            required
            type="number"
            min="1"
            placeholder="Orden"
            value={routineOrder}
            onChange={(event) => setRoutineOrder(event.target.value)}
            className={INPUT_CLASS}
          />
          <input
            required
            type="number"
            min="1"
            placeholder="Tiempo (minutos)"
            value={routineTime}
            onChange={(event) => setRoutineTime(event.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-texto-2">Ejercicios de la rutina</p>
            <button
              type="button"
              onClick={addExerciseRow}
              disabled={loadingCatalogs}
              className="r360-btn r360-btn-accent r360-btn-sm"
            >
              Agregar ejercicio
            </button>
          </div>

          {loadingCatalogs ? (
            <p className="r360-input-2">
              Cargando catalogo de ejercicios...
            </p>
          ) : null}

          {!loadingCatalogs && exerciseRows.length === 0 ? (
            <p className="r360-input-2">
              La rutina quedara sin ejercicios.
            </p>
          ) : null}

          <div className="space-y-3">
            {exerciseRows.map((row, index) => {
              const selectedExercise = exerciseById.get(String(row.idEjercice));
              const effectiveMuscleGroupId =
                row.muscleGroupId ||
                (selectedExercise?.idMuscleGroup ? String(selectedExercise.idMuscleGroup) : "");
              const availableExercises = exercisesByGroup.get(String(effectiveMuscleGroupId)) || [];
              const isSelectedOutOfGroup =
                selectedExercise &&
                !availableExercises.some((exercise) => String(exercise.id) === String(row.idEjercice));

              return (
                <article key={row.rowKey} className="rounded-xl border border-linea bg-superficie-alta p-3">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-texto-3">
                      Ejercicio #{index + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeExerciseRow(row.rowKey)}
                      className="r360-btn r360-btn-danger r360-btn-sm min-h-0 py-1"
                    >
                      Quitar
                    </button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <select
                      value={effectiveMuscleGroupId}
                      aria-label="Grupo muscular"
                      onChange={(event) =>
                        updateExerciseRow(row.rowKey, "muscleGroupId", event.target.value)
                      }
                      className={SELECT_CLASS}
                    >
                      <option value="" disabled className={OPTION_CLASS}>
                        Seleccionar grupo muscular
                      </option>
                      {muscleGroups.map((group) => (
                        <option key={group.id} value={group.id} className={OPTION_CLASS}>
                          {group.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={row.idEjercice}
                      aria-label="Ejercicio"
                      onChange={(event) =>
                        updateExerciseRow(row.rowKey, "idEjercice", event.target.value)
                      }
                      disabled={!effectiveMuscleGroupId}
                      className={SELECT_CLASS}
                    >
                      <option value="" disabled className={OPTION_CLASS}>
                        {effectiveMuscleGroupId
                          ? "Seleccionar ejercicio"
                          : "Primero selecciona grupo muscular"}
                      </option>
                      {isSelectedOutOfGroup ? (
                        <option value={selectedExercise.id} className={OPTION_CLASS}>
                          {selectedExercise.name}
                        </option>
                      ) : null}
                      {availableExercises.map((exercise) => (
                        <option key={exercise.id} value={exercise.id} className={OPTION_CLASS}>
                          {exercise.name}
                        </option>
                      ))}
                    </select>

                    <input
                      type="number"
                      min="1"
                      placeholder="Cantidad de series"
                      value={row.series}
                      onChange={(event) => updateExerciseRow(row.rowKey, "series", event.target.value)}
                      className={INPUT_CLASS}
                    />

                    <input
                      type="number"
                      min="0"
                      placeholder="Descanso entre series (min)"
                      value={row.rest}
                      onChange={(event) => updateExerciseRow(row.rowKey, "rest", event.target.value)}
                      className={INPUT_CLASS}
                    />

                    <input
                      type="text"
                      placeholder="Comentario (opcional)"
                      value={row.comments}
                      onChange={(event) =>
                        updateExerciseRow(row.rowKey, "comments", event.target.value)
                      }
                      className={`${INPUT_CLASS} md:col-span-2`}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {message ? <Alert tone="exito">{message}</Alert> : null}
        {error ? <Alert>{error}</Alert> : null}

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="submit"
            disabled={saving || loadingCatalogs}
            className="r360-btn r360-btn-accent"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>

      <ConfirmDialog
        open={isEmptyConfirmOpen}
        title="Rutina sin ejercicios"
        description="La rutina quedara sin ejercicios. Deseas guardar los cambios de todos modos?"
        confirmLabel="Guardar igual"
        pendingLabel="Guardando..."
        tone="neutral"
        loading={saving}
        onConfirm={saveRoutine}
        onCancel={() => {
          if (!saving) {
            setIsEmptyConfirmOpen(false);
          }
        }}
      />
    </section>
  );
}
