export function firstNonEmptyString(values) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

/**
 * Datos de presentacion de la sesion (nombre, rol para el menu).
 * NO usar para decidir permisos: el navegador puede alterar esta cookie.
 * Para eso esta getViewer() en @/lib/viewer.
 */
export function parseSessionUserCookie(rawValue) {
  if (!rawValue) {
    return null;
  }

  try {
    let decoded = rawValue;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const nextDecoded = decodeURIComponent(decoded);
      if (nextDecoded === decoded) {
        break;
      }
      decoded = nextDecoded;
    }

    return JSON.parse(decoded);
  } catch {
    return null;
  }
}
