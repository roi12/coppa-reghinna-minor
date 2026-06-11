export type DashboardFeedback = {
  type: "success" | "error";
  message: string;
  playerId?: string;
  documentAction?: "upload" | "paper-delivery";
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
  const playerId = searchParams.playerId;
  const documentAction = searchParams.documentAction;

  if (
    (type !== "success" && type !== "error") ||
    typeof message !== "string" ||
    message.trim().length === 0
  ) {
    return null;
  }

  return {
    type,
    message,
    playerId: typeof playerId === "string" && playerId.trim().length > 0 ? playerId : undefined,
    documentAction:
      documentAction === "upload" || documentAction === "paper-delivery"
        ? documentAction
        : undefined,
  };
}
