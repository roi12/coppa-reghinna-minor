export type DashboardFeedback = {
  type: "success" | "error";
  message: string;
};

export async function readDashboardFeedback(
  searchParamsPromise?: Promise<Record<string, string | string[] | undefined>>,
): Promise<DashboardFeedback | null> {
  if (!searchParamsPromise) {
    return null;
  }

  const searchParams = await searchParamsPromise;
  const type = searchParams.type;
  const message = searchParams.message;

  if (
    (type !== "success" && type !== "error") ||
    typeof message !== "string" ||
    message.trim().length === 0
  ) {
    return null;
  }

  return { type, message };
}
