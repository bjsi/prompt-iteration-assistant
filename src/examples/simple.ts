import { z } from "zod";
import { Prompt } from "../lib/prompt";
import { ChatMessage } from "../openai/messages";
import { CandidatePrompt } from "../lib/candidatePrompt";
import { PromptController } from "../lib/promptController";

const input = z.object({
  projectTitle: z.string(),
});

type BrainstormIdeasInput = z.infer<typeof input>;

const output = z.object({
  ideas: z.array(z.string()),
});

export const BRAINSTORM_IDEAS = "Brainstorm Ideas";

export const brainstormIdeas = () =>
  new Prompt({
    name: BRAINSTORM_IDEAS,
    description: "Brainstorm ideas for a new project",
    input,
    output,
    model: "gpt-4",
    max_tokens: 250,
    prompts: [
      new CandidatePrompt<BrainstormIdeasInput>({
        name: "basic",
        compile: function () {
          return [
            ChatMessage.system(`- Brainstorm ideas for a new project.
- The project should be called ${this.getVariable("projectTitle")}.
- The ideas should be one setence each.
- Create 3 ideas.`),
          ];
        },
      }),
    ],
  }).withTest({
    name: "test 1",
    vars: {
      projectTitle: "ChatGPT",
    },
  });

if (require.main === module) {
  const controller = new PromptController({
    [BRAINSTORM_IDEAS]: brainstormIdeas,
  });
  controller.cli();
}
