"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

function normalizeRoleName(value) {
  return String(value || "").trim().toLowerCase();
}

function isAthleteRole(value) {
  return ["athlete", "atleta"].includes(normalizeRoleName(value));
}

function isCoachRole(value) {
  return normalizeRoleName(value) === "coach";
}

function isAdminOrGymRole(value) {
  return ["admin", "administrador", "gym", "gimnasio"].includes(normalizeRoleName(value));
}

export default function UserProfileEditor({ user, roleName }) {
  const router = useRouter();
  const normalizedRoleName = useMemo(() => normalizeRoleName(roleName), [roleName]);
  const athleteRole = isAthleteRole(normalizedRoleName);
  const coachRole = isCoachRole(normalizedRoleName);
  const requiresDni = athleteRole || coachRole;
  const showPersonalData = !isAdminOrGymRole(normalizedRoleName);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    dni: user?.dni || "",
    username: user?.username || "",
    email: user?.email || "",
    phone: user?.phone || "",
    address: user?.address || "",
    birthDate: user?.birthDate ? String(user.birthDate).slice(0, 10) : "",
    gender: user?.gender || "",
    password: "",
    height: user?.height != null ? String(user.height) : "",
    weight: user?.weight != null ? String(user.weight) : "",
    goal: user?.goal || "",
    weeklyAvailability: user?.weeklyAvailability || "",
  });

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm({
      dni: user?.dni || "",
      username: user?.username || "",
      email: user?.email || "",
      phone: user?.phone || "",
      address: user?.address || "",
      birthDate: user?.birthDate ? String(user.birthDate).slice(0, 10) : "",
      gender: user?.gender || "",
      password: "",
      height: user?.height != null ? String(user.height) : "",
      weight: user?.weight != null ? String(user.weight) : "",
      goal: user?.goal || "",
      weeklyAvailability: user?.weeklyAvailability || "",
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (!form.username.trim() || !form.email.trim()) {
        setError("Username y email son obligatorios.");
        return;
      }

      if (requiresDni && !form.dni.trim()) {
        setError("El DNI es obligatorio para atletas y coaches.");
        return;
      }

      if (showPersonalData && (!form.birthDate || !form.gender)) {
        setError("Nacimiento y genero son obligatorios para este rol.");
        return;
      }

      if (athleteRole) {
        if (!form.height || !form.weight || !form.weeklyAvailability) {
          setError("Para atletas, altura, peso y disponibilidad semanal son obligatorios.");
          return;
        }
      }

      const response = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(form.dni.trim() ? { dni: form.dni.trim() } : {}),
          username: form.username,
          email: form.email,
          phone: form.phone,
          address: form.address,
          ...(form.password.trim() ? { password: form.password.trim() } : {}),
          ...(showPersonalData ? { birthDate: form.birthDate, gender: form.gender } : {}),
          ...(athleteRole
            ? {
                height: Number(form.height),
                weight: Number(form.weight),
                goal: form.goal.trim(),
                weeklyAvailability: form.weeklyAvailability,
              }
            : {}),
        }),
      });

      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(json?.message || "No se pudo actualizar el usuario.");
        return;
      }

      setMessage("Datos actualizados correctamente.");
      setIsEditing(false);
      updateField("password", "");
      router.refresh();
    } catch {
      setError("Error de conexion al actualizar el usuario.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-3xl border border-white/15 bg-[#17385a] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-white">Datos del perfil</h2>
        {!isEditing ? (
          <button
            type="button"
            onClick={() => {
              setError("");
              setMessage("");
              setIsEditing(true);
            }}
            className="rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/20"
          >
            Editar datos
          </button>
        ) : null}
      </div>

      {!isEditing ? (
        <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-white/85 md:grid-cols-2">
          <p><span className="font-medium">Username:</span> {user?.username || "Sin dato"}</p>
          {requiresDni ? <p><span className="font-medium">DNI:</span> {user?.dni || "Sin dato"}</p> : null}
          <p><span className="font-medium">Email:</span> {user?.email || "Sin dato"}</p>
          <p><span className="font-medium">Nacimiento:</span> {form.birthDate || "Sin dato"}</p>
          {showPersonalData ? <p><span className="font-medium">Genero:</span> {user?.gender || "Sin dato"}</p> : null}
          <p><span className="font-medium">Telefono:</span> {user?.phone || "Sin dato"}</p>
          <p><span className="font-medium">Direccion:</span> {user?.address || "Sin dato"}</p>
          {athleteRole ? (
            <>
              <p><span className="font-medium">Altura:</span> {user?.height || "Sin dato"}</p>
              <p><span className="font-medium">Peso:</span> {user?.weight || "Sin dato"}</p>
              <p><span className="font-medium">Objetivo:</span> {user?.goal || "Sin dato"}</p>
              <p><span className="font-medium">Disponibilidad:</span> {user?.weeklyAvailability || "Sin dato"}</p>
            </>
          ) : null}
        </div>
      ) : (
        <form className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
          {requiresDni ? (
            <input
              required
              type="text"
              value={form.dni}
              onChange={(event) => updateField("dni", event.target.value)}
              className="rounded-lg border border-white/20 bg-[#0f2a46] px-3 py-2 text-white"
              placeholder="DNI"
            />
          ) : null}
          <input
            required
            type="text"
            value={form.username}
            onChange={(event) => updateField("username", event.target.value)}
            className="rounded-lg border border-white/20 bg-[#0f2a46] px-3 py-2 text-white"
            placeholder="Username"
          />
          <input
            required
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            className="rounded-lg border border-white/20 bg-[#0f2a46] px-3 py-2 text-white"
            placeholder="Email"
          />
          {showPersonalData ? (
            <>
              <input
                required
                type="date"
                value={form.birthDate}
                onChange={(event) => updateField("birthDate", event.target.value)}
                className="rounded-lg border border-white/20 bg-[#0f2a46] px-3 py-2 text-white"
              />
              <select
                required
                value={form.gender}
                onChange={(event) => updateField("gender", event.target.value)}
                className="rounded-lg border border-white/20 bg-[#0f2a46] px-3 py-2 text-white"
              >
                <option value="" disabled>Seleccionar genero</option>
                <option value="masculino">Masculino</option>
                <option value="femenino">Femenino</option>
              </select>
            </>
          ) : null}
          <input
            type="text"
            value={form.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            className="rounded-lg border border-white/20 bg-[#0f2a46] px-3 py-2 text-white"
            placeholder="Telefono (opcional)"
          />
          <input
            type="text"
            value={form.address}
            onChange={(event) => updateField("address", event.target.value)}
            className="rounded-lg border border-white/20 bg-[#0f2a46] px-3 py-2 text-white"
            placeholder="Direccion (opcional)"
          />
          <input
            type="password"
            value={form.password}
            onChange={(event) => updateField("password", event.target.value)}
            className="rounded-lg border border-white/20 bg-[#0f2a46] px-3 py-2 text-white md:col-span-2"
            placeholder="Nueva password (opcional)"
          />
          {athleteRole ? (
            <>
              <input
                required
                type="number"
                min="1"
                value={form.height}
                onChange={(event) => updateField("height", event.target.value)}
                className="rounded-lg border border-white/20 bg-[#0f2a46] px-3 py-2 text-white"
                placeholder="Altura (cm)"
              />
              <input
                required
                type="number"
                min="1"
                value={form.weight}
                onChange={(event) => updateField("weight", event.target.value)}
                className="rounded-lg border border-white/20 bg-[#0f2a46] px-3 py-2 text-white"
                placeholder="Peso (kg)"
              />
              <input
                type="text"
                value={form.goal}
                onChange={(event) => updateField("goal", event.target.value)}
                className="rounded-lg border border-white/20 bg-[#0f2a46] px-3 py-2 text-white md:col-span-2"
                placeholder="Objetivo (opcional)"
              />
              <select
                required
                value={form.weeklyAvailability}
                onChange={(event) => updateField("weeklyAvailability", event.target.value)}
                className="rounded-lg border border-white/20 bg-[#0f2a46] px-3 py-2 text-white md:col-span-2"
              >
                <option value="" disabled>Seleccionar disponibilidad semanal</option>
                <option value="1 dia a la semana">1 dia a la semana</option>
                <option value="2 dias a la semana">2 dias a la semana</option>
                <option value="3 dias a la semana">3 dias a la semana</option>
                <option value="4 dias a la semana">4 dias a la semana</option>
                <option value="5 dias a la semana">5 dias a la semana</option>
                <option value="6 dias a la semana">6 dias a la semana</option>
                <option value="7 dias a la semana">7 dias a la semana</option>
              </select>
            </>
          ) : null}

          {message ? <p className="text-sm text-cyan-100 md:col-span-2">{message}</p> : null}
          {error ? <p className="text-sm text-rose-200 md:col-span-2">{error}</p> : null}

          <div className="flex justify-end gap-2 md:col-span-2">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setError("");
                setIsEditing(false);
              }}
              disabled={saving}
              className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white/85 hover:bg-white/10 disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/20 disabled:opacity-60"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
