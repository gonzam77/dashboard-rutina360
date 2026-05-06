"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RoleUsersManager({ roleId, roleName, users }) {
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [goal, setGoal] = useState("");
  const [weeklyAvailability, setWeeklyAvailability] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isAthleteRole = ["athlete", "atleta"].includes(String(roleName).trim().toLowerCase());
  const isAdminRole = ["admin", "administrador"].includes(String(roleName).trim().toLowerCase());

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

  function openCreateModal() {
    setMessage("");
    setError("");
    setIsCreateModalOpen(true);
  }

  function closeCreateModal() {
    if (loading) {
      return;
    }

    setIsCreateModalOpen(false);
    setError("");
    resetCreateForm();
  }

  async function handleCreateUser(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      if (isAthleteRole && (!height || !weight || !goal.trim() || !weeklyAvailability)) {
        setError("Para crear un atleta debes completar altura, peso, objetivo y disponibilidad semanal.");
        return;
      }

      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          email,
          password,
          ...(!isAdminRole ? { birthDate, gender } : {}),
          idRole: Number(roleId),
          ...(isAthleteRole
            ? {
                height: Number(height),
                weight: Number(weight),
                goal: goal.trim(),
                weeklyAvailability,
              }
            : {}),
        }),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(json?.message || "No se pudo crear el usuario.");
        return;
      }

      resetCreateForm();
      setIsCreateModalOpen(false);
      setMessage("Usuario creado correctamente.");
      router.refresh();
    } catch {
      setError("Error de conexion al crear usuario.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteUser(userId, permanent) {
    setActionLoadingId(userId);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/users/${userId}${permanent ? "?permanent=true" : ""}`,
        { method: "DELETE" }
      );
      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(json?.message || "No se pudo eliminar el usuario.");
        return;
      }

      setMessage(permanent ? "Eliminacion permanente ejecutada." : "Usuario eliminado.");
      router.refresh();
    } catch {
      setError("Error de conexion al eliminar usuario.");
    } finally {
      setActionLoadingId(null);
    }
  }

  function getStatus(user) {
    const isDeleted = user?.isDeleted === true;
    const isInactive = user?.isActive === false;

    if (isDeleted) {
      return { label: "Eliminado", className: "bg-rose-100 text-rose-700" };
    }

    if (isInactive) {
      return { label: "Desactivado", className: "bg-amber-100 text-amber-700" };
    }

    return { label: "Activo", className: "bg-emerald-100 text-emerald-700" };
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Usuarios registrados</h2>
            <p className="mt-1 text-sm text-slate-600">
              {users.length === 1 ? "1 usuario en este rol." : `${users.length} usuarios en este rol.`}
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Agregar usuario
          </button>
        </div>
        {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
        {error && !isCreateModalOpen ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {users.map((user) => {
          const status = getStatus(user);
          const shouldShowPermanent = user?.isDeleted === true || user?.isActive === false;

          return (
            <article
              key={user.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    Usuario #{user.id}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {user.username}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>
                  {status.label}
                </span>
              </div>

              <p className="mt-2 text-sm text-slate-600">{user.email || "Sin email"}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/inicio/roles-usuarios/${roleId}/${user.id}`}
                  className="rounded-lg border border-indigo-300 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50"
                >
                  Ver perfil
                </Link>
                <button
                  type="button"
                  onClick={() => handleDeleteUser(user.id, false)}
                  disabled={actionLoadingId === user.id}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Eliminar
                </button>
                {shouldShowPermanent ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteUser(user.id, true)}
                    disabled={actionLoadingId === user.id}
                    className="rounded-lg bg-rose-600 px-3 py-2 text-sm font-medium text-white hover:bg-rose-500 disabled:opacity-60"
                  >
                    Eliminar de manera permanente
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>

      {isCreateModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4"
          onClick={closeCreateModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-user-title"
            className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 id="create-user-title" className="text-lg font-semibold text-slate-900">
                  Agregar usuario
                </h3>
                <p className="mt-1 text-sm text-slate-600">Crear usuario en este rol.</p>
              </div>
              <button
                type="button"
                onClick={closeCreateModal}
                disabled={loading}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cerrar
              </button>
            </div>

            <form className="grid gap-3 md:grid-cols-2" onSubmit={handleCreateUser}>
              <input
                required
                autoFocus
                type="text"
                placeholder="Username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2"
              />
              <input
                required
                type="email"
                placeholder="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2"
              />
              {!isAdminRole ? (
                <>
                  <input
                    required
                    type="date"
                    value={birthDate}
                    onChange={(event) => setBirthDate(event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2"
                  />
                  <select
                    required
                    value={gender}
                    onChange={(event) => setGender(event.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2"
                  >
                    <option value="" disabled>Seleccionar genero</option>
                    <option value="masculino">Masculino</option>
                    <option value="femenino">Femenino</option>
                  </select>
                </>
              ) : null}
              <input
                required
                type="password"
                placeholder="Password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 md:col-span-2"
              />
              {isAthleteRole ? (
                <>
                  <input
                    required
                    type="number"
                    min="1"
                    placeholder="Altura (cm)"
                    value={height}
                    onChange={(event) => setHeight(event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2"
                  />
                  <input
                    required
                    type="number"
                    min="1"
                    placeholder="Peso (kg)"
                    value={weight}
                    onChange={(event) => setWeight(event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2"
                  />
                  <input
                    required
                    type="text"
                    placeholder="Objetivo (texto libre)"
                    value={goal}
                    onChange={(event) => setGoal(event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 md:col-span-2"
                  />
                  <select
                    required
                    value={weeklyAvailability}
                    onChange={(event) => setWeeklyAvailability(event.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 md:col-span-2"
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

              {error ? <p className="text-sm text-rose-700 md:col-span-2">{error}</p> : null}

              <div className="flex flex-wrap justify-end gap-2 md:col-span-2">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={loading}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
                >
                  {loading ? "Creando..." : "Crear usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
