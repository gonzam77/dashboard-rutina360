"use client";

import { MAX_REST_MINUTES, REST_SECONDS_STEP, splitRest } from "@/lib/rest";

const SECOND_OPTIONS = Array.from({ length: 60 / REST_SECONDS_STEP }, (_, i) => i * REST_SECONDS_STEP);

/**
 * Descanso entre series: minutos y segundos por separado.
 * value / onChange trabajan en segundos totales ("" = sin elegir).
 *
 * Los funcionales lo reusan para el trabajo y los descansos: `label` cambia el
 * texto ("Trabajo", "Descanso entre vueltas") y `maxMinutes` el tope.
 */
export default function RestInput({
  value,
  onChange,
  className = "",
  selectClassName = "r360-input",
  label = "Descanso",
  legend = "Descanso entre series",
  maxMinutes = MAX_REST_MINUTES,
}) {
  const minuteOptions = Array.from({ length: maxMinutes + 1 }, (_, i) => i);
  const chosen = value !== "" && value !== null && value !== undefined;
  const { minutes, seconds } = splitRest(chosen ? value : 0);

  function update(part, raw) {
    const next = Number(raw);
    const total = part === "minutes" ? next * 60 + seconds : minutes * 60 + next;
    onChange(total);
  }

  return (
    <fieldset className={`grid grid-cols-2 gap-2 ${className}`}>
      <legend className="sr-only">{legend}</legend>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-texto-3">{label} (min)</span>
        <select
          value={chosen ? String(minutes) : ""}
          onChange={(event) => update("minutes", event.target.value)}
          className={selectClassName}
        >
          <option value="" disabled className="bg-superficie-alta text-texto">Min</option>
          {minuteOptions.map((option) => (
            <option key={option} value={option} className="bg-superficie-alta text-texto">
              {option} min
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-texto-3">{label} (seg)</span>
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
