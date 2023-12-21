import { z } from "zod";
import { Prompt } from "../../lib/prompt";
import { ChatMessage } from "../../openai/messages";
import { CandidatePrompt } from "../../lib/candidatePrompt";

const input = z.object({
  rawPrompt: z.string(),
});

export const CREATE_INPUT_SCHEMA = "Create Input Schema";

export const createInputSchema = () => {
  return new Prompt({
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
- Translate each prompt variable into fields inside a Zod object schema.
- Your replies should begin: z.object({`),
            ChatMessage.user(`Input text: ${this.getVariable("rawPrompt")}`),
          ];
        },
      }),
    ],
    exampleData: [],
  });
};

const x = createInputSchema().run({
  promptVariables: {
    rawPrompt: "Please write a greeting message for ${name}.",
  },
  stream: false,
});
