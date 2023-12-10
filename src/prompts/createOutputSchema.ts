import { z } from "zod";
import { Prompt } from "../lib/prompt";
import { ChatMessage } from "../openai/messages";
import highlight from "cli-highlight";
import { edit } from "./actions";
import { CandidatePrompt } from "../lib/candidatePrompt";

interface CreateSchemaState {
  schema?: string;
}

const input = z.object({
  prompt: z.string(),
});

export const CREATE_OUTPUT_SCHEMA = "Create Output Schema";

export const createOutputSchema = new Prompt<
  typeof input,
  undefined,
  CreateSchemaState
>({
  name: CREATE_OUTPUT_SCHEMA,
  description: `Imagine the user's ChatGPT prompt was a function. Create a Zod schema to describe the return type of the prompt.`,
  state: {},
  input,
  model: "gpt-4",
  cliOptions: {
    getNextActions(prompt, initialMessages) {
      return [
        edit({
          input: !prompt.state.schema
            ? `
const output = z.object({

});
`.trim()
            : prompt.state.schema.trim(),
        }),
        { name: "save", async action() {} },
        {
          name: "quit",
          async action() {
            process.exit(0);
          },
        },
      ];
    },
    formatChatMessage(message) {
      if (message.role === "assistant") {
        const hl = highlight(message.content || "", { language: "js" });
        console.log(hl);
        return hl;
      } else {
        return message;
      }
    },
  },
  prompts: [
    new CandidatePrompt<z.infer<typeof input>>({
      name: "basic",
      compile: function () {
        return [
          ChatMessage.system(
            `
- Act as a senior prompt engineer.
- Imagine the user's ChatGPT prompt was a function.
- Create a Zod schema to describe the return type of the function.
- Your replies should begin with \`const output = z.object({\`
`.trim()
          ),
          ChatMessage.user(
            `
Prompt
"""
${this.getVariable("prompt")}
"""
`.trim()
          ),
        ];
      },
    }),
  ],
  exampleData: [],
});
