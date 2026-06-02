import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { requireDashboardUser } from "@/features/auth/server/session";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireDashboardUser();

  return (
    <AppShell
      title="Organizer Workspace"
      subtitle="Create tournaments, manage teams and rosters, and schedule matches from the organizer dashboard."
      user={user}
    >
      {children}
    </AppShell>
  );
}
