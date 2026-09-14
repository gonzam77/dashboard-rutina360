"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import Modal from "@/components/ui/Modal";
import Icon from "@/components/ui/Icon";
import { Alert, EmptyState } from "@/components/ui/Feedback";
import { isAthleteRoleName, isCoachRoleName, normalizeRoleKey } from "@/lib/roles";

const WEEKLY_AVAILABILITY_OPTIONS = [1, 2, 3, 4, 5, 6, 7].map(
  (days) => `${days} dia${days === 1 ? "" : "s"} a la semana`
);

const EMPTY_FORM = {
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
  gymOwnerId: "",
};

function getStatus(user) {
  if (user?.isDeleted === true) {
    return { label: "Eliminado", className: "r360-badge-peligro" };
  }

  if (user?.isActive === false) {
    return { label: "Desactivado", className: "r360-badge-aviso" };
  }

  return { label: "Activo", className: "r360-badge-exito" };
}

export default function RoleUsersManager({
  roleId,
  roleName,
  users,
  viewerRoleKey = "unknown",
  gymOwners = [],
  athleteCoachLabelsByUserId = {},
  athleteAssignedRoutinesCountByUserId = {},
}) {
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [gymFilterId, setGymFilterId] = useState("all");
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const isAthleteRole = isAthleteRoleName(roleName);
  const isCoachRole = isCoachRoleName(roleName);
  const isGymOrAdminRole = normalizeRoleKey(roleName) === "admin";
  const requiresPersonalData = !isGymOrAdminRole;
  const requiresDni = isAthleteRole || isCoachRole;
  const shouldShowUserFilters = isAthleteRole || isCoachRole;
  const shouldShowGymFilter =
    viewerRoleKey === "super_admin" && (isAthleteRole || isCoachRole) && gymOwners.length > 0;
  const requiresGymOwnerSelection =
    viewerRoleKey === "super_admin" && (isAthleteRole || isCoachRole);

  const gymLabelById = useMemo(
    () =>
      new Map(
        gymOwners.map((owner) => [
          String(owner?.id),
          owner?.username || owner?.email || `Gym #${owner?.id}`,
        ])
      ),
    [gymOwners]
  );

  const getGymLabel = useMemo(() => {
    return (user) => {
      if (user?.adminOwner?.username) {
        return user.adminOwner.username;
      }

      if (user?.adminOwner?.email) {
        return user.adminOwner.email;
      }

      const ownerId = Number(user?.idAdminOwner);

      if (Number.isFinite(ownerId) && ownerId > 0) {
        return gymLabelById.get(String(ownerId)) || `Gym #${ownerId}`;
      }

      return "Sin gym";
    };
  }, [gymLabelById]);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      if (normalizedSearch) {
        const haystack = [user?.username, user?.dni, user?.email, getGymLabel(user)]
          .map((value) => String(value || "").toLowerCase())
          .join(" ");

        if (!haystack.includes(normalizedSearch)) {
          return false;
        }
      }

      if (shouldShowGymFilter && gymFilterId !== "all") {
        const userOwnerId = Number(user?.idAdminOwner) || Number(user?.adminOwner?.id) || null;

        if (Number(userOwnerId) !== Number(gymFilterId)) {
          return false;
        }
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
  }, [getGymLabel, gymFilterId, searchTerm, shouldShowGymFilter, statusFilter, users]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
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
    setForm(EMPTY_FORM);
  }

  async function handleCreateUser(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (isAthleteRole && (!form.height || !form.weight || !form.weeklyAvailability)) {
      setError("Para crear un atleta debes completar altura, peso y disponibilidad semanal.");
      return;
    }

    if (requiresDni && !form.dni.trim()) {
      setError("El DNI es obligatorio para atletas y coaches.");
      return;
    }

    if (requiresGymOwnerSelection && !(Number(form.gymOwnerId) > 0)) {
      setError("Debes seleccionar el gimnasio al que pertenece este usuario.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(form.dni.trim() ? { dni: form.dni.trim() } : {}),
          username: form.username,
          email: form.email,
          password: form.password,
          idRole: Number(roleId),
          ...(requiresPersonalData ? { birthDate: form.birthDate, gender: form.gender } : {}),
          ...(requiresGymOwnerSelection ? { idAdminOwner: Number(form.gymOwnerId) } : {}),
          ...(isAthleteRole
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
        setError(json?.message || "No se pudo crear el usuario.");
        return;
      }

      setForm(EMPTY_FORM);
      setIsCreateModalOpen(false);
      setMessage("Usuario creado correctamente.");
      router.refresh();
    } catch {
      setError("Error de conexion al crear usuario.");
    } finally {
      setLoading(false);
    }
  }

  async function confirmDeleteUser() {
    if (!deleteConfirm?.userId) {
      return;
    }

    setActionLoadingId(deleteConfirm.userId);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/users/${deleteConfirm.userId}${deleteConfirm.permanent ? "?permanent=true" : ""}`,
        { method: "DELETE" }
      );
      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(json?.message || "No se pudo eliminar el usuario.");
        return;
      }

      setMessage(
        deleteConfirm.permanent ? "Eliminacion permanente ejecutada." : "Usuario eliminado."
      );
      router.refresh();
    } catch {
      setError("Error de conexion al eliminar usuario.");
    } finally {
      setActionLoadingId(null);
      setDeleteConfirm(null);
    }
  }

  const inputClassName = "r360-input";

  return (
    <div className="space-y-4">
      {/*
        Cabecera y filtros vivian en dos tarjetas separadas, asi que el buscador
        quedaba lejos del contador de resultados que iba a modificar.
      */}
      <section className="r360-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-texto">Usuarios registrados</h2>
            <p className="mt-1 text-sm text-texto-2">
              {filteredUsers.length === users.length
                ? `${users.length} usuario${users.length === 1 ? "" : "s"} en este rol.`
                : `${filteredUsers.length} de ${users.length} usuarios coinciden con el filtro.`}
            </p>
          </div>
          <button type="button" onClick={openCreateModal} className="r360-btn r360-btn-primary">
            <Icon name="mas" />
            Agregar usuario
          </button>
        </div>

        {shouldShowUserFilters ? (
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div
              className={`relative ${shouldShowGymFilter ? "md:col-span-1" : "md:col-span-2"}`}
            >
              <Icon
                name="buscar"
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-texto-3"
              />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por DNI, username, email o gym"
                aria-label="Buscar usuarios"
                className="r360-input pl-9"
              />
            </div>
            {shouldShowGymFilter ? (
              <select
                value={gymFilterId}
                onChange={(event) => setGymFilterId(event.target.value)}
                aria-label="Filtrar por gimnasio"
                className="r360-input"
              >
                <option value="all">Todos los gyms</option>
                {gymOwners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.username || owner.email || `Gym #${owner.id}`}
                  </option>
                ))}
              </select>
            ) : null}
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filtrar por estado"
              className="r360-input"
            >
              <option value="all">Todos los estados</option>
              <option value="active">Activos</option>
              <option value="inactive">Desactivados</option>
              <option value="deleted">Eliminados</option>
            </select>
          </div>
        ) : null}

        {message ? (
          <Alert tone="exito" className="mt-4">
            {message}
          </Alert>
        ) : null}
        {error && !isCreateModalOpen ? (
          <Alert className="mt-4">{error}</Alert>
        ) : null}
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredUsers.map((user) => {
          const status = getStatus(user);
          const shouldShowPermanent = user?.isDeleted === true || user?.isActive === false;
          const isBusy = actionLoadingId === user.id;
          const coachLabels = athleteCoachLabelsByUserId?.[String(user.id)] || [];
          const routineCount = Number(athleteAssignedRoutinesCountByUserId?.[String(user.id)] || 0);

          return (
            <article key={user.id} className="r360-card flex flex-col p-5">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-acento/35 bg-acento/10 text-base font-bold text-acento">
                  {String(user.username || "?").charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-base font-bold text-texto">{user.username}</p>
                  <p className="truncate text-xs text-texto-3">{user.email || "Sin email"}</p>
                </div>
                <span className={`r360-badge ${status.className}`}>{status.label}</span>
              </div>

              <dl className="mt-4 space-y-1.5 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-texto-3">DNI</dt>
                  <dd className="truncate text-texto-2">{user.dni || "Sin dato"}</dd>
                </div>
                {isCoachRole || isAthleteRole ? (
                  <div className="flex justify-between gap-3">
                    <dt className="text-texto-3">Gym</dt>
                    <dd className="truncate text-texto-2">{getGymLabel(user)}</dd>
                  </div>
                ) : null}
                {isAthleteRole ? (
                  <>
                    <div className="flex justify-between gap-3">
                      <dt className="text-texto-3">Coach</dt>
                      <dd className="truncate text-texto-2">
                        {coachLabels.join(" · ") || "Sin asignar"}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-texto-3">Rutinas</dt>
                      <dd
                        className={`r360-badge ${
                          routineCount > 0 ? "r360-badge-exito" : "r360-badge-neutro"
                        }`}
                      >
                        {routineCount}
                      </dd>
                    </div>
                  </>
                ) : null}
              </dl>

              <div className="mt-auto flex flex-wrap gap-2 pt-4">
                <Link
                  href={`/inicio/roles-usuarios/${roleId}/${user.id}`}
                  className="r360-btn r360-btn-accent r360-btn-sm flex-1"
                >
                  Ver perfil
                  <Icon name="chevron" />
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    setDeleteConfirm({
                      userId: Number(user.id),
                      permanent: false,
                      username: user.username || `Usuario #${user.id}`,
                    })
                  }
                  disabled={isBusy}
                  className="r360-btn r360-btn-ghost r360-btn-sm"
                >
                  Eliminar
                </button>
                {shouldShowPermanent ? (
                  <button
                    type="button"
                    onClick={() =>
                      setDeleteConfirm({
                        userId: Number(user.id),
                        permanent: true,
                        username: user.username || `Usuario #${user.id}`,
                      })
                    }
                    disabled={isBusy}
                    className="r360-btn r360-btn-danger r360-btn-sm w-full"
                  >
                    Eliminar de manera permanente
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
        {filteredUsers.length === 0 ? (
          <div className="md:col-span-2 xl:col-span-3">
            <EmptyState
              icon="usuarios"
              title={
                users.length === 0
                  ? "Todavia no hay usuarios en este rol"
                  : "Ningun usuario coincide con los filtros"
              }
              description={
                users.length === 0
                  ? "Usa el boton Agregar usuario para dar de alta el primero."
                  : "Proba con otro termino de busqueda o limpia los filtros de estado y gimnasio."
              }
              action={
                users.length === 0 ? (
                  <button type="button" onClick={openCreateModal} className="r360-btn r360-btn-primary">
                    <Icon name="mas" />
                    Agregar usuario
                  </button>
                ) : null
              }
            />
          </div>
        ) : null}
      </section>

      <Modal
        open={isCreateModalOpen}
        onClose={closeCreateModal}
        closeDisabled={loading}
        title="Agregar usuario"
        description={`Crear usuario en el rol ${roleName || `#${roleId}`}.`}
      >
        <form className="grid gap-3 md:grid-cols-2" onSubmit={handleCreateUser}>
          {requiresDni ? (
            <input
              required
              type="text"
              placeholder="DNI"
              value={form.dni}
              onChange={(event) => updateField("dni", event.target.value)}
              className={inputClassName}
            />
          ) : null}
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
          {requiresGymOwnerSelection ? (
            <select
              required
              value={form.gymOwnerId}
              onChange={(event) => updateField("gymOwnerId", event.target.value)}
              className={`${inputClassName} md:col-span-2`}
            >
              <option value="" disabled>
                Seleccionar gym propietario
              </option>
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
            </>
          ) : null}
          <input
            required
            type="password"
            autoComplete="new-password"
            placeholder="Password"
            value={form.password}
            onChange={(event) => updateField("password", event.target.value)}
            className={`${inputClassName} md:col-span-2`}
          />
          {isAthleteRole ? (
            <>
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
                className={`${inputClassName} md:col-span-2`}
              />
              <select
                required
                aria-label="Disponibilidad semanal"
                value={form.weeklyAvailability}
                onChange={(event) => updateField("weeklyAvailability", event.target.value)}
                className={`${inputClassName} md:col-span-2`}
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
            </>
          ) : null}

          {error ? (
            <div className="md:col-span-2">
              <Alert>{error}</Alert>
            </div>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2 md:col-span-2">
            <button
              type="button"
              onClick={closeCreateModal}
              disabled={loading}
              className="r360-btn r360-btn-ghost"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="r360-btn r360-btn-accent"
            >
              {loading ? "Creando..." : "Crear usuario"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteConfirm)}
        title="Confirmar eliminacion"
        description={
          deleteConfirm?.permanent
            ? `Vas a eliminar de manera permanente a ${deleteConfirm?.username}. Esta accion no se puede deshacer.`
            : `Vas a eliminar a ${deleteConfirm?.username}. Podras eliminarlo de manera permanente mas adelante.`
        }
        confirmLabel={
          deleteConfirm?.permanent ? "Eliminar permanentemente" : "Confirmar eliminacion"
        }
        pendingLabel="Eliminando..."
        loading={actionLoadingId !== null}
        onConfirm={confirmDeleteUser}
        onCancel={() => {
          if (actionLoadingId === null) {
            setDeleteConfirm(null);
          }
        }}
      />
    </div>
  );
}
