import { z } from "zod";
import { Prompt } from "../prompt";
import { ChatMessage } from "../openai/messages";
import highlight from "cli-highlight";
import { capitalizeFirst } from "../helpers/stringUtils";
import { edit } from "./actions";

interface CreateSchemaState {
  schema?: string;
}

const input = z.object({
  prompt: z.string(),
});

export const createSchema = (type: "input" | "output") =>
  new Prompt<typeof input, undefined, CreateSchemaState>({
    name: `create${capitalizeFirst(type)}Schema`,
    description: `Imagine the user's prompt was a function, and create the ${type} schema. Please return a Zod schema.`,
    state: {},
    input,
    model: "gpt-4",
    cliOptions: {
      getNextActions(prompt, messages) {
        return [
          edit({
            input: !prompt.state.schema
              ? `
const ${type}Schema = z.object({

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
      {
        name: "reddit",
        compile: (vars) => [
          ChatMessage.system(
            `
# Instructions
- Act as a senior prompt engineer.
- Your role is to brainstorm the input schema for the prompt and return a Zod schema.
- Your replies should begin with \`const ${type}Schema = z.object({\`
`.trim()
          ),
          ChatMessage.user(
            `
Prompt
"""
${vars.prompt}
"""
`.trim()
          ),
        ],
      },
    ],
    exampleData: [],
  });

if (require.main === module) {
  const arg = process.argv[2];
  if (["i", "o", "input", "output"].includes(arg)) {
    createSchema(arg.startsWith("i") ? "input" : "output").runCLI();
  } else {
    console.log(
      "Please specify whether you want to brainstorm input or output schema."
    );
  }
}
