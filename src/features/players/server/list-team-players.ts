import type { PlayerSummary } from "@/features/players/types/player.types";
import { prisma } from "@/lib/prisma";

function comparePlayerJersey(left: PlayerSummary, right: PlayerSummary) {
  const leftNumber = Number(left.jerseyNumber);
  const rightNumber = Number(right.jerseyNumber);
  const leftHasNumericJersey = Number.isFinite(leftNumber);
  const rightHasNumericJersey = Number.isFinite(rightNumber);

  if (leftHasNumericJersey && rightHasNumericJersey && leftNumber !== rightNumber) {
    return leftNumber - rightNumber;
  }

  if (leftHasNumericJersey !== rightHasNumericJersey) {
    return leftHasNumericJersey ? -1 : 1;
  }

  return (
    (left.jerseyNumber ?? "").localeCompare(right.jerseyNumber ?? "", undefined, {
      sensitivity: "base",
      numeric: true,
    }) ||
    left.lastName.localeCompare(right.lastName, undefined, { sensitivity: "base" }) ||
    left.firstName.localeCompare(right.firstName, undefined, { sensitivity: "base" })
  );
}

export async function listTeamPlayers(teamId: string): Promise<PlayerSummary[]> {
  const players = await prisma.player.findMany({
    where: { teamId },
    orderBy: [{ jerseyNumber: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      organizationId: true,
      teamId: true,
      firstName: true,
      lastName: true,
      displayName: true,
      jerseyNumber: true,
      role: true,
    },
  });

  return players.sort(comparePlayerJersey);
}
