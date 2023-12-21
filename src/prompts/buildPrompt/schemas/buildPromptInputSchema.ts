import { z } from "zod";

export const buildPromptInputSchema = z.object({
  goal: z.string(),
});

export type BuildPromptInput = z.infer<typeof buildPromptInputSchema>;
