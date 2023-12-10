import { z } from "zod";
import { Prompt } from "../lib/prompt";
import { ChatMessage } from "../openai/messages";
import { CandidatePrompt } from "../lib/candidatePrompt";

interface CreateInputSchemaState {}

const input = z.object({
  rawPrompt: z.string(),
});

export const CREATE_INPUT_SCHEMA = "Create Input Schema";

export const createInputSchema = () =>
  new Prompt<typeof input, undefined, CreateInputSchemaState>({
    state: {},
    name: CREATE_INPUT_SCHEMA,
    description:
      "Create a Zod schema based on the variables in the text input.",
    input,
    model: "gpt-4",
    prompts: [
      new CandidatePrompt<z.infer<typeof input>>({
        name: "new",
        compile: function () {
          return [
            ChatMessage.system(`- Construct a Zod schema based on the text input.
- The variables use the following syntax: \${vars.variableName}.
- For each variable in the prompt, create a corresponding key in the schema
- Translate each prompt variable into respective Zod schema data types and structure.
- Your replies should begin: z.object({`),
            ChatMessage.user(`Input text: ${this.getVariable("rawPrompt")}`),
          ];
        },
      }),
    ],
    exampleData: [],
  });
