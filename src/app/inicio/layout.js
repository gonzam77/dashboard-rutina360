import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SideMenu from "@/components/SideMenu";

export default async function InicioLayout({ children }) {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      <SideMenu />
      <main className="flex-1 p-6 lg:p-8">{children}</main>
    </div>
  );
}
