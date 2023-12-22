import { CandidatePrompt } from "../../../lib/candidatePrompt";
import { ChatMessage } from "../../../openai/messages";
import { CreateInputSchemaInput } from "../schemas/createInputSchemaInputSchema";

export const zeroShot = new CandidatePrompt<CreateInputSchemaInput>({
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
});
