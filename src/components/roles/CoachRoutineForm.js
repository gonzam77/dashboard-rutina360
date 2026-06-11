"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { extractArrayPayload } from "@/lib/api-response";

const MUSCLE_GROUPS_URL = "/api/muscle-groups";
const EXERCISES_URL = "/api/exercises";

export default function CoachRoutineForm({ coachId, isInModal = false, onSaved }) {
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
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

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
          const fallbackMessage = "No se pudieron cargar grupos musculares y ejercicios.";
          setError(groupsJson?.message || exercisesJson?.message || fallbackMessage);
          setMuscleGroups([]);
          setExercises([]);
          return;
        }

        setMuscleGroups(extractArrayPayload(groupsJson));
        setExercises(extractArrayPayload(exercisesJson));
      } catch (loadError) {
        if (!mounted) {
          return;
        }
        setError(loadError.message || "No se pudieron cargar grupos musculares y ejercicios.");
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
    if (loadingCatalogs) {
      setError("Espera a que termine de cargar el catalogo de ejercicios.");
      return;
    }

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
      if (typeof onSaved === "function") {
        onSaved();
      }
    } catch {
      setError("Error de conexion al crear rutina.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={isInModal ? "" : "rounded-2xl border border-white/15 bg-[#0f2a46] p-6 shadow-sm"}>
      {!isInModal ? <h2 className="text-lg font-semibold text-white">Crear rutina para este coach</h2> : null}
      <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
        <input
          required
          type="text"
          placeholder="Nombre de la rutina"
          value={routineName}
          onChange={(event) => setRoutineName(event.target.value)}
          className="rounded-lg border border-white/20 bg-[#17385a] px-3 py-2 text-white placeholder:text-white/55 md:col-span-2"
        />
        <input
          required
          type="number"
          min="1"
          placeholder="Orden"
          value={routineOrder}
          onChange={(event) => setRoutineOrder(event.target.value)}
          className="rounded-lg border border-white/20 bg-[#17385a] px-3 py-2 text-white placeholder:text-white/55"
        />
        <input
          required
          type="number"
          min="1"
          placeholder="Tiempo (minutos)"
          value={routineTime}
          onChange={(event) => setRoutineTime(event.target.value)}
          className="rounded-lg border border-white/20 bg-[#17385a] px-3 py-2 text-white placeholder:text-white/55"
        />
        <div className="md:col-span-2">
          <p className="mb-2 text-sm font-medium text-white/85">Agregar ejercicios (uno por uno)</p>
          <div className="flex flex-col rounded-lg border border-white/15 bg-[#17385a] p-3">
            {loadingCatalogs ? (
              <p className="mb-3 rounded-lg border border-white/15 bg-[#0f2a46] px-3 py-2 text-sm text-white/70">
                Cargando grupos musculares y ejercicios...
              </p>
            ) : null}
            <div className="grid gap-3 md:grid-cols-2">
              <select
                value={draftExercise.muscleGroupId}
                onChange={(event) => updateDraftExercise("muscleGroupId", event.target.value)}
                disabled={loadingCatalogs || muscleGroups.length === 0}
                className="rounded-lg border border-white/20 bg-[#0f2a46] px-3 py-2 text-white disabled:bg-[#0b223a] disabled:text-white/45"
              >
                <option value="" disabled className="bg-[#0f2a46] text-white">
                  {muscleGroups.length > 0 ? "Seleccionar grupo muscular" : "No hay grupos musculares disponibles"}
                </option>
                {muscleGroups.map((group) => (
                  <option key={group.id} value={group.id} className="bg-[#0f2a46] text-white">
                    {group.name}
                  </option>
                ))}
              </select>

              <select
                value={draftExercise.idEjercice}
                onChange={(event) => updateDraftExercise("idEjercice", event.target.value)}
                disabled={loadingCatalogs || !draftExercise.muscleGroupId}
                className="rounded-lg border border-white/20 bg-[#0f2a46] px-3 py-2 text-white disabled:bg-[#0b223a] disabled:text-white/45"
              >
                <option value="" disabled className="bg-[#0f2a46] text-white">
                  {draftExercise.muscleGroupId ? "Seleccionar ejercicio" : "Primero selecciona grupo muscular"}
                </option>
                {(exercisesByGroup.get(String(draftExercise.muscleGroupId)) || []).map((exercise) => (
                  <option key={exercise.id} value={exercise.id} className="bg-[#0f2a46] text-white">
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
                className="rounded-lg border border-white/20 bg-[#0f2a46] px-3 py-2 text-white placeholder:text-white/55"
              />

              <input
                type="number"
                min="0"
                placeholder="Descanso entre series (min)"
                value={draftExercise.rest}
                onChange={(event) => updateDraftExercise("rest", event.target.value)}
                className="rounded-lg border border-white/20 bg-[#0f2a46] px-3 py-2 text-white placeholder:text-white/55"
              />
            </div>
            <div className="mt-auto space-y-3 pt-3">
              <input
                type="text"
                placeholder="Comentario (opcional)"
                value={draftExercise.comments}
                onChange={(event) => updateDraftExercise("comments", event.target.value)}
                className="w-full rounded-lg border border-white/20 bg-[#0f2a46] px-3 py-2 text-white placeholder:text-white/55"
              />
              <button
                type="button"
                onClick={addConfirmedExercise}
                disabled={loadingCatalogs}
                className="rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-3 py-2 text-sm font-medium text-cyan-100 hover:bg-cyan-300/20 disabled:opacity-60"
              >
                Confirmar ejercicio y agregar
              </button>
            </div>
          </div>

          <div className="mt-3 space-y-2">
            {confirmedExercises.length === 0 ? (
              <p className="text-sm text-white/70">Todavia no hay ejercicios confirmados.</p>
            ) : (
              confirmedExercises.map((item, index) => (
                <div key={`confirmed-${index}`} className="flex items-center justify-between rounded-lg border border-white/15 bg-[#17385a] px-3 py-2 text-sm">
                  <p className="text-white/85">
                    #{index + 1} - Ejercicio ID {item.idEjercice} - Series {item.series} - Descanso {item.rest} min
                  </p>
                  <button
                    type="button"
                    onClick={() => removeConfirmedExercise(index)}
                    className="rounded-md border border-rose-300/45 bg-rose-900/25 px-2 py-1 text-xs font-medium text-rose-100 hover:bg-rose-900/35"
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
          disabled={loading || loadingCatalogs}
          className="rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-4 py-2 font-medium text-cyan-100 hover:bg-cyan-300/20 disabled:opacity-60 md:col-span-2"
        >
          {loading ? "Creando rutina..." : "Crear rutina"}
        </button>
      </form>
      {message ? <p className="mt-3 text-sm text-cyan-100">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-200">{error}</p> : null}
    </section>
  );
}
