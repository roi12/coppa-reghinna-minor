import { defineConfig, env } from "prisma/config";
import { loadEnvConfig } from "@next/env";

const isDevelopmentEnv =
  process.env.NODE_ENV === "development" ||
  process.env.APP_ENV === "local" ||
  process.env.APP_ENV === "test";

loadEnvConfig(process.cwd(), isDevelopmentEnv);

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DIRECT_URL"),
  },
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed-base.mjs",
  },
});
