import "server-only";

import nodemailer from "nodemailer";

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

function readSmtpConfig() {
  const host = readTrimmedEnv("SMTP_HOST");
  const portValue = readTrimmedEnv("SMTP_PORT");
  const secureValue = readTrimmedEnv("SMTP_SECURE");
  const user = readTrimmedEnv("SMTP_USER");
  const password = readTrimmedEnv("SMTP_PASSWORD");
  const from = readTrimmedEnv("EMAIL_FROM");

  if (!host || !portValue || !user || !password || !from) {
    return null;
  }

  const port = Number.parseInt(portValue, 10);

  if (!Number.isInteger(port) || port <= 0) {
    return null;
  }

  return {
    host,
    port,
    secure: secureValue.toLowerCase() === "true",
    user,
    password,
    from,
  };
}

export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
}: SendEmailInput): Promise<SendEmailResult> {
  const smtpConfig = readSmtpConfig();

  if (!smtpConfig) {
    return {
      ok: false,
      skipped: true,
      reason: "missing_config",
    };
  }

  const resolvedReplyTo = replyTo?.trim() || readTrimmedEnv("EMAIL_REPLY_TO") || undefined;

  try {
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.password,
      },
    });

    await transporter.sendMail({
      from: smtpConfig.from,
      to,
      subject,
      html,
      text,
      ...(resolvedReplyTo ? { replyTo: resolvedReplyTo } : {}),
    });

    return { ok: true };
  } catch {
    return {
      ok: false,
      skipped: false,
      reason: "provider_error",
    };
  }
}
