import { ZodObject, z } from "zod";
import { Prompt } from "../prompt";
import { ChatMessage } from "../openai/messages";

const brainstormInputs = (
  // dynamic because we're brainstorming inputs arbitrary prompts we don't know about yet
  inputSchema?: ZodObject<any>
) =>
  new Prompt({
    name: "brainstormInputs",
    description:
      "Brainstorm inputs to a prompt, considering the context in which it will be used and potential edge cases.",
    input: z.object({
      prompt: z.string(),
    }),
    // slightly confusing - the output schema for this prompt is the input schema for the prompt we're brainstorming inputs to
    output: inputSchema,
    model: "gpt-3.5-turbo-instruct",
    prompts: [
      {
        // adapted from https://www.reddit.com/r/PromptEngineering/comments/12a5j34/iterative_prompt_creator/
        name: "reddit",
        compile: (vars) => [
          ChatMessage.system(
            `
# Instructions
- Act as a senior prompt engineer.
- Task context: prompt testing.
- Your role is to brainstorm the kinds of inputs that a prompt could take.
`.trim()
          ),
        ],
      },
    ],
    exampleData: [
      {
        prompt: {
          name: "notes->flashcards",
          value:
            "To write a prompt which generates flashcards for me from my notes.",
        },
      },
    ],
  }).withTest("flashcard assistant", {
    prompt:
      "To write a prompt which generates flashcards for me from my notes.",
  });

if (require.main === module) {
  brainstormInputs().runCLI();
}
