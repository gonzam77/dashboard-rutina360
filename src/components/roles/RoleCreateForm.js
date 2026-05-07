"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export default function RoleCreateForm({ roles }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const roleOptions = useMemo(() => {
    return [...(Array.isArray(roles) ? roles : [])].sort(
      (a, b) => Number(a?.id || 0) - Number(b?.id || 0)
    );
  }, [roles]);

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          parentId: parentId || null,
        }),
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
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Gestión de roles</h2>
            <p className="mt-1 text-sm text-slate-600">Crea roles nuevos y define su jerarquía.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setError("");
              setMessage("");
              setIsOpen(true);
            }}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Crear rol
          </button>
        </div>
        {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
      </section>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => !loading && setIsOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Crear nuevo rol</h3>
                <p className="mt-1 text-sm text-slate-600">Define un nombre y opcionalmente su rol padre.</p>
              </div>
              <button
                type="button"
                disabled={loading}
                onClick={() => setIsOpen(false)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Cerrar
              </button>
            </div>

            <form className="grid gap-3 md:grid-cols-2" onSubmit={handleSubmit}>
              <input
                required
                type="text"
                placeholder="Nombre del rol"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2"
              />

              <select
                value={parentId}
                onChange={(event) => setParentId(event.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2"
              >
                <option value="">Sin padre</option>
                {roleOptions.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name} (#{role.id})
                  </option>
                ))}
              </select>

              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60 md:col-span-2"
              >
                {loading ? "Creando..." : "Crear rol"}
              </button>
            </form>

            {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
