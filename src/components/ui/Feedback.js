import Icon from "@/components/ui/Icon";

const TONES = {
  error: { className: "r360-badge-peligro", icon: "alerta" },
  aviso: { className: "r360-badge-aviso", icon: "alerta" },
  exito: { className: "r360-badge-exito", icon: "check" },
  info: { className: "r360-badge-acento", icon: "info" },
};

/**
 * Banner de error / aviso / confirmacion.
 *
 * Antes cada pantalla escribia su propio div rojo o ambar con clases distintas,
 * asi que el mismo tipo de mensaje se veia diferente segun donde aparecia.
 */
export function Alert({ tone = "error", title = "", children, className = "" }) {
  const { className: toneClassName, icon } = TONES[tone] || TONES.error;

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`${toneClassName} flex items-start gap-3 rounded-lg border p-4 text-sm ${className}`}
    >
      <Icon name={icon} className="mt-0.5 text-base" />
      <div className="min-w-0">
        {title ? <p className="font-bold">{title}</p> : null}
        <div className={title ? "mt-1 opacity-90" : "opacity-90"}>{children}</div>
      </div>
    </div>
  );
}

/**
 * Estado vacio con explicacion y accion sugerida. Equivale al EstadoVacio de la
 * app mobile: una lista vacia tiene que decir que hacer, no solo que no hay nada.
 */
export function EmptyState({
  icon = "vacio",
  title,
  description = "",
  action = null,
  className = "",
}) {
  return (
    <div
      className={`r360-card-inset flex flex-col items-center justify-center px-6 py-10 text-center ${className}`}
    >
      <Icon name={icon} className="text-3xl text-texto-3" />
      <p className="mt-3 text-base font-bold text-texto">{title}</p>
      {description ? (
        <p className="mt-1 max-w-md text-sm text-texto-2">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/** Metrica del panel: numero grande, etiqueta y pie opcional. */
export function StatCard({ label, value, hint = "", icon = null, tone = "acento" }) {
  const toneClassName =
    { acento: "text-acento", exito: "text-exito", principal: "text-principal" }[tone] ||
    "text-acento";

  return (
    <article className="r360-card flex items-start justify-between gap-3 p-5">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider text-texto-3">{label}</p>
        <p className="mt-2 text-3xl font-extrabold text-texto">{value}</p>
        {hint ? <p className="mt-1 text-xs text-texto-2">{hint}</p> : null}
      </div>
      {icon ? <Icon name={icon} className={`text-2xl ${toneClassName}`} /> : null}
    </article>
  );
}
