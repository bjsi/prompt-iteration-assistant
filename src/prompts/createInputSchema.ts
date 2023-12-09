import { z } from "zod";
import { Prompt } from "../prompt";
import { ChatMessage } from "../openai/messages";

interface CreateInputSchemaState {}

const input = z.object({
  text: z.string(),
});

export const createInputSchema = new Prompt<
  typeof input,
  undefined,
  CreateInputSchemaState
>({
  state: {},
  name: "Create Input Schema",
  description: "Create a Zod schema based on the variables in the text input.",
  input,
  model: "gpt-4",
  prompts: [
    {
      name: "new",
      compile: (vars) => [
        ChatMessage.system(`- Construct a Zod schema based on the text input.
- The variables use the following syntax: \`\${variableName\}\`.
- For each variable in the prompt, create a corresponding key in the schema
- Translate each prompt variable into respective Zod schema data types and structure.
- Your replies should begin \`const schema = z.object({\``),
        ChatMessage.user(`Input text: ${vars.text}`),
      ],
    },
  ],
  exampleData: [],
});

if (require.main === module) {
  createInputSchema.runCLI("run");
}
