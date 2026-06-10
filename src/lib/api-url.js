export function getApiBaseUrl() {
  const configuredUrl = process.env.API_BASE_URL;

  if (!configuredUrl) {
    throw new Error("API_BASE_URL no esta configurada.");
  }

  return configuredUrl.replace(/\/+$/, "");
}

export function apiUrl(path = "") {
  const normalizedPath = path ? `/${String(path).replace(/^\/+/, "")}` : "";
  return `${getApiBaseUrl()}${normalizedPath}`;
}
