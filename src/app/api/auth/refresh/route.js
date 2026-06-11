import { NextResponse } from "next/server";
import { clearAuthCookies, refreshWithCookie } from "@/lib/auth-service";

function safeNextPath(request) {
  const url = new URL(request.url);
  const nextPath = url.searchParams.get("next");

  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return "/inicio";
  }

  try {
    const parsed = new URL(nextPath, url.origin);
    return parsed.origin === url.origin ? `${parsed.pathname}${parsed.search}${parsed.hash}` : "/inicio";
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
      return NextResponse.json({ message: result.message || "No autorizado." }, { status: result.status || 401 });
    }

    return NextResponse.json({ ok: true, accessToken: result.accessToken });
  } catch {
    await clearAuthCookies();
    return NextResponse.json({ message: "No se pudo refrescar la sesion." }, { status: 401 });
  }
}

