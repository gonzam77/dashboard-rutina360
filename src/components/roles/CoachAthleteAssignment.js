"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/components/ui/Modal";

const WEEKLY_AVAILABILITY_OPTIONS = [1, 2, 3, 4, 5, 6, 7].map(
  (days) => `${days} dia${days === 1 ? "" : "s"} a la semana`
);

const EMPTY_ATHLETE = {
  dni: "",
  username: "",
  email: "",
  password: "",
  birthDate: "",
  gender: "",
  height: "",
  weight: "",
  goal: "",
  weeklyAvailability: "",
};

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
  const [athleteSearch, setAthleteSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState(EMPTY_ATHLETE);

  const filteredAthletes = useMemo(() => {
    const normalizedSearch = athleteSearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return athletes;
    }

    return athletes.filter((athlete) =>
      [athlete?.username, athlete?.email, athlete?.id]
        .map((value) => String(value || "").toLowerCase())
        .join(" ")
        .includes(normalizedSearch)
    );
  }, [athleteSearch, athletes]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function assignAthleteToCoach(athleteId) {
    const response = await fetch("/api/users/link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idCoach: Number(coachId), idAthlete: Number(athleteId) }),
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
      setAthleteSearch("");
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
    setMessage("");
    setError("");

    if (!athleteRoleId) {
      setError("No se encontro el rol de atleta para crear el usuario.");
      return;
    }

    if (!form.height || !form.weight || !form.weeklyAvailability) {
      setError("Para crear un atleta debes completar altura, peso y disponibilidad semanal.");
      return;
    }

    setLoading(true);

    try {
      const createResponse = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dni: form.dni,
          username: form.username,
          email: form.email,
          password: form.password,
          birthDate: form.birthDate,
          gender: form.gender,
          idRole: Number(athleteRoleId),
          height: Number(form.height),
          weight: Number(form.weight),
          goal: form.goal.trim(),
          weeklyAvailability: form.weeklyAvailability,
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
        setMessage(
          "Atleta creado correctamente. Si no aparece aun, recarga e intenta asignarlo."
        );
      }

      setForm(EMPTY_ATHLETE);
      setSelectedAthleteId("");
      setIsCreateModalOpen(false);
      router.refresh();
    } catch (createError) {
      setError(createError.message || "Error de conexion al crear o asignar atleta.");
    } finally {
      setLoading(false);
    }
  }

  const inputClassName =
    "rounded-lg border border-white/20 bg-[#17385a] px-3 py-2 text-white placeholder:text-white/55";

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
              setAthleteSearch("");
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
      {error && !isAssignModalOpen && !isCreateModalOpen ? (
        <p className="mt-3 text-sm text-rose-200">{error}</p>
      ) : null}

      <Modal
        open={isAssignModalOpen}
        onClose={() => {
          if (!loading) {
            setAthleteSearch("");
            setIsAssignModalOpen(false);
          }
        }}
        closeDisabled={loading}
        title="Asignar atleta existente"
        description="Solo se listan atletas del mismo gimnasio que el coach."
      >
        {athletes.length === 0 ? (
          <p className="text-sm text-white/75">No hay atletas disponibles para asignar.</p>
        ) : (
          <form className="space-y-3" onSubmit={handleAssign}>
            <label className="block text-sm text-white/85">
              Buscar atleta
              <input
                type="search"
                value={athleteSearch}
                onChange={(event) => setAthleteSearch(event.target.value)}
                placeholder="Buscar por nombre, email o ID"
                className={`mt-1 w-full ${inputClassName}`}
              />
            </label>

            <label className="block text-sm text-white/85">
              Atleta
              <select
                required
                value={selectedAthleteId}
                onChange={(event) => setSelectedAthleteId(event.target.value)}
                className={`mt-1 w-full ${inputClassName}`}
              >
                <option value="" disabled>
                  Seleccionar atleta
                </option>
                {filteredAthletes.map((athlete) => (
                  <option key={athlete.id} value={athlete.id}>
                    {athlete.username || `Atleta #${athlete.id}`} (ID {athlete.id})
                  </option>
                ))}
              </select>
            </label>

            {filteredAthletes.length === 0 ? (
              <p className="text-sm text-amber-100">No se encontraron atletas con esa busqueda.</p>
            ) : null}

            {error ? <p className="text-sm text-rose-200">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/20 disabled:opacity-60"
            >
              {loading ? "Asignando..." : "Confirmar asignacion"}
            </button>
          </form>
        )}
      </Modal>

      <Modal
        open={isCreateModalOpen}
        onClose={() => {
          if (!loading) {
            setIsCreateModalOpen(false);
          }
        }}
        closeDisabled={loading}
        title="Crear atleta y asignar"
        description="El atleta queda vinculado a este coach y a su gimnasio."
      >
        <form className="grid gap-3" onSubmit={handleCreateAndAssignAthlete}>
          <input
            required
            type="text"
            placeholder="DNI"
            value={form.dni}
            onChange={(event) => updateField("dni", event.target.value)}
            className={inputClassName}
          />
          <input
            required
            type="text"
            placeholder="Username"
            value={form.username}
            onChange={(event) => updateField("username", event.target.value)}
            className={inputClassName}
          />
          <input
            required
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            className={inputClassName}
          />
          <input
            required
            type="date"
            aria-label="Fecha de nacimiento"
            value={form.birthDate}
            onChange={(event) => updateField("birthDate", event.target.value)}
            className={inputClassName}
          />
          <select
            required
            aria-label="Genero"
            value={form.gender}
            onChange={(event) => updateField("gender", event.target.value)}
            className={inputClassName}
          >
            <option value="" disabled>
              Seleccionar genero
            </option>
            <option value="masculino">Masculino</option>
            <option value="femenino">Femenino</option>
          </select>
          <input
            required
            type="password"
            autoComplete="new-password"
            placeholder="Password"
            value={form.password}
            onChange={(event) => updateField("password", event.target.value)}
            className={inputClassName}
          />
          <input
            required
            type="number"
            min="1"
            placeholder="Altura (cm)"
            value={form.height}
            onChange={(event) => updateField("height", event.target.value)}
            className={inputClassName}
          />
          <input
            required
            type="number"
            min="1"
            placeholder="Peso (kg)"
            value={form.weight}
            onChange={(event) => updateField("weight", event.target.value)}
            className={inputClassName}
          />
          <input
            type="text"
            placeholder="Objetivo (opcional)"
            value={form.goal}
            onChange={(event) => updateField("goal", event.target.value)}
            className={inputClassName}
          />
          <select
            required
            aria-label="Disponibilidad semanal"
            value={form.weeklyAvailability}
            onChange={(event) => updateField("weeklyAvailability", event.target.value)}
            className={inputClassName}
          >
            <option value="" disabled>
              Seleccionar disponibilidad semanal
            </option>
            {WEEKLY_AVAILABILITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>

          {error ? <p className="text-sm text-rose-200">{error}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/20 disabled:opacity-60"
          >
            {loading ? "Creando..." : "Crear y asignar atleta"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
