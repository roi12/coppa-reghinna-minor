export function isNextRedirectError(error: unknown): error is { digest: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof error.digest === "string" &&
    error.digest.startsWith("NEXT_REDIRECT")
  );
}

export function rethrowIfNextRedirectError(error: unknown) {
  if (isNextRedirectError(error)) {
    throw error;
  }
}
