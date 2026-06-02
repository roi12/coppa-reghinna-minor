export const USER_ROLES = ["OWNER", "ADMIN", "VIEWER"] as const;

export type AppUserRole = (typeof USER_ROLES)[number];

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: AppUserRole;
};
