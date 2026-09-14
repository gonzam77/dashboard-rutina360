"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { Alert, EmptyState } from "@/components/ui/Feedback";

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
    <section className="r360-card p-6">
      <h2 className="flex items-center gap-2 text-lg font-bold text-texto">
        <Icon name="mas" className="text-acento" />
        Asignar una rutina
      </h2>
      <p className="mt-1 text-sm text-texto-2">
        La rutina aparece en la app del atleta apenas se asigna.
      </p>

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
                  ? "border border-acento/45 bg-acento/20 text-acento"
                  : "border border-linea bg-superficie-alta text-texto-2 hover:border-acento/35 hover:text-texto"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}

      {availableRoutines.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon="rutinas"
          title="No hay rutinas disponibles para asignar"
          description="Crea una rutina desde la seccion Rutinas, o pedile al gimnasio que comparta las suyas."
        />
      ) : unassignedRoutines.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon="check"
          title="Ya tiene todas las rutinas disponibles"
          description="Este atleta tiene asignadas todas las rutinas a las que llegas."
        />
      ) : filteredRoutines.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon="buscar"
          title="No hay rutinas en este filtro"
          description="Proba con la pestana Todas."
        />
      ) : (
        <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={handleAssignRoutine}>
          <label className="flex min-w-[260px] flex-1 flex-col">
            <span className="r360-label">Rutina disponible</span>
            <select
              required
              value={selectedRoutineId}
              onChange={(event) => setSelectedRoutineId(event.target.value)}
              className="r360-input"
            >
              <option value="" disabled className="bg-superficie-alta text-texto">
                Seleccionar rutina
              </option>
              {filteredRoutines.map((routine) => (
                <option key={routine.id} value={routine.id} className="bg-superficie-alta text-texto">
                  {routine.name || `Rutina #${routine.id}`} (ID {routine.id})
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={loadingAssign}
            className="r360-btn r360-btn-primary"
          >
            {loadingAssign ? "Asignando..." : "Asignar rutina"}
          </button>
        </form>
      )}

      {message ? (
        <Alert tone="exito" className="mt-4">
          {message}
        </Alert>
      ) : null}
      {error ? <Alert className="mt-4">{error}</Alert> : null}
    </section>
  );
}
