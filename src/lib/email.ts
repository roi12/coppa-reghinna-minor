import "server-only";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
};

export type SendEmailResult =
  | { ok: true }
  | { ok: false; skipped: true; reason: "missing_config" }
  | { ok: false; skipped: false; reason: "provider_error" };

function readTrimmedEnv(name: string) {
  return process.env[name]?.trim() || "";
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
}: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = readTrimmedEnv("RESEND_API_KEY");
  const from = readTrimmedEnv("EMAIL_FROM");

  if (!apiKey || !from) {
    return {
      ok: false,
      skipped: true,
      reason: "missing_config",
    };
  }

  const resolvedReplyTo = replyTo?.trim() || readTrimmedEnv("EMAIL_REPLY_TO") || undefined;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
        text,
        ...(resolvedReplyTo ? { reply_to: resolvedReplyTo } : {}),
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return {
        ok: false,
        skipped: false,
        reason: "provider_error",
      };
    }

    return { ok: true };
  } catch {
    return {
      ok: false,
      skipped: false,
      reason: "provider_error",
    };
  }
}
