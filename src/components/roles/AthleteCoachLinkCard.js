"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AthleteCoachLinkCard({
  roleId,
  athleteId,
  assignedCoaches = [],
  availableCoaches = [],
}) {
  const router = useRouter();
  const [selectedCoachId, setSelectedCoachId] = useState("");
  const [loadingAssign, setLoadingAssign] = useState(false);
  const [loadingUnlink, setLoadingUnlink] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleAssignCoach(event) {
    event.preventDefault();

    if (!selectedCoachId || Number(selectedCoachId) <= 0) {
      setError("Selecciona un coach para asignar.");
      return;
    }

    setLoadingAssign(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/users/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idAthlete: Number(athleteId),
          idCoach: Number(selectedCoachId),
        }),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(json?.message || "No se pudo asignar el coach al atleta.");
        return;
      }

      setMessage("Coach asignado correctamente.");
      setSelectedCoachId("");
      router.refresh();
    } catch {
      setError("Error de conexion al asignar coach.");
    } finally {
      setLoadingAssign(false);
    }
  }

  async function handleUnlinkAthlete(targetCoachId) {
    if (!targetCoachId) {
      setError("No se encontro un coach asignado para este atleta.");
      return;
    }

    setLoadingUnlink(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/users/link", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idAthlete: Number(athleteId),
          idCoach: Number(targetCoachId),
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
      <h2 className="text-lg font-bold text-white">Vinculo con coach</h2>

      {assignedCoaches.length > 0 ? (
        <div className="mt-4 space-y-2">
          {assignedCoaches.map((assignedCoach) => (
            <div key={assignedCoach.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-white/15 bg-[#0f2a46] px-3 py-2">
              <span className="text-sm text-white/85">
                {assignedCoach.username} {assignedCoach.email ? `(${assignedCoach.email})` : ""}
              </span>
              <Link
                href={`/inicio/roles-usuarios/${roleId}/${assignedCoach.id}`}
                className="rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 hover:bg-cyan-300/20"
              >
                Ver perfil
              </Link>
              <button
                type="button"
                onClick={() => handleUnlinkAthlete(assignedCoach.id)}
                disabled={loadingUnlink}
                className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-500 disabled:opacity-60"
              >
                {loadingUnlink ? "Desasignando..." : "Desasignar"}
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <form className="mt-4 flex flex-col gap-2" onSubmit={handleAssignCoach}>
        <select
          value={selectedCoachId}
          onChange={(event) => setSelectedCoachId(event.target.value)}
          className="rounded-lg border border-white/20 bg-[#0f2a46] px-3 py-2 text-sm text-white"
        >
          <option value="">Seleccionar coach para asignar</option>
          {availableCoaches.map((coachCandidate) => (
            <option key={coachCandidate.id} value={coachCandidate.id}>
              {coachCandidate.username || `Coach #${coachCandidate.id}`} {coachCandidate.email ? `(${coachCandidate.email})` : ""}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={loadingAssign || availableCoaches.length === 0}
          className="self-start rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/20 disabled:opacity-60"
        >
          {loadingAssign ? "Asignando..." : "Asignar coach"}
        </button>
      </form>

      {availableCoaches.length === 0 ? (
        <p className="mt-2 text-xs text-white/70">No hay coaches disponibles para agregar.</p>
      ) : null}

      {message ? <p className="mt-3 text-sm text-cyan-100">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-200">{error}</p> : null}
    </section>
  );
}
