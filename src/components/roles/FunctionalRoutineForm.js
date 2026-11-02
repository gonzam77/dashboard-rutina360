"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/Feedback";
import ExerciseImage from "@/components/ui/ExerciseImage";
import RestInput from "@/components/ui/RestInput";
import { extractArrayPayload } from "@/lib/api-response";
import { getRoutineExerciseId, getRoutineExercises } from "@/lib/routines";
import { restSecondsOf } from "@/lib/rest";
import {
  KIND_FUNCTIONAL,
  LIMITS,
  MODES,
  formatDuration,
  formatSeconds,
  functionalDurationSeconds,
} from "@/lib/functional";

// Un funcional ofrece solo el catalogo funcional (Core, Cardio, Pliometria...).
const MUSCLE_GROUPS_URL = "/api/muscle-groups?kind=functional";
const EXERCISES_URL = "/api/exercises?kind=functional";
const OPTION_CLASS = "bg-superficie-alta text-texto";
const SELECT_CLASS = "r360-input disabled:bg-[#0b223a] disabled:text-texto/45";
const DEFAULT_WORK_SECONDS = 40;
const MAX_WORK_MINUTES = 30;

let blockCounter = 0;
const newKey = () => {
  blockCounter += 1;
  return `bloque-${Date.now().toString(36)}-${blockCounter}`;
};

function blocksFromRoutine(routine) {
  return getRoutineExercises(routine).map((item) => ({
    key: newKey(),
    idEjercice: String(getRoutineExerciseId(item) || ""),
    groupId: String(item?.Ejercice?.idMuscleGroup || ""),
    workSeconds: Number(item?.workSeconds) || DEFAULT_WORK_SECONDS,
    restSeconds: restSecondsOf(item) ?? 0,
    comments: item?.comments || "",
  }));
}

const emptyDraft = () => ({ groupId: "", idEjercice: "", workSeconds: "", restSeconds: 15, comments: "" });

/**
 * Alta y edicion de un entrenamiento funcional: vueltas, descanso entre
 * vueltas, modo por defecto y la lista de bloques (ejercicio, trabajo,
 * descanso y nota), que se ordena arrastrando o con las flechas.
 */
