function isLocalHostUrl(value: string | undefined) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1";
  } catch {
    return false;
  }
}

export function shouldShowDevLoginHints(
  env: Partial<Pick<NodeJS.ProcessEnv, "APP_ENV" | "NODE_ENV" | "APP_URL" | "VERCEL" | "VERCEL_ENV">> = process.env,
) {
  if (env.VERCEL || env.VERCEL_ENV === "production") {
    return false;
  }

  if (env.APP_ENV === "local" || env.APP_ENV === "test") {
    return true;
  }

  if (env.NODE_ENV !== "development") {
    return false;
  }

  return isLocalHostUrl(env.APP_URL);
}

export function getLoginPagePresentation(
  env: Partial<Pick<NodeJS.ProcessEnv, "APP_ENV" | "NODE_ENV" | "APP_URL" | "VERCEL" | "VERCEL_ENV">> = process.env,
) {
  const showDevLoginHints = shouldShowDevLoginHints(env);

  return {
    showDevLoginHints,
    helperText: showDevLoginHints
      ? "Usa un account di esempio per provare in locale gli accessi in base al ruolo."
      : "Accedi con un account autorizzato per usare il dashboard.",
    emailPlaceholder: showDevLoginHints ? "owner@sports-platform.local" : "name@example.com",
    passwordPlaceholder: showDevLoginHints ? "owner-demo-pass" : "Inserisci la password",
  };
}
