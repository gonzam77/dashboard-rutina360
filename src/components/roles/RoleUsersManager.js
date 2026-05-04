"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RoleUsersManager({ roleId, users }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleCreateUser(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password, birthDate, gender, idRole: Number(roleId) }),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(json?.message || "No se pudo crear el usuario.");
        return;
      }

      setUsername("");
      setEmail("");
      setPassword("");
      setBirthDate("");
      setGender("");
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
        <h2 className="text-lg font-semibold text-slate-900">Crear usuario en este rol</h2>
        <form className="mt-4 grid gap-3 md:grid-cols-2" onSubmit={handleCreateUser}>
          <input
            required
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
            className="rounded-lg border border-slate-300 px-3 py-2 bg-white"
          >
            <option value="" disabled>Seleccionar género</option>
            <option value="masculino">Masculino</option>
            <option value="femenino">Femenino</option>
          </select>
          <input
            required
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 md:col-span-2"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800 disabled:opacity-60 md:col-span-2"
          >
            {loading ? "Creando..." : "Crear usuario"}
          </button>
        </form>
        {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
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
    </div>
  );
}
