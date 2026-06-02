import { z } from "zod";

export const createTeamSchema = z.object({
  organizationId: z.string().cuid(),
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9-]+$/),
});

export type CreateTeamInput = z.infer<typeof createTeamSchema>;
