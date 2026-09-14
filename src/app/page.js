import { redirect } from "next/navigation";
import { getViewer } from "@/lib/viewer";

export default async function Home() {
  const viewer = await getViewer();

  // Con sesion activa se entra directo al panel en vez de pasar por el login.
  redirect(viewer && viewer.roleKey !== "athlete" ? "/inicio" : "/login");
}
