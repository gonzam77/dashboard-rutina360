"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CoachAthleteAssignment({ coachId, athletes }) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAthleteId, setSelectedAthleteId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleAssign(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/users/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idCoach: Number(coachId),
          idAthlete: Number(selectedAthleteId),
        }),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(json?.message || "No se pudo asignar el atleta.");
        return;
      }

      setMessage("Atleta asignado correctamente.");
      setSelectedAthleteId("");
      setIsModalOpen(false);
      router.refresh();
    } catch {
      setError("Error de conexion al asignar atleta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">Administra los atletas vinculados a este coach.</p>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Asignar atleta
        </button>
      </div>

      {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}

      {isModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-slate-900">Asignar nuevo atleta</h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cerrar
              </button>
            </div>

            {athletes.length === 0 ? (
              <p className="text-sm text-slate-600">No hay atletas disponibles para asignar.</p>
            ) : (
              <form className="space-y-3" onSubmit={handleAssign}>
                <label className="block text-sm text-slate-700">
                  Atleta
                  <select
                    required
                    value={selectedAthleteId}
                    onChange={(event) => setSelectedAthleteId(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
                  >
                    <option value="" disabled>Seleccionar atleta</option>
                    {athletes.map((athlete) => (
                      <option key={athlete.id} value={athlete.id}>
                        {athlete.username || `Atleta #${athlete.id}`} (ID {athlete.id})
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {loading ? "Asignando..." : "Confirmar asignacion"}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
