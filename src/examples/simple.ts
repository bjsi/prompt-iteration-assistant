import { z } from "zod";
import { Prompt } from "../lib/prompt";
import { ChatMessage } from "../openai/messages";
import { CandidatePrompt } from "../lib/candidatePrompt";

const input = z.object({
  projectTitle: z.string(),
});

export const BRAINSTORM_IDEAS = "Brainstorm Ideas";

export const brainstormIdeas = () =>
  new Prompt({
    state: {},
    name: BRAINSTORM_IDEAS,
    description: "Brainstorm ideas for a new project",
    input,
    output: z.object({
      ideas: z.array(z.string()),
    }),
    model: "gpt-4",
    max_tokens: 100,
    prompts: [
      new CandidatePrompt<z.infer<typeof input>>({
        name: "basic",
        compile: function () {
          return [
            ChatMessage.system(`- Brainstorm ideas for a new project.
- The project should be called ${this.getVariable("projectTitle")}.`),
          ];
        },
      }),
    ],
  });
