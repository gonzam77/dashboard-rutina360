"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Icon from "@/components/ui/Icon";
import { Alert, EmptyState } from "@/components/ui/Feedback";

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
  const [unlinkTarget, setUnlinkTarget] = useState(null);
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

  async function handleUnlinkAthlete() {
    const targetCoachId = unlinkTarget?.id;

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
      setUnlinkTarget(null);
    }
  }

  return (
    <section className="r360-card p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold text-texto">
        <Icon name="usuarios" className="text-acento" />
        Vinculo con coach
      </h2>

      {assignedCoaches.length > 0 ? (
        <div className="mt-4 space-y-2">
          {assignedCoaches.map((assignedCoach) => (
            <div
              key={assignedCoach.id}
              className="r360-card-inset flex flex-wrap items-center gap-2 px-3 py-2.5"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-acento/35 bg-acento/10 text-sm font-bold text-acento">
                {String(assignedCoach.username || "?").charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-texto">
                  {assignedCoach.username}
                </span>
                <span className="block truncate text-xs text-texto-3">
                  {assignedCoach.email || "Sin email"}
                </span>
              </span>
              <Link
                href={`/inicio/roles-usuarios/${roleId}/${assignedCoach.id}`}
                className="r360-btn r360-btn-accent r360-btn-sm"
              >
                Ver perfil
              </Link>
              <button
                type="button"
                onClick={() => setUnlinkTarget(assignedCoach)}
                disabled={loadingUnlink}
                className="r360-btn r360-btn-danger r360-btn-sm"
              >
                Desasignar
              </button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          className="mt-4"
          icon="usuarios"
          title="Sin coach asignado"
          description="Elegi un coach del gimnasio en la lista de abajo."
        />
      )}

      <form className="mt-4 flex flex-col gap-2" onSubmit={handleAssignCoach}>
        <select
          value={selectedCoachId}
          onChange={(event) => setSelectedCoachId(event.target.value)}
          className="r360-input"
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
          className="r360-btn r360-btn-accent r360-btn-sm self-start"
        >
          {loadingAssign ? "Asignando..." : "Asignar coach"}
        </button>
      </form>

      {availableCoaches.length === 0 ? (
        <p className="mt-2 text-xs text-texto-3">No hay coaches disponibles para agregar.</p>
      ) : null}

      {message ? (
        <Alert tone="exito" className="mt-4">
          {message}
        </Alert>
      ) : null}
      {error ? <Alert className="mt-4">{error}</Alert> : null}

      {/* Desvincular corta el seguimiento del coach: se confirma como el resto
          de las acciones destructivas del panel. */}
      <ConfirmDialog
        open={Boolean(unlinkTarget)}
        title="Desasignar coach"
        description={`Vas a desvincular a ${unlinkTarget?.username || "este coach"} de este atleta. El coach dejara de verlo entre sus atletas; podes volver a vincularlos cuando quieras.`}
        confirmLabel="Desasignar"
        pendingLabel="Desasignando..."
        loading={loadingUnlink}
        onConfirm={handleUnlinkAthlete}
        onCancel={() => {
          if (!loadingUnlink) {
            setUnlinkTarget(null);
          }
        }}
      />
    </section>
  );
}
