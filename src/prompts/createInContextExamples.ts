import { z } from "zod";
import { Prompt } from "../prompt";
import { ChatMessage } from "../openai/messages";

// Get it to elaborate by just pasting into GPT-3.5-Turbo-Instruct which is basically like pasting into the playground.

const moreExamples = new Prompt({
  name: "elaborateOnExampleData",
  description: "Get GPT to generate more example data for my dataset.",
  input: z.object({
    prompt: z.string(),
  }),
  model: "gpt-3.5-turbo-instruct",
  prompts: [
    {
      name: "simple",
      compile: (vars) => [ChatMessage.system(vars.prompt)],
    },
  ],
});

if (require.main === module) {
  moreExamples.runCLI();
}
