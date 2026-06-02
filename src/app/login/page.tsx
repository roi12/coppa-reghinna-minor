import { LoginPage } from "@/features/auth/components/login-page";
import { getCurrentUser } from "@/features/auth/server/session";
import { readDashboardFeedback } from "@/lib/dashboard-feedback";

export default async function LoginRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [currentUser, feedback] = await Promise.all([
    getCurrentUser(),
    readDashboardFeedback(searchParams),
  ]);

  return <LoginPage currentUser={currentUser} feedback={feedback} />;
}
