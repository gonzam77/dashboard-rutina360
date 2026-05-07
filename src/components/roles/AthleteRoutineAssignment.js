"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AthleteRoutineAssignment({ athleteId, coachId, coachRoutines }) {
  const router = useRouter();
  const [selectedRoutineId, setSelectedRoutineId] = useState("");
  const [loadingAssign, setLoadingAssign] = useState(false);
  const [loadingUnlink, setLoadingUnlink] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleAssignRoutine(event) {
    event.preventDefault();
    setLoadingAssign(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/routines/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idRoutine: Number(selectedRoutineId),
          idAthlete: Number(athleteId),
        }),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(json?.message || "No se pudo asignar la rutina.");
        return;
      }

      setMessage("Rutina asignada correctamente.");
      router.refresh();
    } catch {
      setError("Error de conexion al asignar rutina.");
    } finally {
      setLoadingAssign(false);
    }
  }

  async function handleUnlinkAthlete() {
    setLoadingUnlink(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/users/link", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idAthlete: Number(athleteId),
          idCoach: Number(coachId),
        }),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(json?.message || "No se pudo desasignar el atleta.");
        return;
      }

      setMessage("Atleta desasignado correctamente.");
      router.refresh();
    } catch {
      setError("Error de conexion al desasignar atleta.");
    } finally {
      setLoadingUnlink(false);
    }
  }

  return (
    <section className="rounded-3xl border border-white/15 bg-[#17385a] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
      <h2 className="text-lg font-semibold text-white">Gestion de rutina del atleta</h2>

      {coachRoutines.length === 0 ? (
        <p className="mt-3 text-sm text-white/75">Este coach no tiene rutinas para asignar.</p>
      ) : (
        <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={handleAssignRoutine}>
          <label className="flex min-w-[260px] flex-col text-sm text-white/85">
            Rutina del coach
            <select
              required
              value={selectedRoutineId}
              onChange={(event) => setSelectedRoutineId(event.target.value)}
              className="mt-1 rounded-lg border border-white/20 bg-[#0f2a46] px-3 py-2 text-white"
            >
              <option value="" disabled>Seleccionar rutina</option>
              {coachRoutines.map((routine) => (
                <option key={routine.id} value={routine.id}>
                  {routine.name || `Rutina #${routine.id}`} (ID {routine.id})
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={loadingAssign}
            className="rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/20 disabled:opacity-60"
          >
            {loadingAssign ? "Asignando..." : "Asignar rutina"}
          </button>
        </form>
      )}

      <div className="mt-5 border-t border-white/15 pt-4">
        <button
          type="button"
          onClick={handleUnlinkAthlete}
          disabled={loadingUnlink}
          className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-60"
        >
          {loadingUnlink ? "Desasignando..." : "Eliminar asignacion de atleta"}
        </button>
      </div>

      {message ? <p className="mt-3 text-sm text-cyan-100">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-200">{error}</p> : null}
    </section>
  );
}
