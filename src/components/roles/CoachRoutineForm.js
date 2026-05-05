"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const MUSCLE_GROUPS_URL = "https://rutina360-server.onrender.com/muscleGroup";
const EXERCISES_URL = "https://rutina360-server.onrender.com/ejercice";

export default function CoachRoutineForm({ coachId }) {
  const router = useRouter();
  const [routineName, setRoutineName] = useState("");
  const [routineOrder, setRoutineOrder] = useState("");
  const [routineTime, setRoutineTime] = useState("");
  const [muscleGroups, setMuscleGroups] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [confirmedExercises, setConfirmedExercises] = useState([]);
  const [draftExercise, setDraftExercise] = useState({
    muscleGroupId: "",
    idEjercice: "",
    series: "",
    rest: "",
    comments: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadCatalogs() {
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

        setMuscleGroups(Array.isArray(groupsJson?.data) ? groupsJson.data : []);
        setExercises(Array.isArray(exercisesJson?.data) ? exercisesJson.data : []);
      } catch {
        if (!mounted) {
          return;
        }
        setError("No se pudieron cargar grupos musculares y ejercicios.");
      }
    }

    loadCatalogs();

    return () => {
      mounted = false;
    };
  }, []);

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

  function resetDraftExercise() {
    setDraftExercise({
      muscleGroupId: "",
      idEjercice: "",
      series: "",
      rest: "",
      comments: "",
    });
  }

  function addConfirmedExercise() {
    if (!draftExercise.muscleGroupId || !draftExercise.idEjercice || !draftExercise.series || !draftExercise.rest) {
      setError("Completa grupo muscular, ejercicio, series y descanso antes de confirmar.");
      return;
    }

    setError("");
    setConfirmedExercises((current) => [
      ...current,
      {
        idEjercice: Number(draftExercise.idEjercice),
        series: Number(draftExercise.series),
        rest: Number(draftExercise.rest),
        comments: draftExercise.comments?.trim() || "",
      },
    ]);
    resetDraftExercise();
  }

  function removeConfirmedExercise(index) {
    setConfirmedExercises((current) => current.filter((_, i) => i !== index));
  }

  function updateDraftExercise(key, value) {
    setDraftExercise((current) => {
      if (key === "muscleGroupId") {
        return { ...current, muscleGroupId: value, idEjercice: "" };
      }
      return { ...current, [key]: value };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (confirmedExercises.length === 0) {
        setError("Debes confirmar al menos un ejercicio para crear la rutina.");
        setLoading(false);
        return;
      }

      const response = await fetch("/api/routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: routineName,
          idUser: Number(coachId),
          order: Number(routineOrder),
          time: Number(routineTime),
          exercises: confirmedExercises,
        }),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(json?.message || "No se pudo crear la rutina.");
        return;
      }

      setRoutineName("");
      setRoutineOrder("");
      setRoutineTime("");
      setConfirmedExercises([]);
      resetDraftExercise();
      setMessage("Rutina creada correctamente.");
      router.refresh();
    } catch {
      setError("Error de conexion al crear rutina.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Crear rutina para este coach</h2>
      <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
        <input
          required
          type="text"
          placeholder="Nombre de la rutina"
          value={routineName}
          onChange={(event) => setRoutineName(event.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 md:col-span-2"
        />
        <input
          required
          type="number"
          min="1"
          placeholder="Orden"
          value={routineOrder}
          onChange={(event) => setRoutineOrder(event.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2"
        />
        <input
          required
          type="number"
          min="1"
          placeholder="Tiempo (minutos)"
          value={routineTime}
          onChange={(event) => setRoutineTime(event.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2"
        />
        <div className="md:col-span-2">
          <p className="mb-2 text-sm font-medium text-slate-800">Agregar ejercicios (uno por uno)</p>
          <div className="rounded-lg border border-slate-200 p-3">
            <div className="grid gap-3 md:grid-cols-2">
              <select
                value={draftExercise.muscleGroupId}
                onChange={(event) => updateDraftExercise("muscleGroupId", event.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 bg-white"
              >
                <option value="" disabled>Seleccionar grupo muscular</option>
                {muscleGroups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>

              <select
                value={draftExercise.idEjercice}
                onChange={(event) => updateDraftExercise("idEjercice", event.target.value)}
                disabled={!draftExercise.muscleGroupId}
                className="rounded-lg border border-slate-300 px-3 py-2 bg-white disabled:bg-slate-100"
              >
                <option value="" disabled>
                  {draftExercise.muscleGroupId ? "Seleccionar ejercicio" : "Primero selecciona grupo muscular"}
                </option>
                {(exercisesByGroup.get(String(draftExercise.muscleGroupId)) || []).map((exercise) => (
                  <option key={exercise.id} value={exercise.id}>
                    {exercise.name}
                  </option>
                ))}
              </select>

              <input
                type="number"
                min="1"
                placeholder="Cantidad de series"
                value={draftExercise.series}
                onChange={(event) => updateDraftExercise("series", event.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2"
              />

              <input
                type="number"
                min="0"
                placeholder="Descanso entre series (min)"
                value={draftExercise.rest}
                onChange={(event) => updateDraftExercise("rest", event.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2"
              />

              <input
                type="text"
                placeholder="Comentario (opcional)"
                value={draftExercise.comments}
                onChange={(event) => updateDraftExercise("comments", event.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 md:col-span-2"
              />
            </div>
            <button
              type="button"
              onClick={addConfirmedExercise}
              className="mt-3 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Confirmar ejercicio y agregar
            </button>
          </div>

          <div className="mt-3 space-y-2">
            {confirmedExercises.length === 0 ? (
              <p className="text-sm text-slate-600">Todavia no hay ejercicios confirmados.</p>
            ) : (
              confirmedExercises.map((item, index) => (
                <div key={`confirmed-${index}`} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
                  <p className="text-slate-700">
                    #{index + 1} · Ejercicio ID {item.idEjercice} · Series {item.series} · Descanso {item.rest} min
                  </p>
                  <button
                    type="button"
                    onClick={() => removeConfirmedExercise(index)}
                    className="rounded-md border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                  >
                    Quitar
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800 disabled:opacity-60 md:col-span-2"
        >
          {loading ? "Creando rutina..." : "Crear rutina"}
        </button>
      </form>
      {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
    </section>
  );
}
