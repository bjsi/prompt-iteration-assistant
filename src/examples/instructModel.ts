import { z } from "zod";
import { Prompt } from "../lib/prompt";
import { CandidatePrompt } from "../lib/candidatePrompt";
import { PromptController } from "../lib/promptController";

const input = z.object({
  projectTitle: z.string(),
});

type BrainstormIdeasInput = z.infer<typeof input>;

export const BRAINSTORM_IDEAS = "Brainstorm Ideas";

export const brainstormIdeas = () =>
  new Prompt({
    name: BRAINSTORM_IDEAS,
    description: "Brainstorm ideas for a new project",
    input,
    model: "gpt-3.5-turbo-instruct",
    max_tokens: 300,
    prompts: [
      new CandidatePrompt<BrainstormIdeasInput>({
        name: "basic",
        compile: function () {
          return `
- Brainstorm ideas for a new project.
- The project should be called ${this.getVariable("projectTitle")}.
`.trim();
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
