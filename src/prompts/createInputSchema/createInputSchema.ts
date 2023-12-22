import { Prompt } from "../../lib/prompt";
import { createInputSchemaInputSchema } from "./schemas/createInputSchemaInputSchema";
import { zeroShot } from "./prompts/zeroShot";

export const CREATE_INPUT_SCHEMA = "Create Input Schema";

export const createInputSchema = () => {
  return new Prompt({
    name: CREATE_INPUT_SCHEMA,
    description:
      "Create a Zod schema based on the variables in the text input.",
    input: createInputSchemaInputSchema,
    model: "gpt-4",
    prompts: [zeroShot],
    exampleData: [],
  });
};
