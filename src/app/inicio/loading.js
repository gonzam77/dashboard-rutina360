function SkeletonCard({ className = "" }) {
  return (
    <div
      className={`animate-pulse rounded-3xl border border-white/10 bg-[#17385a]/60 ${className}`}
    />
  );
}

/**
 * Estado de carga de las vistas de /inicio. Las paginas consultan varias listas
 * del backend antes de renderizar; sin esto la navegacion se quedaba congelada
 * en la pantalla anterior sin ninguna senal.
 */
export default function InicioLoading() {
  return (
    <div className="space-y-6" role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Cargando contenido...</span>
      <SkeletonCard className="h-40" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SkeletonCard className="h-28" />
        <SkeletonCard className="h-28" />
        <SkeletonCard className="h-28" />
      </div>
      <SkeletonCard className="h-64" />
    </div>
  );
}
