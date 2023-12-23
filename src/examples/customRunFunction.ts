import { z } from "zod";
import { Prompt } from "../lib/prompt";
import { ChatMessage } from "../openai/messages";
import { CandidatePrompt } from "../lib/candidatePrompt";
import { PromptController } from "../lib/promptController";

/**
 * The `Prompt` class has an overloaded `run` function which supports streaming and function calling for OpenAI's API.
 * If you need custom API call behavior, you can extend the `Prompt` class and either override the `run` function, or
 * add a new function to the class.
 *
 * Examples of when this is useful:
 * - You want to include pre- and/or post-processing logic in your prompt tests.
 * - You want to call the underlying `run` function in a loop to process large inputs.
 * - You want to be able to use models other than OpenAI's.
 */

const input = z.object({
  projectTitle: z.string(),
});

type BrainstormIdeasInput = z.infer<typeof input>;

const output = z.object({
  ideas: z.array(z.string()),
});

type BrainstormIdeasOutput = z.infer<typeof output>;

export const BRAINSTORM_IDEAS = "Brainstorm Ideas";

class BrainstormIdeas extends Prompt<typeof input, typeof output> {
  constructor() {
    super({
      name: BRAINSTORM_IDEAS,
      description: "Brainstorm ideas for a new project",
      input,
      output,
      model: "gpt-4",
      max_tokens: 100,
      prompts: [
        new CandidatePrompt<BrainstormIdeasInput>({
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
  }

  /**
   * My custom run function.
   * It can take different arguments than the default run function.
   * It can perform pre- and post-processing logic.
   * It can call the underlying `run` function in a loop to process large inputs.
   */
  async runProd(args: {
    input: BrainstormIdeasInput;
  }): Promise<BrainstormIdeasOutput> {
    return { ideas: [] };
  }
}

/**
 * Here I'm using the `withCustomTest` function to use my custom run function when running the test.
 */
export const brainstormIdeas = () => {
  return new BrainstormIdeas().withCustomTest(
    {
      name: "test",
      vars: { projectTitle: "My Test Project" },
    },
    async function (args: BrainstormIdeasInput) {
      return this.runProd({ input: args });
    },
    (output) => {
      return {
        score: output.ideas.length > 0 ? 1 : 0,
        reason: "",
        pass: output.ideas.length > 0,
      };
    }
  );
};

/**
 * `npx tsx customRunFunction.ts` to run this example.
 */
if (require.main === module) {
  const controller = new PromptController({
    [BRAINSTORM_IDEAS]: brainstormIdeas,
  });
  controller.cli();
}
