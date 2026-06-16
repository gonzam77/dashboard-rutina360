const BLOCKED_API_HOSTS = new Set(["rutina360-server.onrender.com"]);

export function getApiBaseUrl() {
  const configuredUrl = process.env.API_BASE_URL;

  if (!configuredUrl) {
    throw new Error("API_BASE_URL no esta configurada.");
  }

  const normalizedUrl = configuredUrl.replace(/\/+$/, "");
  const { hostname } = new URL(normalizedUrl);

  if (BLOCKED_API_HOSTS.has(hostname)) {
    throw new Error(
      `API_BASE_URL apunta a ${hostname}. Configurala con http://2.25.189.180:5000 y reinicia la app.`
    );
  }

  return normalizedUrl;
}

export function apiUrl(path = "") {
  const normalizedPath = path ? `/${String(path).replace(/^\/+/, "")}` : "";
  return `${getApiBaseUrl()}${normalizedPath}`;
}
