import type { PrismaClient } from "@prisma/client";
import prismaClientModule from "./prisma-client.mjs";

type PrismaClientModule = {
  createPrismaClient: () => PrismaClient;
  getDatabaseUrl: () => string;
  prisma: PrismaClient;
};

const { createPrismaClient, getDatabaseUrl, prisma } = prismaClientModule as PrismaClientModule;

export { createPrismaClient, getDatabaseUrl, prisma };
