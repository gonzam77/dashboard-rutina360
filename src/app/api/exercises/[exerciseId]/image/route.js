import { apiUrl } from "@/lib/api-url";
import { PATHS } from "@/lib/backend";
import { parsePositiveInt } from "@/lib/api-guard";

// Proxy de las ilustraciones de ejercicios: el navegador no conoce la URL del
// backend (API_BASE_URL es solo del servidor), asi que la imagen pasa por aca.
export async function GET(request, { params }) {
  const { exerciseId } = await params;
  const id = parsePositiveInt(exerciseId);

  if (!id) {
    return new Response("Id invalido", { status: 400 });
  }

  const ifNoneMatch = request.headers.get("if-none-match");
  const upstream = await fetch(apiUrl(`${PATHS.exercises}/${id}/image`), {
    cache: "no-store",
    headers: ifNoneMatch ? { "If-None-Match": ifNoneMatch } : {},
  });

  if (upstream.status === 304) {
    return new Response(null, { status: 304, headers: { ETag: upstream.headers.get("etag") || "" } });
  }

  if (!upstream.ok) {
    return new Response("Sin imagen", { status: upstream.status === 404 ? 404 : 502 });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") || "image/png",
      "Cache-Control": upstream.headers.get("cache-control") || "public, max-age=604800",
      ETag: upstream.headers.get("etag") || "",
    },
  });
}
