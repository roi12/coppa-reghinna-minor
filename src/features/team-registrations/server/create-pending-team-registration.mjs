import prismaClientModule from "../../../lib/prisma-client.mjs";
import {
  buildCaptainManageUrl,
  generateCaptainManageToken,
  hashCaptainManageToken,
} from "./captain-manage-core.mjs";

const { prisma } = prismaClientModule;

/**
 * @typedef {{
 *   firstName: string;
 *   lastName: string;
 *   jerseyNumber: string;
 *   role?: string | null;
 *   sortOrder: number;
 * }} PendingTeamRegistrationPlayerInput
 */

/**
 * @typedef {{
 *   tournamentId: string;
 *   tournamentSlug: string;
 *   captainFirstName: string;
 *   captainLastName: string;
 *   captainEmail: string;
 *   captainPhone: string;
 *   teamName: string;
 *   notes?: string | null;
 *   players: PendingTeamRegistrationPlayerInput[];
 * }} CreatePendingTeamRegistrationInput
 */

/**
 * @typedef {{
 *   registrationId: string;
 *   captainManageToken: string;
 *   captainManageUrl: string;
 *   teamName: string;
 *   captainEmail: string;
 *   captainFirstName: string;
 * }} CreatePendingTeamRegistrationResult
 */

function normalizeOptionalString(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

/**
 * @param {CreatePendingTeamRegistrationInput} input
 * @param {{ db?: typeof prisma; now?: Date }} [options]
 * @returns {Promise<CreatePendingTeamRegistrationResult>}
 */
export async function createPendingTeamRegistration(input, options = {}) {
  const db = options.db ?? prisma;
  const issuedAt = options.now ?? new Date();
  const captainManageToken = generateCaptainManageToken();

  const registration = await db.teamRegistration.create({
    data: {
      tournamentId: input.tournamentId,
      captainFirstName: input.captainFirstName,
      captainLastName: input.captainLastName,
      captainEmail: input.captainEmail,
      captainPhone: input.captainPhone,
      teamName: input.teamName,
      notes: normalizeOptionalString(input.notes),
      captainManageTokenHash: hashCaptainManageToken(captainManageToken),
      captainManageTokenIssuedAt: issuedAt,
      captainManageTokenLastUsedAt: null,
      captainManageTokenRevokedAt: null,
      players: {
        create: input.players.map((player, index) => ({
          firstName: player.firstName,
          lastName: player.lastName,
          jerseyNumber: player.jerseyNumber,
          role: normalizeOptionalString(player.role),
          sortOrder: player.sortOrder ?? index,
        })),
      },
    },
    select: {
      id: true,
      captainEmail: true,
      captainFirstName: true,
      teamName: true,
    },
  });

  return {
    registrationId: registration.id,
    captainManageToken,
    captainManageUrl: buildCaptainManageUrl(input.tournamentSlug, captainManageToken),
    teamName: registration.teamName,
    captainEmail: registration.captainEmail,
    captainFirstName: registration.captainFirstName,
  };
}
