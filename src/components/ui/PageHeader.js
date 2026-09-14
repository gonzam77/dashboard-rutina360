import Link from "next/link";
import Icon from "@/components/ui/Icon";

/**
 * Migas de pan de la ruta actual.
 *
 * El panel tiene rutas de hasta cinco niveles
 * (/inicio/roles-usuarios/[rol]/[usuario]/rutinas/[rutina]) y hasta ahora la
 * unica salida era un boton "Volver" al nivel inmediato: desde una rutina no
 * habia forma de saber a que atleta pertenecia ni de subir dos niveles de una.
 */
function Breadcrumbs({ items }) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Ruta de navegacion">
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-1 text-xs font-semibold text-texto-3">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;

          return (
            <li key={`${item.href || "actual"}-${item.label}`} className="flex items-center gap-1">
              {index > 0 ? (
                <Icon name="chevron" className="text-[0.9em] opacity-50" />
              ) : null}
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="rounded px-1 py-0.5 transition hover:bg-linea-suave hover:text-acento"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={`px-1 py-0.5 ${isLast ? "text-texto-2" : ""}`} aria-current={isLast ? "page" : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Encabezado unico de pagina: migas, titulo, bajada y acciones.
 * Reemplaza los cinco headers distintos que tenia cada pantalla.
 */
export default function PageHeader({
  eyebrow = "",
  title,
  description = "",
  breadcrumbs = [],
  meta = null,
  actions = null,
}) {
  return (
    <header className="r360-card relative overflow-hidden p-6 sm:p-8">
      <div
        className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-acento/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative">
        <Breadcrumbs items={breadcrumbs} />

        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-acento">{eyebrow}</p>
            ) : null}
            <h1 className="mt-1 text-2xl font-extrabold text-texto sm:text-3xl">{title}</h1>
            {description ? (
              <p className="mt-2 max-w-2xl text-sm text-texto-2">{description}</p>
            ) : null}
            {meta ? <div className="mt-3 flex flex-wrap items-center gap-2">{meta}</div> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      </div>
    </header>
  );
}
