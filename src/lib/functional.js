// Entrenamientos funcionales (por tiempo).
//
// Un funcional es una rutina con kind "functional": se repite `rounds` vueltas
// con `roundRestSeconds` de descanso entre vueltas, y cada ejercicio (bloque)
// tiene `workSeconds` de trabajo y `restSeconds` de descanso, que puede ser 0.
// Las mismas reglas que valida el servidor (rutina360_server/lib/funcional.js).

import { getRoutineExercises } from "@/lib/routines";

export const KIND_STRENGTH = "strength";
export const KIND_FUNCTIONAL = "functional";

export const LIMITS = {
  rounds: [1, 20],
  roundRestSeconds: [0, 600],
  workSeconds: [5, 1800],
  restSeconds: [0, 600],
};

export const MODES = [
  { value: "auto", label: "Automático", hint: "Encadena trabajo y descanso solo." },
  { value: "manual", label: "Manual", hint: "Cada bloque espera a que el atleta toque Iniciar." },
];

export const isFunctional = (record) => record?.kind === KIND_FUNCTIONAL;

export const kindLabel = (record) => (isFunctional(record) ? "Funcional" : "Fuerza");

export const modeLabel = (mode) => MODES.find((m) => m.value === mode)?.label || "Automático";

function isDefined(value) {
  return value !== null && value !== undefined && value !== "";
}

function inRange(name, value) {
  const [min, max] = LIMITS[name];
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : null;
}

/**
 * Segundos totales de un funcional: trabajos + descansos + descansos entre
 * vueltas, sin el descanso del ultimo bloque de cada vuelta (lo reemplaza el
 * descanso entre vueltas) y sin nada despues de la ultima vuelta.
 */
export function functionalDurationSeconds({ rounds = 1, roundRestSeconds = 0, blocks = [] }) {
  const totalRounds = Math.max(1, Number(rounds) || 1);
  if (!blocks.length) return 0;

  let total = 0;
  for (let round = 0; round < totalRounds; round += 1) {
    blocks.forEach((block, index) => {
      total += Number(block.workSeconds) || 0;
      if (index < blocks.length - 1) total += Number(block.restSeconds) || 0;
      else if (round < totalRounds - 1) total += Number(roundRestSeconds) || 0;
    });
  }
  return total;
}

/** Duracion de una rutina funcional tal como llega del backend. */
export function routineDurationSeconds(routine) {
  return functionalDurationSeconds({
    rounds: routine?.rounds,
    roundRestSeconds: routine?.roundRestSeconds,
    blocks: getRoutineExercises(routine),
  });
}

/** "12:30" o "1:05:00". */
export function formatDuration(totalSeconds) {
  const total = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/** "45 s", "1 min", "1:30 min", "Sin descanso". */
export function formatSeconds(totalSeconds, zeroLabel = "Sin descanso") {
  const total = Math.max(0, Math.round(Number(totalSeconds) || 0));
  if (total === 0) return zeroLabel;
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  if (minutes === 0) return `${seconds} s`;
  if (seconds === 0) return `${minutes} min`;
  return `${minutes}:${String(seconds).padStart(2, "0")} min`;
}

/**
 * Valida y arma el payload de un funcional para el backend. Lo usan los
 * proxies de alta y edicion. Devuelve { payload } o { error }.
 */
export function normalizeFunctionalRoutine(body, { requireIdUser = false } = {}) {
  const name = String(body?.name || "").trim();
  const idUser = Number(body?.idUser);
  const order = Number(body?.order);

  if (!name) return { error: "El funcional necesita un nombre." };
  if (!Number.isInteger(order) || order <= 0) return { error: "El orden es invalido." };
  if (requireIdUser && !(Number.isInteger(idUser) && idUser > 0)) return { error: "Falta el creador." };

  const rounds = isDefined(body?.rounds) ? inRange("rounds", body.rounds) : 1;
  if (rounds === null) return { error: "Las vueltas tienen que ir de 1 a 20." };

  const roundRestSeconds = isDefined(body?.roundRestSeconds) ? inRange("roundRestSeconds", body.roundRestSeconds) : 0;
  if (roundRestSeconds === null) return { error: "El descanso entre vueltas tiene que ir de 0 a 10 minutos." };

  const defaultMode = MODES.some((m) => m.value === body?.defaultMode) ? body.defaultMode : "auto";

  const blocks = [];
  for (const [index, item] of (Array.isArray(body?.exercises) ? body.exercises : []).entries()) {
    const idEjercice = Number(item?.idEjercice);
    const workSeconds = inRange("workSeconds", item?.workSeconds);
    const restSeconds = isDefined(item?.restSeconds) ? inRange("restSeconds", item.restSeconds) : 0;

    if (!Number.isInteger(idEjercice) || idEjercice <= 0) return { error: `El bloque ${index + 1} no tiene ejercicio.` };
    if (workSeconds === null) return { error: `El bloque ${index + 1} necesita entre 5 segundos y 30 minutos de trabajo.` };
    if (restSeconds === null) return { error: `El descanso del bloque ${index + 1} tiene que ir de 0 a 10 minutos.` };

    blocks.push({
      idEjercice,
      workSeconds,
      restSeconds,
      series: 1,
      position: index + 1,
      comments: String(item?.comments || "").trim(),
    });
  }

  if (blocks.length === 0) return { error: "Agregale al menos un bloque." };

  // El backend guarda el tiempo en minutos: sale de los bloques, para arriba.
  const time = Math.max(1, Math.ceil(functionalDurationSeconds({ rounds, roundRestSeconds, blocks }) / 60));

  return {
    payload: {
      name,
      ...(Number.isInteger(idUser) && idUser > 0 ? { idUser } : {}),
      order,
      time,
      kind: KIND_FUNCTIONAL,
      rounds,
      roundRestSeconds,
      defaultMode,
      exercises: blocks,
    },
  };
}

/**
 * Texto corto de duracion para las listas: los funcionales muestran el tiempo
 * calculado de sus bloques ("12:30"); las de fuerza, sus minutos como siempre.
 */
export function routineTimeLabel(routine) {
  if (!isFunctional(routine)) return `${routine?.time || "-"} min`;
  const seconds = routineDurationSeconds(routine);
  return seconds > 0 ? formatDuration(seconds) : `${routine?.time || "-"} min`;
}

/** "1 vuelta" / "4 vueltas". */
export function roundsLabel(routine) {
  const rounds = Math.max(1, Number(routine?.rounds) || 1);
  return `${rounds} vuelta${rounds === 1 ? "" : "s"}`;
}

/** "3 ejercicios" o, en un funcional, "3 bloques". */
export function itemsLabel(routine, count) {
  const word = isFunctional(routine) ? "bloque" : "ejercicio";
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}
