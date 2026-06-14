export const FUTSAL_PLAYER_ROLE_VALUES = [
  "Portiere",
  "Centrale",
  "Laterale",
  "Pivot",
  "Universale",
] as const;

export type FutsalPlayerRoleValue = (typeof FUTSAL_PLAYER_ROLE_VALUES)[number];

export const FUTSAL_PLAYER_ROLE_OPTIONS: ReadonlyArray<{
  value: "" | FutsalPlayerRoleValue;
  label: string;
}> = [
  { value: "", label: "Non indicato" },
  { value: "Portiere", label: "Portiere" },
  { value: "Centrale", label: "Centrale" },
  { value: "Laterale", label: "Laterale" },
  { value: "Pivot", label: "Pivot" },
  { value: "Universale", label: "Universale" },
];

export function isFutsalPlayerRole(value: string): value is FutsalPlayerRoleValue {
  return FUTSAL_PLAYER_ROLE_VALUES.includes(value as FutsalPlayerRoleValue);
}
