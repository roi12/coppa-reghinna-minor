import { defineConfig, env } from "prisma/config";
import { existsSync } from "node:fs";
import path from "node:path";
import { loadEnvConfig } from "@next/env";

function findProjectRoot(startDirectory: string) {
  let currentDirectory = startDirectory;

  while (true) {
    if (existsSync(path.join(currentDirectory, "package.json"))) {
      return currentDirectory;
    }

    const parentDirectory = path.dirname(currentDirectory);

    if (parentDirectory === currentDirectory) {
      return startDirectory;
    }

    currentDirectory = parentDirectory;
  }
}

loadEnvConfig(findProjectRoot(process.cwd()));

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
