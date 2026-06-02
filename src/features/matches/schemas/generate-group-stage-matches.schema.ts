import { z } from "zod";

export const generateGroupStageMatchesSchema = z.object({
  tournamentId: z.string().cuid(),
  tournamentSlug: z.string().trim().min(2).max(140).regex(/^[a-z0-9-]+$/),
  startDate: z.coerce.date(),
  intervalDays: z.coerce.number().int().min(1).max(365),
  defaultMatchTime: z
    .string()
    .trim()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/)
    .optional()
    .or(z.literal("")),
  generationMode: z.enum(["PRESERVE_EXISTING", "REPLACE_SCHEDULED_GROUP_STAGE"]),
});

export type GenerateGroupStageMatchesInput = z.infer<typeof generateGroupStageMatchesSchema>;
