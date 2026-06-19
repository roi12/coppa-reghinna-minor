import assert from "node:assert/strict";
import test from "node:test";

import {
  getLoginPagePresentation,
  shouldShowDevLoginHints,
} from "@/features/auth/utils/dev-login-hints";

function withEnv<T>(nextEnv: Partial<NodeJS.ProcessEnv>, run: () => T) {
  const previousEnv = {
    APP_ENV: process.env.APP_ENV,
    NODE_ENV: process.env.NODE_ENV,
    APP_URL: process.env.APP_URL,
    VERCEL: process.env.VERCEL,
    VERCEL_ENV: process.env.VERCEL_ENV,
  };

  Object.assign(process.env, nextEnv);

  try {
    return run();
  } finally {
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("dev login hints render in local mode", () => {
  const presentation = withEnv(
    {
      APP_ENV: "local",
      NODE_ENV: "development",
      APP_URL: "http://localhost:3000",
      VERCEL: "",
      VERCEL_ENV: "",
    },
    () => getLoginPagePresentation(),
  );

  assert.equal(
    shouldShowDevLoginHints({
      APP_ENV: "local",
      NODE_ENV: "development",
      APP_URL: "http://localhost:3000",
      VERCEL: "",
      VERCEL_ENV: "",
    }),
    true,
  );
  assert.equal(presentation.showDevLoginHints, true);
  assert.equal(presentation.emailPlaceholder, "owner@sports-platform.local");
  assert.equal(presentation.passwordPlaceholder, "owner-demo-pass");
});

test("dev login hints do not render in production mode", () => {
  const presentation = withEnv(
    {
      APP_ENV: "production",
      NODE_ENV: "production",
      APP_URL: "https://coppa.example.com",
      VERCEL: "1",
      VERCEL_ENV: "production",
    },
    () => getLoginPagePresentation(),
  );

  assert.equal(
    shouldShowDevLoginHints({
      APP_ENV: "production",
      NODE_ENV: "production",
      APP_URL: "https://coppa.example.com",
      VERCEL: "1",
      VERCEL_ENV: "production",
    }),
    false,
  );
  assert.equal(presentation.showDevLoginHints, false);
  assert.equal(presentation.emailPlaceholder, "name@example.com");
  assert.equal(presentation.passwordPlaceholder, "Inserisci la password");
  assert.equal(presentation.helperText, "Accedi con un account autorizzato per usare il dashboard.");
});

test("dev login hints do not render in staging mode", () => {
  const presentation = withEnv(
    {
      APP_ENV: "staging",
      NODE_ENV: "production",
      APP_URL: "https://staging.example.com",
      VERCEL: "1",
      VERCEL_ENV: "preview",
    },
    () => getLoginPagePresentation(),
  );

  assert.equal(
    shouldShowDevLoginHints({
      APP_ENV: "staging",
      NODE_ENV: "production",
      APP_URL: "https://staging.example.com",
      VERCEL: "1",
      VERCEL_ENV: "preview",
    }),
    false,
  );
  assert.equal(presentation.showDevLoginHints, false);
  assert.equal(presentation.emailPlaceholder, "name@example.com");
  assert.equal(presentation.passwordPlaceholder, "Inserisci la password");
});
