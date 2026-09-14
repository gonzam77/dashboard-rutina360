"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { Alert } from "@/components/ui/Feedback";
import { isAthleteRoleName, isCoachRoleName, normalizeRoleKey } from "@/lib/roles";

/**
 * Dato del perfil en modo lectura. Antes cada campo era un parrafo
 * "Etiqueta: valor" y con doce campos seguidos no se distinguia donde terminaba
 * uno y empezaba el siguiente.
 */
function DataRow({ label, value }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-linea-suave py-2 last:border-b-0">
      <dt className="shrink-0 text-xs font-semibold uppercase tracking-wide text-texto-3">
        {label}
      </dt>
      <dd className="min-w-0 truncate text-sm text-texto">{value || "Sin dato"}</dd>
    </div>
  );
}

const WEEKLY_AVAILABILITY_OPTIONS = [1, 2, 3, 4, 5, 6, 7].map(
  (days) => `${days} dia${days === 1 ? "" : "s"} a la semana`
);

export default function UserProfileEditor({ user, roleName }) {
  const router = useRouter();
  const athleteRole = isAthleteRoleName(roleName);
  const coachRole = isCoachRoleName(roleName);
  const requiresDni = athleteRole || coachRole;
  const showPersonalData = normalizeRoleKey(roleName) !== "admin";

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
          // Se envian siempre, incluso vacios: es la unica forma de borrarlos.
          phone: form.phone.trim(),
          address: form.address.trim(),
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
      updateField("password", "");
      setIsEditing(false);
      router.refresh();
    } catch {
      setError("Error de conexion al actualizar el usuario.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="r360-card p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-texto">
          <Icon name="perfil" className="text-acento" />
          Datos del perfil
        </h2>
        {!isEditing ? (
          <button
            type="button"
            onClick={() => {
              setError("");
              setMessage("");
              setIsEditing(true);
            }}
            className="r360-btn r360-btn-accent r360-btn-sm"
          >
            Editar datos
          </button>
        ) : null}
      </div>

      {!isEditing && message ? (
        <Alert tone="exito" className="mt-4">
          {message}
        </Alert>
      ) : null}

      {!isEditing ? (
        <dl className="mt-4 grid grid-cols-1 gap-x-6 md:grid-cols-2">
          <DataRow label="Username" value={user?.username} />
          {requiresDni ? <DataRow label="DNI" value={user?.dni} /> : null}
          <DataRow label="Email" value={user?.email} />
          <DataRow label="Nacimiento" value={form.birthDate} />
          {showPersonalData ? <DataRow label="Genero" value={user?.gender} /> : null}
          <DataRow label="Telefono" value={user?.phone} />
          <DataRow label="Direccion" value={user?.address} />
          {athleteRole ? (
            <>
              <DataRow label="Altura" value={user?.height ? `${user.height} cm` : ""} />
              <DataRow label="Peso" value={user?.weight ? `${user.weight} kg` : ""} />
              <DataRow label="Objetivo" value={user?.goal} />
              <DataRow label="Disponibilidad" value={user?.weeklyAvailability} />
            </>
          ) : null}
        </dl>
      ) : (
        <form className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
          {requiresDni ? (
            <input
              required
              type="text"
              value={form.dni}
              onChange={(event) => updateField("dni", event.target.value)}
              className="r360-input"
              placeholder="DNI"
            />
          ) : null}
          <input
            required
            type="text"
            value={form.username}
            onChange={(event) => updateField("username", event.target.value)}
            className="r360-input"
            placeholder="Username"
          />
          <input
            required
            type="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
            className="r360-input"
            placeholder="Email"
          />
          {showPersonalData ? (
            <>
              <input
                required
                type="date"
                value={form.birthDate}
                onChange={(event) => updateField("birthDate", event.target.value)}
                className="r360-input"
              />
              <select
                required
                value={form.gender}
                onChange={(event) => updateField("gender", event.target.value)}
                className="r360-input"
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
            className="r360-input"
            placeholder="Telefono (opcional)"
          />
          <input
            type="text"
            value={form.address}
            onChange={(event) => updateField("address", event.target.value)}
            className="r360-input"
            placeholder="Direccion (opcional)"
          />
          <input
            type="password"
            value={form.password}
            onChange={(event) => updateField("password", event.target.value)}
            className="r360-input md:col-span-2"
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
                className="r360-input"
                placeholder="Altura (cm)"
              />
              <input
                required
                type="number"
                min="1"
                value={form.weight}
                onChange={(event) => updateField("weight", event.target.value)}
                className="r360-input"
                placeholder="Peso (kg)"
              />
              <input
                type="text"
                value={form.goal}
                onChange={(event) => updateField("goal", event.target.value)}
                className="r360-input md:col-span-2"
                placeholder="Objetivo (opcional)"
              />
              <select
                required
                value={form.weeklyAvailability}
                onChange={(event) => updateField("weeklyAvailability", event.target.value)}
                className="r360-input md:col-span-2"
              >
                <option value="" disabled>Seleccionar disponibilidad semanal</option>
                {WEEKLY_AVAILABILITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </>
          ) : null}

          {message ? (
            <div className="md:col-span-2">
              <Alert tone="exito">{message}</Alert>
            </div>
          ) : null}
          {error ? (
            <div className="md:col-span-2">
              <Alert>{error}</Alert>
            </div>
          ) : null}

          <div className="flex justify-end gap-2 md:col-span-2">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setError("");
                setIsEditing(false);
              }}
              disabled={saving}
              className="r360-btn r360-btn-ghost"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="r360-btn r360-btn-primary"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
