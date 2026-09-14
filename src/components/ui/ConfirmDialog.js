"use client";

import Modal from "@/components/ui/Modal";

/**
 * Confirmacion de acciones destructivas. Reemplaza a window.confirm para que
 * todas las eliminaciones del panel se vean y se comporten igual.
 */
export default function ConfirmDialog({
  open,
  title = "Confirmar accion",
  description,
  confirmLabel = "Confirmar",
  pendingLabel = "Procesando...",
  cancelLabel = "Cancelar",
  tone = "danger",
  loading = false,
  onConfirm,
  onCancel,
}) {
  const confirmClassName =
    tone === "danger"
      ? "rounded-lg border border-rose-300/40 bg-rose-900/35 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-900/50 disabled:opacity-60"
      : "rounded-lg border border-cyan-300/35 bg-cyan-300/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300/20 disabled:opacity-60";

  return (
    <Modal open={open} onClose={onCancel} size="md" closeDisabled={loading} title={title}>
      {description ? <p className="text-sm text-white/80">{description}</p> : null}

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white/85 transition hover:bg-white/10 disabled:opacity-60"
        >
          {cancelLabel}
        </button>
        <button type="button" onClick={onConfirm} disabled={loading} className={confirmClassName}>
          {loading ? pendingLabel : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