export default function FunctionalRoutineForm({ coachId, routine = null, isInModal = false, onSaved }) {
  const router = useRouter();
  const editing = Boolean(routine?.id);

  const [name, setName] = useState(routine?.name || "");
  const [order, setOrder] = useState(routine?.order != null ? String(routine.order) : "1");
  const [rounds, setRounds] = useState(Number(routine?.rounds) || 1);
  const [roundRestSeconds, setRoundRestSeconds] = useState(Number(routine?.roundRestSeconds) || 0);
  const [defaultMode, setDefaultMode] = useState(routine?.defaultMode || "auto");
  const [blocks, setBlocks] = useState(() => (editing ? blocksFromRoutine(routine) : []));
  const [draft, setDraft] = useState(emptyDraft);
  const [editingKey, setEditingKey] = useState(null);

  const [groups, setGroups] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const dragKeyRef = useRef(null);
  const [dragOverKey, setDragOverKey] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const [groupsResponse, exercisesResponse] = await Promise.all([
          fetch(MUSCLE_GROUPS_URL, { cache: "no-store", credentials: "include" }),
          fetch(EXERCISES_URL, { cache: "no-store", credentials: "include" }),
        ]);
        const groupsJson = await groupsResponse.json().catch(() => ({}));
        const exercisesJson = await exercisesResponse.json().catch(() => ({}));
        if (!mounted) return;

        if (!groupsResponse.ok || !exercisesResponse.ok) {
          setError(groupsJson?.message || exercisesJson?.message || "No se pudo cargar el catalogo funcional.");
          return;
        }
        setGroups(extractArrayPayload(groupsJson));
        setExercises(extractArrayPayload(exercisesJson));
      } catch (loadError) {
        if (mounted) setError(loadError.message || "No se pudo cargar el catalogo funcional.");
      } finally {
        if (mounted) setLoadingCatalogs(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const exerciseById = useMemo(() => new Map(exercises.map((e) => [String(e.id), e])), [exercises]);
  const groupById = useMemo(() => new Map(groups.map((g) => [String(g.id), g])), [groups]);
  const exercisesOfDraftGroup = useMemo(
    () => exercises.filter((e) => String(e.idMuscleGroup) === String(draft.groupId)),
    [exercises, draft.groupId]
  );

  const totalSeconds = functionalDurationSeconds({ rounds, roundRestSeconds, blocks });

  function updateDraft(key, value) {
    setDraft((current) => {
      if (key === "groupId") return { ...current, groupId: value, idEjercice: "" };
      if (key === "idEjercice") {
        // Al elegir el ejercicio se precarga su tiempo sugerido (si no se escribio otro).
        const suggested = Number(exerciseById.get(String(value))?.defaultWorkSeconds) || DEFAULT_WORK_SECONDS;
        return { ...current, idEjercice: value, workSeconds: current.workSeconds === "" ? suggested : current.workSeconds };
      }
      return { ...current, [key]: value };
    });
  }

  function confirmDraft() {
    const [minWork] = LIMITS.workSeconds;
    if (!draft.idEjercice) {
      setError("Elegí la categoría y el ejercicio del bloque.");
      return;
    }
    if (!(Number(draft.workSeconds) >= minWork)) {
      setError("El trabajo tiene que durar al menos 5 segundos.");
      return;
    }
    setError("");

    const block = {
      key: editingKey || newKey(),
      idEjercice: String(draft.idEjercice),
      groupId: String(draft.groupId),
      workSeconds: Number(draft.workSeconds),
      restSeconds: Number(draft.restSeconds) || 0,
      comments: draft.comments.trim(),
    };

    setBlocks((current) =>
      editingKey ? current.map((b) => (b.key === editingKey ? block : b)) : [...current, block]
    );
    setEditingKey(null);
    setDraft(emptyDraft());
  }

  function editBlock(block) {
    setEditingKey(block.key);
    setDraft({
      groupId: block.groupId || String(exerciseById.get(block.idEjercice)?.idMuscleGroup || ""),
      idEjercice: block.idEjercice,
      workSeconds: block.workSeconds,
      restSeconds: block.restSeconds,
      comments: block.comments,
    });
  }

  function cancelEdit() {
    setEditingKey(null);
    setDraft(emptyDraft());
  }

  function removeBlock(key) {
    setBlocks((current) => current.filter((b) => b.key !== key));
    if (editingKey === key) cancelEdit();
  }

  function moveBlock(from, to) {
    setBlocks((current) => {
      if (to < 0 || to >= current.length || from === to) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  // Arrastrar y soltar nativo de HTML: sin dependencias. Las flechas hacen lo
  // mismo para teclado y pantallas tactiles.
  function handleDrop(targetKey) {
    const fromKey = dragKeyRef.current;
    dragKeyRef.current = null;
    setDragOverKey(null);
    if (!fromKey || fromKey === targetKey) return;
    const from = blocks.findIndex((b) => b.key === fromKey);
    const to = blocks.findIndex((b) => b.key === targetKey);
    moveBlock(from, to);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!name.trim()) {
      setError("Ponele un nombre al funcional.");
      return;
    }
    if (blocks.length === 0) {
      setError("Agregale al menos un bloque.");
      return;
    }

    setSaving(true);
    try {
      const body = {
        kind: KIND_FUNCTIONAL,
        name: name.trim(),
        order: Number(order) || 1,
        ...(editing ? {} : { idUser: Number(coachId) }),
        rounds,
        roundRestSeconds: rounds > 1 ? roundRestSeconds : 0,
        defaultMode,
        exercises: blocks.map((b) => ({
          idEjercice: Number(b.idEjercice),
          workSeconds: b.workSeconds,
          restSeconds: b.restSeconds,
          comments: b.comments,
        })),
      };

      const response = await fetch(editing ? `/api/routines/${routine.id}` : "/api/routines", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(json?.message || "No se pudo guardar el funcional.");
        return;
      }

      setMessage(editing ? "Funcional actualizado." : "Funcional creado.");
      if (!editing) {
        setName("");
        setRounds(1);
        setRoundRestSeconds(0);
        setDefaultMode("auto");
        setBlocks([]);
      }
      router.refresh();
      if (typeof onSaved === "function") onSaved();
    } catch {
      setError("Error de conexion al guardar el funcional.");
    } finally {
      setSaving(false);
    }
  }

  const draftExercise = exerciseById.get(String(draft.idEjercice));

  return (
    <section className={isInModal ? "" : "rounded-2xl border border-linea bg-superficie-alta p-6 shadow-sm"}>
      <form className="grid gap-4" onSubmit={handleSubmit}>
        <div className="grid gap-3 md:grid-cols-[1fr_8rem]">
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-texto-3">Nombre</span>
            <input
              required
              type="text"
              placeholder="Ej.: Core express"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="r360-input placeholder:text-texto-3"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-texto-3">Orden</span>
            <input
              type="number"
              min="1"
              value={order}
              onChange={(event) => setOrder(event.target.value)}
              className="r360-input"
            />
          </label>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-texto-3">Vueltas</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Una vuelta menos"
                className="r360-btn r360-btn-ghost r360-btn-sm"
                disabled={rounds <= LIMITS.rounds[0]}
                onClick={() => setRounds((v) => Math.max(LIMITS.rounds[0], v - 1))}
              >
                −
              </button>
              <span className="min-w-8 text-center text-lg font-bold text-texto" aria-live="polite">
                {rounds}
              </span>
              <button
                type="button"
                aria-label="Una vuelta más"
                className="r360-btn r360-btn-ghost r360-btn-sm"
                disabled={rounds >= LIMITS.rounds[1]}
                onClick={() => setRounds((v) => Math.min(LIMITS.rounds[1], v + 1))}
              >
                +
              </button>
            </div>
          </div>

          {rounds > 1 ? (
            <RestInput
              value={roundRestSeconds}
              onChange={setRoundRestSeconds}
              legend="Descanso entre vueltas"
              label="Entre vueltas"
            />
          ) : (
            <p className="self-end text-xs text-texto-3">Con una sola vuelta no hay descanso entre vueltas.</p>
          )}

          <fieldset className="flex flex-col gap-1">
            <legend className="text-xs font-semibold text-texto-3">Modo por defecto</legend>
            <div className="mt-1 flex gap-2">
              {MODES.map((mode) => (
                <label
                  key={mode.value}
                  title={mode.hint}
                  className={`r360-btn r360-btn-sm cursor-pointer ${
                    defaultMode === mode.value ? "r360-btn-accent" : "r360-btn-ghost"
                  }`}
                >
                  <input
                    type="radio"
                    name="defaultMode"
                    value={mode.value}
                    checked={defaultMode === mode.value}
                    onChange={() => setDefaultMode(mode.value)}
                    className="sr-only"
                  />
                  {mode.label}
                </label>
              ))}
            </div>
            <span className="text-xs text-texto-3">
              {MODES.find((m) => m.value === defaultMode)?.hint} El atleta lo puede cambiar al iniciar.
            </span>
          </fieldset>
        </div>

        <div className="rounded-lg border border-linea bg-superficie p-3">
          <p className="mb-2 text-sm font-medium text-texto-2">
            {editingKey ? "Editar bloque" : "Agregar un bloque"}
          </p>
          {loadingCatalogs ? (
            <p className="mb-3 r360-card-inset px-3 py-2 text-sm text-texto-2">Cargando el catálogo funcional...</p>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            <select
              value={draft.groupId}
              onChange={(event) => updateDraft("groupId", event.target.value)}
              disabled={loadingCatalogs || groups.length === 0}
              className={SELECT_CLASS}
              aria-label="Categoría"
            >
              <option value="" disabled className={OPTION_CLASS}>
                {groups.length > 0 ? "Elegí la categoría" : "No hay categorías funcionales"}
              </option>
              {groups.map((group) => (
                <option key={group.id} value={group.id} className={OPTION_CLASS}>
                  {group.name}
                </option>
              ))}
            </select>
            <select
              value={draft.idEjercice}
              onChange={(event) => updateDraft("idEjercice", event.target.value)}
              disabled={loadingCatalogs || !draft.groupId}
              className={SELECT_CLASS}
              aria-label="Ejercicio"
            >
              <option value="" disabled className={OPTION_CLASS}>
                {draft.groupId ? "Elegí el ejercicio" : "Primero elegí la categoría"}
              </option>
              {exercisesOfDraftGroup.map((exercise) => (
                <option key={exercise.id} value={exercise.id} className={OPTION_CLASS}>
                  {exercise.name}
                </option>
              ))}
            </select>
            <RestInput
              value={draft.workSeconds}
              onChange={(seconds) => updateDraft("workSeconds", seconds)}
              legend="Tiempo de trabajo"
              label="Trabajo"
              maxMinutes={MAX_WORK_MINUTES}
            />
            <RestInput
              value={draft.restSeconds}
              onChange={(seconds) => updateDraft("restSeconds", seconds)}
              legend="Descanso después del bloque"
            />
          </div>
          {draftExercise ? (
            <ExerciseImage exerciseId={draftExercise.id} name={draftExercise.name} className="mt-3 w-full max-w-sm" />
          ) : null}
          <input
            type="text"
            placeholder="Nota del bloque (opcional)"
            value={draft.comments}
            onChange={(event) => updateDraft("comments", event.target.value)}
            className="mt-3 w-full r360-input placeholder:text-texto-3"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={confirmDraft} disabled={loadingCatalogs} className="r360-btn r360-btn-accent r360-btn-sm">
              {editingKey ? "Guardar bloque" : "Agregar bloque"}
            </button>
            {editingKey ? (
              <button type="button" onClick={cancelEdit} className="r360-btn r360-btn-ghost r360-btn-sm">
                Cancelar
              </button>
            ) : null}
          </div>
        </div>

        <div>
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-texto-2">
              Bloques <span className="text-texto-3">({blocks.length})</span>
            </p>
            <span className="r360-badge r360-badge-acento">Duración total {formatDuration(totalSeconds)}</span>
          </div>
          {blocks.length === 0 ? (
            <p className="text-sm text-texto-2">Todavía no hay bloques.</p>
          ) : (
            <ol className="space-y-2">
              {blocks.map((block, index) => {
                const exercise = exerciseById.get(block.idEjercice);
                const group = groupById.get(String(exercise?.idMuscleGroup || block.groupId));
                const lastOfRound = index === blocks.length - 1;
                return (
                  <li
                    key={block.key}
                    draggable
                    onDragStart={() => {
                      dragKeyRef.current = block.key;
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setDragOverKey(block.key);
                    }}
                    onDragLeave={() => setDragOverKey(null)}
                    onDrop={() => handleDrop(block.key)}
                    className={`flex flex-wrap items-center gap-3 r360-card-inset p-3 ${
                      dragOverKey === block.key ? "ring-2 ring-acento" : ""
                    } ${editingKey === block.key ? "border-acento" : ""}`}
                  >
                    <span className="cursor-grab select-none text-texto-3" aria-hidden="true" title="Arrastrá para reordenar">
                      ⋮⋮
                    </span>
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-acento/12 text-sm font-bold text-acento">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-texto">{exercise?.name || `Ejercicio #${block.idEjercice}`}</p>
                      <p className="text-xs text-texto-3">
                        {group?.name ? `${group.name} · ` : ""}Trabajo {formatSeconds(block.workSeconds)} ·{" "}
                        {/* El descanso del ultimo bloque no se usa: lo reemplaza el de entre vueltas o el final. */}
                        {lastOfRound
                          ? rounds > 1
                            ? `Después: descanso entre vueltas (${formatSeconds(roundRestSeconds)})`
                            : "Último bloque"
                          : `Descanso ${formatSeconds(block.restSeconds)}`}
                      </p>
                      {block.comments ? <p className="mt-1 text-xs text-texto-2">{block.comments}</p> : null}
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        aria-label={`Subir el bloque ${index + 1}`}
                        disabled={index === 0}
                        onClick={() => moveBlock(index, index - 1)}
                        className="r360-btn r360-btn-ghost r360-btn-sm min-h-0 py-1"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-label={`Bajar el bloque ${index + 1}`}
                        disabled={index === blocks.length - 1}
                        onClick={() => moveBlock(index, index + 1)}
                        className="r360-btn r360-btn-ghost r360-btn-sm min-h-0 py-1"
                      >
                        ↓
                      </button>
                      <button type="button" onClick={() => editBlock(block)} className="r360-btn r360-btn-ghost r360-btn-sm min-h-0 py-1">
                        Editar
                      </button>
                      <button type="button" onClick={() => removeBlock(block.key)} className="r360-btn r360-btn-danger r360-btn-sm min-h-0 py-1">
                        Quitar
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        <button type="submit" disabled={saving || loadingCatalogs} className="r360-btn r360-btn-primary">
          {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear funcional"}
        </button>
      </form>
      {message ? (
        <Alert tone="exito" className="mt-4">
          {message}
        </Alert>
      ) : null}
      {error ? <Alert className="mt-4">{error}</Alert> : null}
    </section>
  );
}
