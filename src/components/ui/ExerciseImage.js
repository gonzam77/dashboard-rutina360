"use client";

import { useState } from "react";

/**
 * Ilustracion de un ejercicio (posicion inicial y final), servida por el
 * backend a traves de /api/exercises/:id/image. Si no carga, no ocupa lugar.
 */
// className define el ancho (por defecto ocupa todo el ancho disponible); no se
// mezcla con un w-full fijo porque en Tailwind gana el que este ultimo en el CSS,
// no el ultimo en el atributo, y la miniatura del catalogo se estiraba.
export default function ExerciseImage({ exerciseId, name, className = "w-full" }) {
  const [failed, setFailed] = useState(false);

  if (!exerciseId || failed) {
    return null;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- imagen chica servida por nuestra API, no hace falta next/image
    <img
      src={`/api/exercises/${exerciseId}/image`}
      alt={name ? `Ilustracion de ${name}` : "Ilustracion del ejercicio"}
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`aspect-[2/1] rounded-lg border border-linea bg-[#111A2C] object-contain ${className}`}
    />
  );
}
