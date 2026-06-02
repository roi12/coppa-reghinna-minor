import { z } from "zod";

const optionalTrimmedString = (schema: z.ZodString) =>
  z.preprocess((value) => {
    if (typeof value !== "string") {
      return undefined;
    }

    const trimmedValue = value.trim();

    return trimmedValue.length === 0 ? undefined : trimmedValue;
  }, schema.optional());

export const createPlayerSchema = z.object({
  organizationId: z.string().cuid("Choose a valid organization for this player."),
  teamId: z.string().cuid("Choose a valid team for this player."),
  firstName: z
    .string()
    .trim()
    .min(1, "First name is required.")
    .max(80, "First name must be 80 characters or fewer."),
  lastName: z
    .string()
    .trim()
    .min(1, "Last name is required.")
    .max(80, "Last name must be 80 characters or fewer."),
  displayName: optionalTrimmedString(
    z.string().max(120, "Display name must be 120 characters or fewer."),
  ),
  email: optionalTrimmedString(z.string().email("Email must be a valid email address.")),
  jerseyNumber: optionalTrimmedString(
    z.string().max(10, "Jersey number must be 10 characters or fewer."),
  ),
});

export type CreatePlayerInput = z.infer<typeof createPlayerSchema>;
