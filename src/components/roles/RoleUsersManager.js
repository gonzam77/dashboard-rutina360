"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function RoleUsersManager({
  roleId,
  roleName,
  users,
  viewerRoleKey = "unknown",
  gymOwners = [],
  athleteCoachLabelsByUserId = {},
}) {
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [dni, setDni] = useState("");
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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const isAthleteRole = ["athlete", "atleta"].includes(String(roleName).trim().toLowerCase());
  const isCoachRole = String(roleName).trim().toLowerCase() === "coach";
  const isAdminRole = ["admin", "administrador"].includes(String(roleName).trim().toLowerCase());
  const isGymRole = ["gym", "gimnasio"].includes(String(roleName).trim().toLowerCase());
  const requiresPersonalData = !isAdminRole && !isGymRole;
  const requiresDni = isAthleteRole || isCoachRole;
  const shouldShowUserFilters = isAthleteRole || isCoachRole;
  const requiresGymOwnerSelection = viewerRoleKey === "super_admin" && (isAthleteRole || isCoachRole);
  const [selectedGymOwnerId, setSelectedGymOwnerId] = useState("");
  const gymOwnersById = new Map(
    gymOwners.map((owner) => [String(owner?.id), owner?.username || owner?.email || `Gym #${owner?.id}`])
  );

  function getCoachGymLabel(user) {
    if (user?.adminOwner?.username) {
      return user.adminOwner.username;
    }

    if (user?.adminOwner?.email) {
      return user.adminOwner.email;
    }

    const ownerId = Number(user?.idAdminOwner);
    if (Number.isFinite(ownerId) && ownerId > 0) {
      return gymOwnersById.get(String(ownerId)) || `Gym #${ownerId}`;
    }

    return "Sin gym";
  }

  function resetCreateForm() {
    setDni("");
    setUsername("");
    setEmail("");
    setPassword("");
    setBirthDate("");
    setGender("");
    setHeight("");
    setWeight("");
    setGoal("");
    setWeeklyAvailability("");
    setSelectedGymOwnerId("");
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
      if (isAthleteRole && (!height || !weight || !weeklyAvailability)) {
        setError("Para crear un atleta debes completar altura, peso y disponibilidad semanal.");
        return;
      }

      if (requiresDni && !dni.trim()) {
        setError("El DNI es obligatorio para atletas y coaches.");
        return;
      }

      if (requiresGymOwnerSelection && (!selectedGymOwnerId || Number(selectedGymOwnerId) <= 0)) {
        setError("Debes seleccionar el gimnasio al que pertenece este usuario.");
        return;
      }

      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(dni.trim() ? { dni: dni.trim() } : {}),
          username,
          email,
          password,
          ...(requiresPersonalData ? { birthDate, gender } : {}),
          idRole: Number(roleId),
          ...(requiresGymOwnerSelection ? { idAdminOwner: Number(selectedGymOwnerId) } : {}),
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
      return { label: "Eliminado", className: "border border-rose-300/40 bg-rose-900/30 text-rose-100" };
    }

    if (isInactive) {
      return { label: "Desactivado", className: "border border-amber-300/40 bg-amber-900/30 text-amber-100" };
    }

    return { label: "Activo", className: "border border-cyan-300/35 bg-cyan-300/10 text-cyan-100" };
  }

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      const matchesSearch =
        !normalizedSearch ||
        String(user?.username || "").toLowerCase().includes(normalizedSearch) ||
        String(user?.dni || "").toLowerCase().includes(normalizedSearch) ||
        String(user?.email || "").toLowerCase().includes(normalizedSearch);

      if (!matchesSearch) {
        return false;
      }

      if (statusFilter === "all") {
        return true;
      }

      if (statusFilter === "active") {
        return user?.isDeleted !== true && user?.isActive !== false;
      }

      if (statusFilter === "inactive") {
        return user?.isDeleted !== true && user?.isActive === false;
      }

      if (statusFilter === "deleted") {
        return user?.isDeleted === true;
      }

      return true;
    });
  }, [searchTerm, statusFilter, users]);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-white/15 bg-[#17385a] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Usuarios registrados</h2>
            <p className="mt-1 text-sm text-white/75">
              {filteredUsers.length === 1
                ? "1 usuario visible en este rol."
                : `${filteredUsers.length} usuarios visibles en este rol.`}
            </p>
            {shouldShowUserFilters && filteredUsers.length !== users.length ? (
              <p className="mt-1 text-xs text-white/60">
                Total del rol: {users.length}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/20"
          >
            Agregar usuario
          </button>
        </div>
        {message ? <p className="mt-3 text-sm text-cyan-100">{message}</p> : null}
        {error && !isCreateModalOpen ? <p className="mt-3 text-sm text-rose-200">{error}</p> : null}
      </section>

      {shouldShowUserFilters ? (
        <section className="rounded-3xl border border-white/15 bg-[#17385a] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.28)]">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar por DNI, username o email"
              className="rounded-lg border border-white/20 bg-[#0f2a46] px-3 py-2 text-sm text-white placeholder:text-white/55 md:col-span-2"
            />
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-white/20 bg-[#0f2a46] px-3 py-2 text-sm text-white"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Desactivados</option>
              <option value="deleted">Eliminados</option>
            </select>
          </div>
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredUsers.map((user) => {
          const status = getStatus(user);
          const shouldShowPermanent = user?.isDeleted === true || user?.isActive === false;

          return (
            <article
              key={user.id}
              className="rounded-3xl border border-white/15 bg-[#17385a] p-5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-white/60">
                    Usuario #{user.id}
                  </p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {user.username}
                  </p>
                  <p className="mt-1 text-sm text-white/70">DNI: {user.dni || "Sin dato"}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${status.className}`}>
                  {status.label}
                </span>
              </div>

              <p className="mt-2 text-sm text-white/75">{user.email || "Sin email"}</p>
              {isCoachRole || isAthleteRole ? (
                <p className="mt-1 text-sm text-white/75">Gym: {getCoachGymLabel(user)}</p>
              ) : null}
              {isAthleteRole ? (
                <p className="mt-1 text-sm text-white/75">
                  Coach: {(athleteCoachLabelsByUserId?.[String(user.id)] || []).join(" · ") || "Sin coach asignado"}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/inicio/roles-usuarios/${roleId}/${user.id}`}
                  className="rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-3 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/20"
                >
                  Ver perfil
                </Link>
                <button
                  type="button"
                  onClick={() => handleDeleteUser(user.id, false)}
                  disabled={actionLoadingId === user.id}
                  className="rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm font-medium text-white/85 hover:bg-white/10 disabled:opacity-60"
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
        {filteredUsers.length === 0 ? (
          <article className="rounded-3xl border border-white/15 bg-[#17385a] p-5 text-sm text-white/75 shadow-sm md:col-span-2 xl:col-span-3">
            No hay usuarios que coincidan con los filtros actuales.
          </article>
        ) : null}
      </section>

      {isCreateModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#071a2f]/70 p-4"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-user-title"
            className="w-full max-w-2xl rounded-2xl border border-white/15 bg-[#0f2a46] p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 id="create-user-title" className="text-lg font-semibold text-white">
                  Agregar usuario
                </h3>
                <p className="mt-1 text-sm text-white/75">Crear usuario en este rol.</p>
              </div>
              <button
                type="button"
                onClick={closeCreateModal}
                disabled={loading}
                className="rounded-lg border border-white/20 px-3 py-1.5 text-sm font-medium text-white/85 hover:bg-white/10 disabled:opacity-60"
              >
                Cerrar
              </button>
            </div>

            <form className="grid gap-3 md:grid-cols-2" onSubmit={handleCreateUser}>
              {requiresDni ? (
                <input
                  required
                  autoFocus
                  type="text"
                  placeholder="DNI"
                  value={dni}
                  onChange={(event) => setDni(event.target.value)}
                  className="rounded-lg border border-white/20 bg-[#17385a] px-3 py-2 text-white"
                />
              ) : null}
              <input
                required
                autoFocus={!requiresDni}
                type="text"
                placeholder="Username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="rounded-lg border border-white/20 bg-[#17385a] px-3 py-2 text-white"
              />
              <input
                required
                type="email"
                placeholder="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="rounded-lg border border-white/20 bg-[#17385a] px-3 py-2 text-white"
              />
              {requiresGymOwnerSelection ? (
                <select
                  required
                  value={selectedGymOwnerId}
                  onChange={(event) => setSelectedGymOwnerId(event.target.value)}
                  className="rounded-lg border border-white/20 bg-[#17385a] px-3 py-2 text-white md:col-span-2"
                >
                  <option value="" disabled>Seleccionar gym propietario</option>
                  {gymOwners.map((owner) => (
                    <option key={owner.id} value={owner.id}>
                      {owner.username} ({owner.email || `ID ${owner.id}`})
                    </option>
                  ))}
                </select>
              ) : null}
              {requiresPersonalData ? (
                <>
                  <input
                    required
                    type="date"
                    value={birthDate}
                    onChange={(event) => setBirthDate(event.target.value)}
                    className="rounded-lg border border-white/20 bg-[#17385a] px-3 py-2 text-white"
                  />
                  <select
                    required
                    value={gender}
                    onChange={(event) => setGender(event.target.value)}
                    className="rounded-lg border border-white/20 bg-[#17385a] px-3 py-2 text-white"
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
                className="rounded-lg border border-white/20 bg-[#17385a] px-3 py-2 text-white md:col-span-2"
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
                    className="rounded-lg border border-white/20 bg-[#17385a] px-3 py-2 text-white"
                  />
                  <input
                    required
                    type="number"
                    min="1"
                    placeholder="Peso (kg)"
                    value={weight}
                    onChange={(event) => setWeight(event.target.value)}
                    className="rounded-lg border border-white/20 bg-[#17385a] px-3 py-2 text-white"
                  />
                  <input
                    type="text"
                    placeholder="Objetivo (opcional)"
                    value={goal}
                    onChange={(event) => setGoal(event.target.value)}
                    className="rounded-lg border border-white/20 bg-[#17385a] px-3 py-2 text-white md:col-span-2"
                  />
                  <select
                    required
                    value={weeklyAvailability}
                    onChange={(event) => setWeeklyAvailability(event.target.value)}
                    className="rounded-lg border border-white/20 bg-[#17385a] px-3 py-2 text-white md:col-span-2"
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

              {error ? <p className="text-sm text-rose-200 md:col-span-2">{error}</p> : null}

              <div className="flex flex-wrap justify-end gap-2 md:col-span-2">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  disabled={loading}
                  className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white/85 hover:bg-white/10 disabled:opacity-60"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-300/20 disabled:opacity-60"
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

