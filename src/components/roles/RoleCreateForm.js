"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { Alert } from "@/components/ui/Feedback";
import Modal from "@/components/ui/Modal";

export default function RoleCreateForm({ roles }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const roleOptions = useMemo(
    () => [...(Array.isArray(roles) ? roles : [])].sort((a, b) => Number(a?.id || 0) - Number(b?.id || 0)),
    [roles]
  );

  function closeModal() {
    if (loading) {
      return;
    }

    setIsOpen(false);
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, parentId: parentId || null }),
      });

      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(json?.message || "No se pudo crear el rol.");
        return;
      }

      setMessage("Rol creado correctamente.");
      setName("");
      setParentId("");
      setIsOpen(false);
      router.refresh();
    } catch {
      setError("Error de conexion al crear rol.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <section className="r360-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-texto">
              <Icon name="panel" className="text-acento" />
              Gestion de roles
            </h2>
            <p className="mt-1 text-sm text-texto-2">Crea roles nuevos y define su jerarquía.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setError("");
              setMessage("");
              setIsOpen(true);
            }}
            className="r360-btn r360-btn-primary"
          >
            <Icon name="mas" />
            Crear rol
          </button>
        </div>
        {message ? (
          <Alert tone="exito" className="mt-4">
            {message}
          </Alert>
        ) : null}
      </section>

      <Modal
        open={isOpen}
        onClose={closeModal}
        closeDisabled={loading}
        title="Crear nuevo rol"
        description="Define un nombre y opcionalmente su rol padre."
      >
        <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
          <input
            required
            type="text"
            placeholder="Nombre del rol"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="r360-input placeholder:text-texto-3"
          />

          <select
            value={parentId}
            aria-label="Rol padre"
            onChange={(event) => setParentId(event.target.value)}
            className="r360-input"
          >
            <option value="">Sin padre</option>
            {roleOptions.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name} (#{role.id})
              </option>
            ))}
          </select>

          {error ? (
            <div className="md:col-span-2">
              <Alert>{error}</Alert>
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="r360-btn r360-btn-primary md:col-span-2"
          >
            {loading ? "Creando..." : "Crear rol"}
          </button>
        </form>
      </Modal>
    </>
  );
}
