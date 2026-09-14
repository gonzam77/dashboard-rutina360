/**
 * Tarjeta base del panel. Todo bloque de contenido usa esta, para que el radio,
 * el borde y la sombra sean los mismos en las seis pantallas.
 */
export function Card({ as: Tag = "section", className = "", children, ...rest }) {
  return (
    <Tag className={`r360-card p-5 sm:p-6 ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

/**
 * Tarjeta con titulo, descripcion opcional y zona de acciones a la derecha.
 * Es el patron que ya se repetia a mano en casi todas las secciones.
 */
export function SectionCard({
  title,
  description,
  icon = null,
  actions = null,
  className = "",
  bodyClassName = "mt-5",
  children,
}) {
  return (
    <Card className={className}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-lg font-bold text-texto">
            {icon}
            {title}
          </h2>
          {description ? <p className="mt-1 text-sm text-texto-2">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children ? <div className={bodyClassName}>{children}</div> : null}
    </Card>
  );
}

export default Card;
