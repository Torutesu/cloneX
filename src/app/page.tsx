import { redirect } from "next/navigation";

// Screens (SCR-001 login, SCR-003 dashboard, ...) land in Phase 2. Until then the
// root route just points at /login so the app has a defined entry point; the actual
// auth-guard redirect logic (logged-in -> /app, logged-out -> /login) belongs to
// SCR-001's page component once it exists.
export default function RootPage() {
  redirect("/login");
}
