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
  const [muscleGroupId, setMuscleGroupId] = useState("");
  const [exerciseId, setExerciseId] = useState("");
  const [muscleGroups, setMuscleGroups] = useState([]);
  const [exercises, setExercises] = useState([]);
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

  const filteredExercises = useMemo(
    () => exercises.filter((item) => String(item?.idMuscleGroup) === String(muscleGroupId)),
    [exercises, muscleGroupId]
  );

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/routines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: routineName,
          idUser: Number(coachId),
          order: Number(routineOrder),
          time: Number(routineTime),
          exercises: [
            {
              idEjercice: Number(exerciseId),
              series: 4,
              rest: 90,
              comments: "",
            },
          ],
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
      setMuscleGroupId("");
      setExerciseId("");
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
        <select
          required
          value={muscleGroupId}
          onChange={(event) => {
            setMuscleGroupId(event.target.value);
            setExerciseId("");
          }}
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
          required
          value={exerciseId}
          onChange={(event) => setExerciseId(event.target.value)}
          disabled={!muscleGroupId}
          className="rounded-lg border border-slate-300 px-3 py-2 bg-white disabled:bg-slate-100"
        >
          <option value="" disabled>
            {muscleGroupId ? "Seleccionar ejercicio" : "Primero selecciona grupo muscular"}
          </option>
          {filteredExercises.map((exercise) => (
            <option key={exercise.id} value={exercise.id}>
              {exercise.name}
            </option>
          ))}
        </select>
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
