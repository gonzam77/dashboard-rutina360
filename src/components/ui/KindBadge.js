import { isFunctional, kindLabel } from "@/lib/functional";

/**
 * Chip "Fuerza" / "Funcional". Fuerza y funcional conviven en las mismas
 * listas, y sin esto una rutina de 40 minutos y un funcional de 40 minutos
 * se ven iguales.
 */
export default function KindBadge({ routine, className = "" }) {
  const tone = isFunctional(routine) ? "r360-badge-aviso" : "r360-badge-acento";
  return <span className={`r360-badge ${tone} ${className}`.trim()}>{kindLabel(routine)}</span>;
}
