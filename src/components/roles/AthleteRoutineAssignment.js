"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const GROUP_LABELS = {
  own: "Mias",
  gym: "Del gym",
  others: "Otros coaches",
};

export default function AthleteRoutineAssignment({
  athleteId,
  availableRoutines = [],
  assignedRoutines = [],
  viewerRoleKey = "unknown",
  routineGroups = null,
}) {
  const router = useRouter();
  const [selectedRoutineId, setSelectedRoutineId] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [loadingAssign, setLoadingAssign] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  /** Rutinas del gimnasio que el atleta todavia no tiene asignadas. */
  const unassignedRoutines = useMemo(() => {
    const assignedIds = new Set(
      (Array.isArray(assignedRoutines) ? assignedRoutines : [])
        .map((item) => Number(item?.idRoutine || item?.Routine?.id))
        .filter((id) => Number.isFinite(id) && id > 0)
    );

    return (Array.isArray(availableRoutines) ? availableRoutines : []).filter((routine) => {
      const routineId = Number(routine?.id);
      return Number.isFinite(routineId) && routineId > 0 && !assignedIds.has(routineId);
    });
  }, [assignedRoutines, availableRoutines]);

  const groupedAvailable = useMemo(() => {
    const availableById = new Map(unassignedRoutines.map((routine) => [Number(routine?.id), routine]));
    const groups = routineGroups && typeof routineGroups === "object" ? routineGroups : {};

    function mapGroup(groupItems) {
      return (Array.isArray(groupItems) ? groupItems : [])
        .map((item) => availableById.get(Number(item?.id)))
        .filter(Boolean);
    }

    return {
      all: unassignedRoutines,
      own: mapGroup(groups.own),
      gym: mapGroup(groups.gym),
      others: mapGroup(groups.others),
    };
  }, [routineGroups, unassignedRoutines]);

  /** Solo se ofrecen los filtros que tienen rutinas: evita pestanas vacias. */
  const filterOptions = useMemo(() => {
    const options = [{ key: "all", label: "Todas" }];

    for (const key of ["own", "gym", "others"]) {
      if (groupedAvailable[key].length > 0) {
        options.push({
          key,
          label: key === "own" && viewerRoleKey === "admin" ? "Del gym" : GROUP_LABELS[key],
        });
      }
    }

    return options;
  }, [groupedAvailable, viewerRoleKey]);

  const filteredRoutines = groupedAvailable[activeFilter] || groupedAvailable.all;

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
      setSelectedRoutineId("");
      router.refresh();
    } catch {
      setError("Error de conexion al asignar rutina.");
    } finally {
      setLoadingAssign(false);
    }
  }

  return (
    <section className="rounded-3xl border border-white/15 bg-[#17385a] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
      <h2 className="text-lg font-semibold text-white">Gestion de rutina del atleta</h2>

      {filterOptions.length > 1 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {filterOptions.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => {
                setActiveFilter(option.key);
                setSelectedRoutineId("");
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeFilter === option.key
                  ? "border border-cyan-300/40 bg-cyan-300/20 text-cyan-100"
                  : "border border-white/20 bg-[#0f2a46] text-white/80 hover:bg-white/10"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}

      {availableRoutines.length === 0 ? (
        <p className="mt-3 text-sm text-white/75">
          No hay rutinas del coach o del gimnasio disponibles para asignar.
        </p>
      ) : unassignedRoutines.length === 0 ? (
        <p className="mt-3 text-sm text-white/75">
          Este atleta ya tiene asignadas todas las rutinas disponibles.
        </p>
      ) : filteredRoutines.length === 0 ? (
        <p className="mt-3 text-sm text-white/75">No hay rutinas disponibles en este filtro.</p>
      ) : (
        <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={handleAssignRoutine}>
          <label className="flex min-w-[260px] flex-col text-sm text-white/85">
            Rutina disponible
            <select
              required
              value={selectedRoutineId}
              onChange={(event) => setSelectedRoutineId(event.target.value)}
              className="mt-1 rounded-lg border border-white/20 bg-[#0f2a46] px-3 py-2 text-white"
            >
              <option value="" disabled className="bg-[#0f2a46] text-white">
                Seleccionar rutina
              </option>
              {filteredRoutines.map((routine) => (
                <option key={routine.id} value={routine.id} className="bg-[#0f2a46] text-white">
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

      {message ? <p className="mt-3 text-sm text-cyan-100">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-200">{error}</p> : null}
    </section>
  );
}
