import { z } from "zod";

export const createInputSchemaInputSchema = z.object({
  rawPrompt: z.string(),
});

export type CreateInputSchemaInput = z.infer<
  typeof createInputSchemaInputSchema
>;
