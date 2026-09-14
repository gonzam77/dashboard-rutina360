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
      ? "r360-btn r360-btn-danger"
      : "r360-btn r360-btn-accent";

  return (
    <Modal open={open} onClose={onCancel} size="md" closeDisabled={loading} title={title}>
      {description ? <p className="text-sm text-texto-2">{description}</p> : null}

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="r360-btn r360-btn-ghost"
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
