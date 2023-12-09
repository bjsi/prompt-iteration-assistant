
import { z } from "zod";

}           



interface New PromptState { }

export const newPrompt = new Prompt<
  typeof input,
  undefined,
  New PromptState
>({
  state: {},
  name: "New Prompt",
  description: "Prompt Description",
  input,
  model: "gpt-4",
  prompts: [
    {
      name: "new",
      compile: (vars) => [
        ChatMessage.system(- Construct a Zod schema based on the text input.
- The variables use the following syntax: `${variableName}`.
- For each variable in the prompt, create a corresponding key in the schema
- Translate each prompt variable into respective Zod schema data types and structure.
- Your replies should begin `const schema = Zod.object({`)
      ]
    }
  ],
  exampleData: [],
});

if (require.main === module) {
  newPrompt.runCLI();
}