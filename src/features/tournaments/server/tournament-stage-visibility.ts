import type { TournamentStageTypeValue } from "@/features/tournaments/types/tournament-format.types";

type TournamentStageVisibilityInput = {
  id: string;
  type: TournamentStageTypeValue;
  isPublic?: boolean;
};

export function getDefaultTournamentStageVisibility(type: TournamentStageTypeValue) {
  return type !== "KNOCKOUT_STAGE";
}

export function getKnockoutStageVisibilityState(stages: TournamentStageVisibilityInput[]) {
  const knockoutStages = stages.filter((stage) => stage.type === "KNOCKOUT_STAGE");
  const groupStages = stages.filter((stage) => stage.type === "GROUP_STAGE");

  return {
    hasKnockoutStage: knockoutStages.length > 0,
    knockoutStageIds: knockoutStages.map((stage) => stage.id),
    knockoutStageIsPublic:
      knockoutStages.length > 0 ? knockoutStages.every((stage) => stage.isPublic !== false) : null,
    groupStageIsPublic:
      groupStages.length > 0 ? groupStages.every((stage) => stage.isPublic !== false) : null,
  };
}
