/**
 * Set de iconos del panel.
 *
 * Son SVG inline a proposito: el panel no tenia iconos y agregar una libreria
 * por doce glifos no se justifica. Todos heredan color (`fill="currentColor"`)
 * y miden 1em, asi se alinean con el texto que los acompana.
 */
const PATHS = {
  panel: "M4 13h7V4H4v9zm0 7h7v-5H4v5zm9 0h7v-9h-7v9zm0-16v5h7V4h-7z",
  usuarios:
    "M16 11c1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z",
  rutinas:
    "M17 3H7a2 2 0 00-2 2v16l7-3 7 3V5a2 2 0 00-2-2zM9 8h6v2H9V8zm0 4h6v2H9v-2z",
  catalogo:
    "M20.57 14.86l1.43-1.43-1.41-1.41-1.43 1.43-6.6-6.6 1.43-1.43L12.58 4l-1.43 1.43-1.44-1.44-1.41 1.42 1.43 1.43-2.3 2.3-1.43-1.43L4.58 9.1l1.44 1.44L4.59 11.97 6 13.38l1.43-1.43 6.6 6.6L12.6 19.98l1.41 1.41 1.43-1.43 1.44 1.44 1.41-1.41-1.43-1.44 2.3-2.3 1.43 1.43 1.42-1.41-1.44-1.41z",
  perfil:
    "M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-4.42 0-8 2.24-8 5v3h16v-3c0-2.76-3.58-5-8-5z",
  gym: "M3 10h2v4H3v-4zm16 0h2v4h-2v-4zM6 7h3v10H6V7zm9 0h3v10h-3V7zM9 11h6v2H9v-2z",
  buscar:
    "M15.5 14h-.79l-.28-.27a6.5 6.5 0 10-.7.7l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0a4.5 4.5 0 110-9 4.5 4.5 0 010 9z",
  mas: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
  chevron: "M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z",
  atras: "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z",
  salir:
    "M17 7l-1.41 1.41L17.17 10H9v2h8.17l-1.58 1.59L17 15l4-4-4-4zM5 5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h7v-2H5V5z",
  alerta: "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
  info: "M12 2a10 10 0 100 20 10 10 0 000-20zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z",
  check: "M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z",
  vacio:
    "M20 6h-8l-2-2H4a2 2 0 00-2 2v12a2 2 0 002 2h16a2 2 0 002-2V8a2 2 0 00-2-2zm-9 9.5l-2.5-2.5 1.06-1.06L11 13.38l3.44-3.44L15.5 11 11 15.5z",
  menu: "M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z",
  cerrar:
    "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
};

export default function Icon({ name, className = "", title = "" }) {
  const path = PATHS[name];

  if (!path) {
    return null;
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className={`inline-block h-[1em] w-[1em] shrink-0 fill-current ${className}`}
      role={title ? "img" : "presentation"}
      aria-hidden={title ? undefined : "true"}
      aria-label={title || undefined}
      focusable="false"
    >
      <path d={path} />
    </svg>
  );
}
