"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const AuthContext = createContext(null);
const PUBLIC_PATHS = new Set(["/login", "/sin-acceso"]);

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const isRefreshingRef = useRef(false);
  const waitersRef = useRef([]);
  const originalFetchRef = useRef(null);
  const [authInitializing, setAuthInitializing] = useState(true);
  const [accessToken, setAccessToken] = useState("");
  const [user, setUser] = useState(null);

  const flushWaiters = (ok) => {
    const queue = waitersRef.current;
    waitersRef.current = [];
    queue.forEach((resolve) => resolve(ok));
  };

  const logoutClient = async () => {
    setAccessToken("");
    setUser(null);
    router.push("/login");
    router.refresh();
  };

  const refreshAccessToken = async () => {
    if (isRefreshingRef.current) {
      return new Promise((resolve) => {
        waitersRef.current.push(resolve);
      });
    }

    isRefreshingRef.current = true;
    try {
      const response = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
      const json = await response.json().catch(() => ({}));

      if (!response.ok || !json?.accessToken) {
        flushWaiters(false);
        await logoutClient();
        return false;
      }

      setAccessToken(json.accessToken);
      flushWaiters(true);
      return true;
    } catch {
      flushWaiters(false);
      await logoutClient();
      return false;
    } finally {
      isRefreshingRef.current = false;
    }
  };

  useEffect(() => {
    let mounted = true;
    const boot = async () => {
      try {
        const response = await fetch("/api/auth/session", { cache: "no-store", credentials: "include" });
        const json = await response.json().catch(() => ({}));
        if (mounted && response.ok && json?.authenticated) {
          setAccessToken(json.accessToken || "");
          setUser(json.user || null);
        }
      } finally {
        if (mounted) {
          setAuthInitializing(false);
        }
      }
    };
    boot();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (originalFetchRef.current || typeof window === "undefined") {
      return;
    }

    const nativeFetch = window.fetch.bind(window);
    originalFetchRef.current = nativeFetch;

    window.fetch = async (input, init = {}) => {
      const url = typeof input === "string" ? input : input?.url || "";
      const isApiRequest = url.startsWith("/api/");
      const isAuthRoute = url.startsWith("/api/auth/");
      const response = await nativeFetch(input, init);

      if (!isApiRequest || isAuthRoute || response.status !== 401 || init?._retryAuth) {
        return response;
      }

      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        return response;
      }

      const retryInit = { ...init, _retryAuth: true, credentials: init?.credentials || "include" };
      return nativeFetch(input, retryInit);
    };

    return () => {
      if (originalFetchRef.current) {
        window.fetch = originalFetchRef.current;
        originalFetchRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!authInitializing && !accessToken && !PUBLIC_PATHS.has(pathname || "")) {
      router.push("/login");
    }
  }, [accessToken, authInitializing, pathname, router]);

  const value = useMemo(
    () => ({
      authInitializing,
      accessToken,
      user,
      refreshAccessToken,
    }),
    [authInitializing, accessToken, user]
  );

  if (authInitializing && !PUBLIC_PATHS.has(pathname || "")) {
    return null;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

