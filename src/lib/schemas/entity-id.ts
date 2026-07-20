import { z } from "zod";

const cuidSchema = z.string().cuid();
const uuidSchema = z.string().uuid();

export const entityIdSchema = z.string().refine(
  (value) => cuidSchema.safeParse(value).success || uuidSchema.safeParse(value).success,
  {
    message: "Invalid identifier.",
  },
);
