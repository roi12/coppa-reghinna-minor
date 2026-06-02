import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const passwordHash = scryptSync(password, salt, 64).toString("hex");

  return `${salt}:${passwordHash}`;
}

export function verifyPassword(password: string, storedPasswordHash: string) {
  const [salt, expectedPasswordHash] = storedPasswordHash.split(":");

  if (!salt || !expectedPasswordHash) {
    return false;
  }

  const derivedPasswordHash = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expectedPasswordHash, "hex");

  if (expectedBuffer.length !== derivedPasswordHash.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, derivedPasswordHash);
}
