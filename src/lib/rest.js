// Descanso entre series.
//
// El backend guarda el descanso en segundos (restSeconds) y, por compatibilidad
// con las versiones viejas de la app, tambien en minutos redondeados (rest).
// Toda lectura del descanso pasa por restSecondsOf(), que entiende los dos.

export const MAX_REST_MINUTES = 10;
export const REST_SECONDS_STEP = 5;
const MAX_REST_SECONDS = 3600;

function isDefined(value) {
  return value !== null && value !== undefined && value !== "";
}

/** Segundos de descanso de un ejercicio de rutina que viene del backend. */
export function restSecondsOf(item) {
  if (isDefined(item?.restSeconds) && Number.isFinite(Number(item.restSeconds))) {
    return Math.max(0, Number(item.restSeconds));
  }
  if (isDefined(item?.rest) && Number.isFinite(Number(item.rest))) {
    return Math.max(0, Number(item.rest) * 60);
  }
  return null;
}

export function splitRest(totalSeconds) {
  const total = Math.max(0, Math.round(Number(totalSeconds) || 0));
  return { minutes: Math.floor(total / 60), seconds: total % 60 };
}

/** "1 min", "45 s", "1:30 min". */
export function formatRest(totalSeconds) {
  if (!isDefined(totalSeconds)) return "-";
  const { minutes, seconds } = splitRest(totalSeconds);
  if (minutes === 0 && seconds === 0) return "Sin descanso";
  if (seconds === 0) return `${minutes} min`;
  if (minutes === 0) return `${seconds} s`;
  return `${minutes}:${String(seconds).padStart(2, "0")} min`;
}

/**
 * Normaliza el descanso que llega de un formulario para mandarlo al backend.
 * Acepta restSeconds (nuevo) o rest en minutos (viejo). Devuelve null si no
 * hay un valor valido.
 */
export function normalizeRestFields(item) {
  if (isDefined(item?.restSeconds)) {
    const seconds = Math.round(Number(item.restSeconds));
    if (!Number.isFinite(seconds) || seconds < 0 || seconds > MAX_REST_SECONDS) return null;
    return { restSeconds: seconds, rest: Math.round(seconds / 60) };
  }

  if (isDefined(item?.rest)) {
    const minutes = Number(item.rest);
    if (!Number.isFinite(minutes) || minutes < 0 || minutes * 60 > MAX_REST_SECONDS) return null;
    return { rest: minutes, restSeconds: Math.round(minutes * 60) };
  }

  return null;
}
