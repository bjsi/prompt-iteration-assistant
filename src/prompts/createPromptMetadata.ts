import { z } from "zod";
import { Prompt } from "../lib/prompt";
import { ChatMessage } from "../openai/messages";
import { CandidatePrompt } from "../lib/candidatePrompt";

interface CreatePromptMetadata {}

const input = z.object({
  text: z.string(),
});

const output = z.object({
  metadata: z.object({
    name: z.string(),
    description: z.string(),
  }),
});

export const CREATE_PROMPT_METADATA = "Create Prompt Metadata";

export const createPromptMetadata = () =>
  new Prompt<typeof input, undefined, CreatePromptMetadata>({
    state: {},
    name: CREATE_PROMPT_METADATA,
    description: "Create metadata to describe a ChatGPT prompt.",
    input,
    output,
    model: "gpt-3.5-turbo",
    prompts: [
      new CandidatePrompt<z.infer<typeof input>>({
        name: "basic",
        compile: function () {
          return [
            ChatMessage.system(`- Generate suitable metadata for the given ChatGPT prompt.
- Ensure the metadata is a concise and descriptive representation of the prompt and its purpose.`),
            ChatMessage.user(
              `# My ChatGPT Prompt:\n"""${this.getVariable("text")}"""`
            ),
          ];
        },
      }),
    ],
    exampleData: [],
  });
