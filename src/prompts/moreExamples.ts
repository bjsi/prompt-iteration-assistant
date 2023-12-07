import { z } from "zod";
import { Prompt } from "../prompt";
import { ChatMessage, ChatMessageSchema } from "../openai/messages";

// Get it to elaborate by just pasting into GPT-3.5-Turbo-Instruct which is basically like pasting into the playground?
// But doesn't work for function calls
// really useful if you want to seed the elaboration

const moreExamples1 = new Prompt({
  name: "elaborateOnExampleData",
  description: "Get GPT to generate more example data for my dataset.",
  input: z.object({
    existingPrompt: z.string(),
  }),
  model: "gpt-3.5-turbo-instruct",
  prompts: [
    {
      name: "simple",
      compile: (vars) => [ChatMessage.system(vars.existingPrompt)],
    },
  ],
});

const moreExamples2 = new Prompt({
  name: "elaborateOnExampleData",
  description: "Get GPT to generate more example data for my dataset.",
  input: z.object({
    existingPrompt: ChatMessageSchema.array(),
  }),
  model: "gpt-4",
  prompts: [
    {
      name: "simple",
      compile: (vars) => vars.existingPrompt,
    },
  ],
  exampleData: [
    {
      existingPrompt: {
        name: "Flashcard Generation Prompt",
        value: [
          ChatMessage.system(
            `
# Instructions
- You are a flashcard creating assisant.
- Turn the user's notes into flashcards.

# Notes
`.trim()
          ),
        ],
      },
    },
  ],
});

if (require.main === module) {
  moreExamples2.runCLI();
}
