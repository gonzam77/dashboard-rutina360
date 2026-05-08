"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function extractCreatedUserId(payload) {
  const candidates = [payload?.id, payload?.user?.id, payload?.data?.id, payload?.data?.user?.id];

  for (const value of candidates) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

export default function CoachAthleteAssignment({ coachId, athletes, athleteRoleId }) {
  const router = useRouter();
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedAthleteId, setSelectedAthleteId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [goal, setGoal] = useState("");
  const [weeklyAvailability, setWeeklyAvailability] = useState("");

  function resetCreateForm() {
    setUsername("");
    setEmail("");
    setPassword("");
    setBirthDate("");
    setGender("");
    setHeight("");
    setWeight("");
    setGoal("");
    setWeeklyAvailability("");
  }

  async function assignAthleteToCoach(athleteId) {
    const response = await fetch("/api/users/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idCoach: Number(coachId),
        idAthlete: Number(athleteId),
      }),
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(json?.message || "No se pudo asignar el atleta.");
    }
  }

  async function handleAssign(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      await assignAthleteToCoach(selectedAthleteId);
      setMessage("Atleta asignado correctamente.");
      setSelectedAthleteId("");
      setIsAssignModalOpen(false);
      router.refresh();
    } catch (assignError) {
      setError(assignError.message || "Error de conexion al asignar atleta.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateAndAssignAthlete(event) {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    try {
      if (!athleteRoleId) {
        setError("No se encontro el rol de atleta para crear el usuario.");
        return;
      }

      if (!height || !weight || !weeklyAvailability) {
        setError("Para crear un atleta debes completar altura, peso y disponibilidad semanal.");
        return;
      }

      const createResponse = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email,
          password,
          birthDate,
          gender,
          idRole: Number(athleteRoleId),
          height: Number(height),
          weight: Number(weight),
          goal: goal.trim(),
          weeklyAvailability,
        }),
      });

      const createJson = await createResponse.json().catch(() => ({}));

      if (!createResponse.ok) {
        setError(createJson?.message || "No se pudo crear el atleta.");
        return;
      }

      const createdAthleteId = extractCreatedUserId(createJson?.data);

      if (createdAthleteId) {
        await assignAthleteToCoach(createdAthleteId);
        setMessage("Atleta creado y asignado correctamente.");
      } else {
        setMessage("Atleta creado correctamente. Si no aparece aun, recarga e intenta asignarlo.");
      }

      resetCreateForm();
      setSelectedAthleteId("");
      setIsCreateModalOpen(false);
      router.refresh();
    } catch {
      setError("Error de conexion al crear o asignar atleta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-white/75">Administra los atletas vinculados a este coach.</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setError("");
              setMessage("");
              setIsAssignModalOpen(true);
            }}
            className="rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/20"
          >
            Asignar atleta
          </button>
          <button
            type="button"
            onClick={() => {
              setError("");
              setMessage("");
              setIsCreateModalOpen(true);
            }}
            className="rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/20"
          >
            Crear atleta
          </button>
        </div>
      </div>

      {message ? <p className="mt-3 text-sm text-cyan-100">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-200">{error}</p> : null}

      {isAssignModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#071a2f]/70 p-4"
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-white/15 bg-[#0f2a46] p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-white">Asignar atleta existente</h3>
              <button
                type="button"
                onClick={() => setIsAssignModalOpen(false)}
                className="rounded-lg border border-white/20 px-3 py-1.5 text-sm font-medium text-white/85 hover:bg-white/10"
              >
                Cerrar
              </button>
            </div>

            {athletes.length === 0 ? (
              <p className="text-sm text-white/75">No hay atletas disponibles para asignar.</p>
            ) : (
              <form className="space-y-3" onSubmit={handleAssign}>
                <label className="block text-sm text-white/85">
                  Atleta
                  <select
                    required
                    value={selectedAthleteId}
                    onChange={(event) => setSelectedAthleteId(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/20 bg-[#17385a] px-3 py-2 text-white"
                  >
                    <option value="" disabled>Seleccionar atleta</option>
                    {athletes.map((athlete) => (
                      <option key={athlete.id} value={athlete.id}>
                        {athlete.username || `Atleta #${athlete.id}`} (ID {athlete.id})
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/20 disabled:opacity-60"
                >
                  {loading ? "Asignando..." : "Confirmar asignacion"}
                </button>
              </form>
            )}
          </div>
        </div>
      ) : null}

      {isCreateModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#071a2f]/70 p-4"
        >
          <div
            className="w-full max-w-xl rounded-2xl border border-white/15 bg-[#0f2a46] p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-2">
              <h3 className="text-lg font-semibold text-white">Crear atleta y asignar</h3>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-lg border border-white/20 px-3 py-1.5 text-sm font-medium text-white/85 hover:bg-white/10"
              >
                Cerrar
              </button>
            </div>

            <form className="grid gap-3" onSubmit={handleCreateAndAssignAthlete}>
              <input required type="text" placeholder="Username" value={username} onChange={(event) => setUsername(event.target.value)} className="rounded-lg border border-white/20 bg-[#17385a] px-3 py-2 text-white placeholder:text-white/55" />
              <input required type="email" placeholder="Email" value={email} onChange={(event) => setEmail(event.target.value)} className="rounded-lg border border-white/20 bg-[#17385a] px-3 py-2 text-white placeholder:text-white/55" />
              <input required type="date" value={birthDate} onChange={(event) => setBirthDate(event.target.value)} className="rounded-lg border border-white/20 bg-[#17385a] px-3 py-2 text-white" />
              <select required value={gender} onChange={(event) => setGender(event.target.value)} className="rounded-lg border border-white/20 bg-[#17385a] px-3 py-2 text-white">
                <option value="" disabled>Seleccionar genero</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
              </select>
              <input required type="password" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} className="rounded-lg border border-white/20 bg-[#17385a] px-3 py-2 text-white placeholder:text-white/55" />
              <input required type="number" min="1" placeholder="Altura (cm)" value={height} onChange={(event) => setHeight(event.target.value)} className="rounded-lg border border-white/20 bg-[#17385a] px-3 py-2 text-white placeholder:text-white/55" />
              <input required type="number" min="1" placeholder="Peso (kg)" value={weight} onChange={(event) => setWeight(event.target.value)} className="rounded-lg border border-white/20 bg-[#17385a] px-3 py-2 text-white placeholder:text-white/55" />
              <input type="text" placeholder="Objetivo (opcional)" value={goal} onChange={(event) => setGoal(event.target.value)} className="rounded-lg border border-white/20 bg-[#17385a] px-3 py-2 text-white placeholder:text-white/55" />
              <select required value={weeklyAvailability} onChange={(event) => setWeeklyAvailability(event.target.value)} className="rounded-lg border border-white/20 bg-[#17385a] px-3 py-2 text-white">
                <option value="" disabled>Seleccionar disponibilidad semanal</option>
                <option value="1 dia a la semana">1 dia a la semana</option>
                <option value="2 dias a la semana">2 dias a la semana</option>
                <option value="3 dias a la semana">3 dias a la semana</option>
                <option value="4 dias a la semana">4 dias a la semana</option>
                <option value="5 dias a la semana">5 dias a la semana</option>
                <option value="6 dias a la semana">6 dias a la semana</option>
                <option value="7 dias a la semana">7 dias a la semana</option>
              </select>

              <button
                type="submit"
                disabled={loading}
                className="rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/20 disabled:opacity-60"
              >
                {loading ? "Creando..." : "Crear y asignar atleta"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
