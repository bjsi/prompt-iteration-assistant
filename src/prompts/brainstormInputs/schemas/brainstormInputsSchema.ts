import { z } from "zod";

export const brainstormInputsSchema = z.object({
  prompt: z.string(),
});

export type BrainstormInputsInput = z.infer<typeof brainstormInputsSchema>;
