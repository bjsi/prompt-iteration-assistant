import { z } from "zod";
import { Prompt } from "../prompt";
import { ChatMessage } from "../openai/messages";
import highlight from "cli-highlight";

const capitalizeFirst = (str: string) =>
  str.charAt(0).toUpperCase() + str.slice(1);

const createSchema = (type: "input" | "output") =>
  new Prompt({
    name: `create${capitalizeFirst(type)}Schema`,
    description: `Imagine the user's prompt was a function, and create the ${type} schema. Please return a Zod schema.`,
    input: z.object({
      prompt: z.string(),
    }),
    model: "gpt-4",
    cliOptions: {
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
- Task context: prompt testing.
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
    exampleData: [
      {
        prompt: {
          name: "notes->flashcards",
          value:
            "To write a prompt which generates flashcards for me from my notes.",
        },
      },
    ],
  });

createSchema("input").withTest("flashcard assistant", {
  prompt: createSchema("input").exampleData[0].prompt.value,
});

createSchema("output").withTest("flashcard assistant", {
  prompt: createSchema("output").exampleData[0].prompt.value,
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
