"use client";

import { MAX_REST_MINUTES, REST_SECONDS_STEP, splitRest } from "@/lib/rest";

const MINUTE_OPTIONS = Array.from({ length: MAX_REST_MINUTES + 1 }, (_, i) => i);
const SECOND_OPTIONS = Array.from({ length: 60 / REST_SECONDS_STEP }, (_, i) => i * REST_SECONDS_STEP);

/**
 * Descanso entre series: minutos y segundos por separado.
 * value / onChange trabajan en segundos totales ("" = sin elegir).
 */
export default function RestInput({ value, onChange, className = "", selectClassName = "r360-input" }) {
  const chosen = value !== "" && value !== null && value !== undefined;
  const { minutes, seconds } = splitRest(chosen ? value : 0);

  function update(part, raw) {
    const next = Number(raw);
    const total = part === "minutes" ? next * 60 + seconds : minutes * 60 + next;
    onChange(total);
  }

  return (
    <fieldset className={`grid grid-cols-2 gap-2 ${className}`}>
      <legend className="sr-only">Descanso entre series</legend>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-texto-3">Descanso (min)</span>
        <select
          value={chosen ? String(minutes) : ""}
          onChange={(event) => update("minutes", event.target.value)}
          className={selectClassName}
        >
          <option value="" disabled className="bg-superficie-alta text-texto">Min</option>
          {MINUTE_OPTIONS.map((option) => (
            <option key={option} value={option} className="bg-superficie-alta text-texto">
              {option} min
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-texto-3">Descanso (seg)</span>
        <select
          value={chosen ? String(seconds) : ""}
          onChange={(event) => update("seconds", event.target.value)}
          className={selectClassName}
        >
          <option value="" disabled className="bg-superficie-alta text-texto">Seg</option>
          {SECOND_OPTIONS.map((option) => (
            <option key={option} value={option} className="bg-superficie-alta text-texto">
              {String(option).padStart(2, "0")} s
            </option>
          ))}
        </select>
      </label>
    </fieldset>
  );
}
