import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SideMenu from "@/components/SideMenu";
import { getRoles } from "@/lib/backend";
import { isAthleteRoleName } from "@/lib/roles";
import { firstNonEmptyString, parseSessionUserCookie } from "@/lib/session";
import { getViewer } from "@/lib/viewer";

export default async function InicioLayout({ children }) {
  const viewer = await getViewer();

  if (!viewer) {
    redirect("/login");
  }

  if (viewer.roleKey === "athlete") {
    redirect("/sin-acceso");
  }

  // La cookie de sesion solo aporta datos de presentacion; el rol ya viene del token.
  const cookieStore = await cookies();
  const sessionUser = parseSessionUserCookie(cookieStore.get("session_user")?.value);

  const roles = await getRoles(viewer.token);
  const athleteRoleId = Number(roles.find((role) => isAthleteRoleName(role?.name))?.id) || null;

  const username = firstNonEmptyString([viewer.username, sessionUser?.username]) || "Usuario";
  const role = firstNonEmptyString([viewer.roleName, sessionUser?.roleName]) || "Sin rol";
  const ownRoleId = viewer.roleId || Number(sessionUser?.idRole) || null;

  return (
    <div className="min-h-screen bg-[var(--azul-profundo)] lg:flex">
      <SideMenu
        username={username}
        role={role}
        roleKey={viewer.roleKey}
        isGymRole={viewer.isGym}
        ownRoleId={ownRoleId}
        ownUserId={viewer.id}
        athleteRoleId={athleteRoleId}
      />
      <main className="flex-1 bg-[radial-gradient(circle_at_top_right,rgba(68,213,255,0.08),transparent_45%),var(--azul-profundo)] p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}
