function SkeletonCard({ className = "" }) {
  return <div className={`r360-card animate-pulse opacity-60 ${className}`} />;
}

/**
 * Estado de carga de las vistas de /inicio. Las paginas consultan varias listas
 * del backend antes de renderizar; sin esto la navegacion se quedaba congelada
 * en la pantalla anterior sin ninguna senal.
 *
 * El esqueleto imita la forma real (encabezado, fila de metricas, contenido)
 * para que el salto al contenido definitivo no mueva el layout.
 */
export default function InicioLoading() {
  return (
    <div className="space-y-5" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Cargando contenido...</span>
      <SkeletonCard className="h-36" />
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        <SkeletonCard className="h-28" />
        <SkeletonCard className="h-28" />
        <SkeletonCard className="h-28" />
        <SkeletonCard className="h-28" />
      </div>
      <SkeletonCard className="h-64" />
    </div>
  );
}
