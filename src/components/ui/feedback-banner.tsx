import type { DashboardFeedback } from "@/lib/dashboard-feedback";

type FeedbackBannerProps = {
  feedback: DashboardFeedback | null;
};

export function FeedbackBanner({ feedback }: FeedbackBannerProps) {
  if (!feedback) {
    return null;
  }

  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm ${
        feedback.type === "success"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-rose-200 bg-rose-50 text-rose-800"
      }`}
    >
      {feedback.message}
    </div>
  );
}
