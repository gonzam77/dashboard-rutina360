export function getApiBaseUrl() {
  const configuredUrl = process.env.API_BASE_URL;

  if (!configuredUrl) {
    throw new Error(
      "API_BASE_URL no esta configurada. Defini la URL del backend en .env (desarrollo) o en ecosystem.config.js (produccion)."
    );
  }

  const normalizedUrl = String(configuredUrl).trim().replace(/\/+$/, "");

  try {
    // Valida la forma de la URL lo antes posible para fallar con un mensaje claro.
    new URL(normalizedUrl);
  } catch {
    throw new Error(`API_BASE_URL no es una URL valida: ${configuredUrl}`);
  }

  return normalizedUrl;
}

export function apiUrl(path = "") {
  const normalizedPath = path ? `/${String(path).replace(/^\/+/, "")}` : "";
  return `${getApiBaseUrl()}${normalizedPath}`;
}
