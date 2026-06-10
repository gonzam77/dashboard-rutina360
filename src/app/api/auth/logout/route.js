import { callBackendLogoutCurrentSession, clearAuthCookies } from "@/lib/auth-service";

export async function POST() {
  await callBackendLogoutCurrentSession();
  await clearAuthCookies();
  return new Response(null, {
    status: 303,
    headers: { Location: "/login" },
  });
}
