import { ZodObject, z } from "zod";
import { Prompt } from "../lib/prompt";
import { ChatMessage } from "../openai/messages";
import { CandidatePrompt } from "../lib/candidatePrompt";

const input = z.object({
  text: z.string(),
});

export const BRAINSTORM_INPUTS = "Brainstorm Inputs";

export const brainstormInputs = (
  // dynamic because we're brainstorming inputs for arbitrary prompts we don't know about yet
  inputSchema?: ZodObject<any>
) =>
  new Prompt({
    state: {},
    name: BRAINSTORM_INPUTS,
    description: "Brainstorm inputs to a ChatGPT prompt.",
    input,
    // the output schema for this prompt is
    // the input schema for the prompt
    // we're brainstorming inputs to
    output: inputSchema,
    model: "gpt-4",
    prompts: [
      new CandidatePrompt<z.infer<typeof input>>({
        name: "simple",
        compile: function () {
          return [
            ChatMessage.system(
              `
# Instructions
- Act as a senior ChatGPT prompt engineer.
- Your role is to brainstorm the kinds of inputs that a prompt could take.
        `.trim()
            ),
          ];
        },
      }),
    ],
  });
