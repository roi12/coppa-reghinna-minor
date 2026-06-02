const DEFAULT_APP_URL = "http://localhost:3000";

export function getSiteUrl() {
  const rawUrl = process.env.APP_URL?.trim() || DEFAULT_APP_URL;

  try {
    return new URL(rawUrl);
  } catch {
    return new URL(DEFAULT_APP_URL);
  }
}
