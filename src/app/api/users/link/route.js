import { NextResponse } from "next/server";
import { apiRequest, findUserById, PATHS } from "@/lib/backend";
import { jsonError, parsePositiveInt, readJsonBody, requireViewer } from "@/lib/api-guard";
import { canLinkAthleteToCoach } from "@/lib/viewer";

async function resolveLink(request) {
  const { viewer, gymOwnerId, error } = await requireViewer();
  if (error) {
    return { error };
  }

  const body = await readJsonBody(request);
  const idAthlete = parsePositiveInt(body?.idAthlete);
  const idCoach = parsePositiveInt(body?.idCoach);

  if (!idAthlete || !idCoach) {
    return { error: jsonError("idAthlete e idCoach son obligatorios.", 400) };
  }

  const [athlete, coach] = await Promise.all([
    findUserById(viewer.token, idAthlete),
    findUserById(viewer.token, idCoach),
  ]);

  if (!athlete || !coach) {
    return { error: jsonError("No se encontro el atleta o el coach indicado.", 404) };
  }

  if (!canLinkAthleteToCoach({ viewer, viewerGymOwnerId: gymOwnerId, athlete, coach })) {
    return { error: jsonError("No tenes permisos para modificar este vinculo.", 403) };
  }

  return { viewer, idAthlete, idCoach };
}

async function sendLink(method, request, fallbackMessage) {
  try {
    const { viewer, idAthlete, idCoach, error } = await resolveLink(request);
    if (error) {
      return error;
    }

    const { ok, status, json } = await apiRequest(PATHS.userLinks, {
      token: viewer.token,
      method,
      body: { idAthlete, idCoach },
    });

    if (!ok) {
      return NextResponse.json({ message: json?.message || fallbackMessage }, { status });
    }

    return NextResponse.json({ ok: true, data: json?.data || null });
  } catch {
    return jsonError(fallbackMessage, 500);
  }
}

export async function POST(request) {
  return sendLink("POST", request, "No se pudo crear el vinculo del atleta.");
}

export async function DELETE(request) {
  return sendLink("DELETE", request, "No se pudo eliminar el vinculo del atleta.");
}
