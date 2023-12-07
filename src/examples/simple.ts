import { z } from "zod";
import { Prompt } from "../prompt";
import { ChatMessage } from "../openai/messages";

const brainstormIdeas = new Prompt({
  name: "brainstormIdeas",
  description: "Brainstorm ideas for a new project",
  input: z.object({
    projectTitle: z.string(),
  }),
  output: z.object({
    ideas: z.array(z.string()),
  }),
  model: "gpt-4",
  prompts: [
    {
      name: "simple",
      compile: (vars) => [
        ChatMessage.system(
          `Brainstorm ideas for a new project called ${vars.projectTitle}.`
        ),
      ],
    },
  ],
});

if (require.main === module) {
  brainstormIdeas.runCLI();
}
