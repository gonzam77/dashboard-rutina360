"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const AuthContext = createContext(null);
const PUBLIC_PATHS = new Set(["/login", "/sin-acceso"]);

export function useAuth() {
  return useContext(AuthContext);
}

function isSameOriginApiUrl(url) {
  if (!url) {
    return false;
  }

  if (url.startsWith("/api/")) {
    return true;
  }

  return typeof window !== "undefined" && url.startsWith(`${window.location.origin}/api/`);
}

function isAuthApiUrl(url) {
  return url.includes("/api/auth/");
}

function resolveRequestUrl(input) {
  if (typeof input === "string") {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  return input?.url || "";
}

export default function AuthProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const refreshPromiseRef = useRef(null);
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("checking");

  /** Un solo refresh en vuelo: las llamadas concurrentes esperan el mismo resultado. */
  const refreshSession = useCallback(async () => {
    if (!refreshPromiseRef.current) {
      refreshPromiseRef.current = fetch("/api/auth/refresh", {
        method: "POST",
        credentials: "include",
      })
        .then((response) => response.ok)
        .catch(() => false)
        .finally(() => {
          refreshPromiseRef.current = null;
        });
    }

    return refreshPromiseRef.current;
  }, []);

  const handleUnauthenticated = useCallback(() => {
    setUser(null);
    setStatus("anonymous");
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function boot() {
      try {
        const response = await fetch("/api/auth/session", {
          cache: "no-store",
          credentials: "include",
          signal: controller.signal,
        });
        const json = await response.json().catch(() => ({}));

        if (response.ok && json?.authenticated) {
          setUser(json.user || null);
          setStatus("authenticated");
          return;
        }

        setUser(null);
        setStatus("anonymous");
      } catch {
        if (!controller.signal.aborted) {
          setStatus("anonymous");
        }
      }
    }

    boot();

    return () => {
      controller.abort();
    };
  }, []);

  /**
   * Reintenta una vez las llamadas a /api que responden 401, refrescando la sesion.
   * Solo intercepta la API propia: el resto del trafico pasa sin tocar.
   */
  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const nativeFetch = window.fetch.bind(window);

    const patchedFetch = async (input, init) => {
      const options = init || {};
      const url = resolveRequestUrl(input);
      const shouldIntercept =
        isSameOriginApiUrl(url) && !isAuthApiUrl(url) && !options.__authRetry;

      if (!shouldIntercept) {
        return nativeFetch(input, init);
      }

      // El body de un Request se consume al enviarlo: hay que clonarlo antes.
      const retryInput =
        typeof input === "string" || input instanceof URL ? input : input.clone();

      const response = await nativeFetch(input, init);

      if (response.status !== 401) {
        return response;
      }

      const refreshed = await refreshSession();

      if (!refreshed) {
        handleUnauthenticated();
        return response;
      }

      return nativeFetch(retryInput, {
        ...options,
        __authRetry: true,
        credentials: options.credentials || "include",
      });
    };

    window.fetch = patchedFetch;

    return () => {
      if (window.fetch === patchedFetch) {
        window.fetch = nativeFetch;
      }
    };
  }, [handleUnauthenticated, refreshSession]);

  useEffect(() => {
    if (status === "anonymous" && !PUBLIC_PATHS.has(pathname || "")) {
      router.replace("/login");
    }
  }, [pathname, router, status]);

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthenticated: status === "authenticated",
      authInitializing: status === "checking",
      refreshSession,
    }),
    [refreshSession, status, user]
  );

  // El contenido lo renderiza el servidor: no se bloquea el arbol esperando
  // la verificacion del cliente, que solo sirve para reaccionar a un 401.
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
