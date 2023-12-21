import { z } from "zod";
import { Prompt } from "../../lib/prompt";
import { ChatMessage } from "../../openai/messages";
import { getInputFromEditor } from "../../dialogs/actions";
import { CandidatePrompt } from "../../lib/candidatePrompt";
import { highlightTS } from "../../helpers/print";

export interface CreateSchemaState {
  schema?: string;
}

const input = z.object({
  prompt: z.string(),
});

export const CREATE_OUTPUT_SCHEMA = "Create Output Schema";

export const createOutputSchema = (state: CreateSchemaState) => {
  return new Prompt({
    name: CREATE_OUTPUT_SCHEMA,
    description: `Imagine the user's ChatGPT prompt was a function. Create a Zod schema to describe the return type of the prompt.`,
    input,
    model: "gpt-4",
    cliOptions: {
      async getNextActions(prompt) {
        return [
          {
            name: "edit",
            async action() {
              const output = await getInputFromEditor({
                input: !state.schema
                  ? `
const output = z.object({

});
`.trim()
                  : state.schema.trim(),
              });
            },
          },
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
          const hl = highlightTS(message.content || "");
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
};
