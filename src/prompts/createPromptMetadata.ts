import { z } from "zod";
import { Prompt } from "../lib/prompt";
import { ChatMessage } from "../openai/messages";
import { CandidatePrompt } from "../lib/candidatePrompt";

interface CreatePromptMetadata {}

const input = z.object({
  prompt: z.string(),
});

const output = z.object({
  name: z.string(),
  description: z.string(),
});

export const CREATE_PROMPT_METADATA = "Create Prompt Metadata";

export const createPromptMetadata = () =>
  new Prompt<typeof input, undefined, CreatePromptMetadata>({
    state: {},
    name: CREATE_PROMPT_METADATA,
    description: "Create metadata to describe the user's ChatGPT prompt.",
    input,
    output,
    model: "gpt-4",
    prompts: [
      new CandidatePrompt<z.infer<typeof input>>({
        name: "basic",
        compile: function () {
          return [
            ChatMessage.system(`- Generate suitable metadata for the given ChatGPT prompt.
- Ensure the metadata is a concise and descriptive representation of the prompt and its purpose.`),
            ChatMessage.user(
              `## My ChatGPT Prompt:\n"""${this.getVariable("prompt")}\n"""\n`
            ),
          ];
        },
      }),
    ],
    exampleData: [],
  });
