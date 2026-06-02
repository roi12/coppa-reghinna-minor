import { z } from "zod";

import { TEAM_REGISTRATION_STATUS_VALUES } from "@/features/team-registrations/types/team-registration.types";

export const teamRegistrationStatusSchema = z.enum(TEAM_REGISTRATION_STATUS_VALUES);

export type TeamRegistrationStatusInput = z.infer<typeof teamRegistrationStatusSchema>;
