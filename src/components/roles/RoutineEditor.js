"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const MUSCLE_GROUPS_URL = "/api/muscle-groups";
const EXERCISES_URL = "/api/exercises";

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

function getRoutineExerciseId(item) {
  return (
    item?.idEjercice ||
    item?.Ejercice?.id ||
    item?.exercise?.id ||
    item?.Exercise?.id ||
    item?.idExercise ||
    item?.idEjercicio ||
    item?.id
  );
}

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

  useEffect(() => {
    let mounted = true;

    async function loadCatalogs() {
      setLoadingCatalogs(true);
      setError("");

      try {
        const [groupsResponse, exercisesResponse] = await Promise.all([
          fetch(MUSCLE_GROUPS_URL, { cache: "no-store" }),
          fetch(EXERCISES_URL, { cache: "no-store" }),
        ]);

        const groupsJson = await groupsResponse.json().catch(() => ({}));
        const exercisesJson = await exercisesResponse.json().catch(() => ({}));

        if (!mounted) {
          return;
        }

        if (!groupsResponse.ok || !exercisesResponse.ok) {
          setError("No se pudieron cargar grupos musculares y ejercicios.");
          return;
        }

        setMuscleGroups(Array.isArray(groupsJson?.data) ? groupsJson.data : []);
        setExercises(Array.isArray(exercisesJson?.data) ? exercisesJson.data : []);
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

  const exerciseById = useMemo(() => {
    return new Map(exercises.map((exercise) => [String(exercise.id), exercise]));
  }, [exercises]);

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

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
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

      if (
        exerciseRows.length === 0 &&
        !window.confirm("La rutina quedara sin ejercicios. Deseas guardar los cambios?")
      ) {
        return;
      }

      const payloadExercises = buildPayloadExercises();
      const response = await fetch(`/api/routines/${routine.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          idUser: Number(routine?.idUser),
          order,
          time,
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
    }
  }

  return (
    <section className={isInModal ? "" : "rounded-2xl bg-white p-6 shadow-sm"}>
      {!isInModal ? <h2 className="text-lg font-semibold text-slate-900">Editar rutina</h2> : null}
      <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
        <div className="grid gap-3 md:grid-cols-2">
          <input
            required
            type="text"
            placeholder="Nombre de la rutina"
            value={routineName}
            onChange={(event) => setRoutineName(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 md:col-span-2 text-black"
          />
          <input
            required
            type="number"
            min="1"
            placeholder="Orden"
            value={routineOrder}
            onChange={(event) => setRoutineOrder(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-black"
          />
          <input
            required
            type="number"
            min="1"
            placeholder="Tiempo (minutos)"
            value={routineTime}
            onChange={(event) => setRoutineTime(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-black"
          />
        </div>

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-slate-800">Ejercicios de la rutina</p>
            <button
              type="button"
              onClick={addExerciseRow}
              disabled={loadingCatalogs}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              Agregar ejercicio
            </button>
          </div>

          {loadingCatalogs ? (
            <p className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">
              Cargando catalogo de ejercicios...
            </p>
          ) : null}

          {!loadingCatalogs && exerciseRows.length === 0 ? (
            <p className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600">
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

              return (
                <article key={row.rowKey} className="rounded-xl border border-slate-200 p-3">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Ejercicio #{index + 1}
                    </p>
                    <button
                      type="button"
                      onClick={() => removeExerciseRow(row.rowKey)}
                      className="rounded-lg border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                    >
                      Quitar
                    </button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <select
                      value={effectiveMuscleGroupId}
                      onChange={(event) => updateExerciseRow(row.rowKey, "muscleGroupId", event.target.value)}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900"
                    >
                      <option value="" disabled className="bg-white text-slate-900">Seleccionar grupo muscular</option>
                      {muscleGroups.map((group) => (
                        <option key={group.id} value={group.id} className="bg-white text-slate-900">
                          {group.name}
                        </option>
                      ))}
                    </select>

                    <select
                      value={row.idEjercice}
                      onChange={(event) => updateExerciseRow(row.rowKey, "idEjercice", event.target.value)}
                      disabled={!effectiveMuscleGroupId}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 disabled:bg-slate-100 disabled:text-slate-500"
                    >
                      <option value="" disabled className="bg-white text-slate-900">
                        {effectiveMuscleGroupId ? "Seleccionar ejercicio" : "Primero selecciona grupo muscular"}
                      </option>
                      {selectedExercise && !availableExercises.some((exercise) => String(exercise.id) === String(row.idEjercice)) ? (
                        <option value={selectedExercise.id} className="bg-white text-slate-900">{selectedExercise.name}</option>
                      ) : null}
                      {availableExercises.map((exercise) => (
                        <option key={exercise.id} value={exercise.id} className="bg-white text-slate-900">
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
                      className="rounded-lg border border-slate-300 px-3 py-2 text-black"
                    />

                    <input
                      type="number"
                      min="0"
                      placeholder="Descanso entre series (min)"
                      value={row.rest}
                      onChange={(event) => updateExerciseRow(row.rowKey, "rest", event.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-black"
                    />

                    <input
                      type="text"
                      placeholder="Comentario (opcional)"
                      value={row.comments}
                      onChange={(event) => updateExerciseRow(row.rowKey, "comments", event.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 md:col-span-2 text-black"
                    />
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="submit"
            disabled={saving || loadingCatalogs}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </form>
    </section>
  );
}
