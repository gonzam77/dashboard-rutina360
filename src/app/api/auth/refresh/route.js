import { NextResponse } from "next/server";
import { clearAuthCookies, refreshWithCookie } from "@/lib/auth-service";

const RETRY_PARAM = "_authRetry";

function safeNextPath(request) {
  const url = new URL(request.url);
  const nextPath = url.searchParams.get("next");

  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/inicio";
  }

  try {
    const parsed = new URL(nextPath, url.origin);

    if (parsed.origin !== url.origin) {
      return "/inicio";
    }

    // El marcador le dice al proxy que este destino ya viene de un refresh.
    parsed.searchParams.set(RETRY_PARAM, "1");
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/inicio";
  }
}

function redirectTo(request, pathname) {
  return NextResponse.redirect(new URL(pathname, request.url), 303);
}

export async function GET(request) {
  const nextPath = safeNextPath(request);

  try {
    const result = await refreshWithCookie();

    if (!result.ok) {
      await clearAuthCookies();
      return redirectTo(request, "/login");
    }

    return redirectTo(request, nextPath);
  } catch {
    await clearAuthCookies();
    return redirectTo(request, "/login");
  }
}

export async function POST() {
  try {
    const result = await refreshWithCookie();

    if (!result.ok) {
      await clearAuthCookies();
      return NextResponse.json(
        { message: result.message || "No autorizado." },
        { status: result.status || 401 }
      );
    }

    // El token vive solo en la cookie httpOnly: no se expone al cliente.
    return NextResponse.json({ ok: true });
  } catch {
    await clearAuthCookies();
    return NextResponse.json({ message: "No se pudo refrescar la sesion." }, { status: 401 });
  }
}
