import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { loadEnvConfig } = require("@next/env");

const isDevelopmentEnv =
  process.env.NODE_ENV === "development" ||
  process.env.APP_ENV === "local" ||
  process.env.APP_ENV === "test";

loadEnvConfig(process.cwd(), isDevelopmentEnv);
