import { z } from "zod";
import { Action, Prompt } from "../prompt";
import { ChatMessage } from "../openai/messages";
import inquirer from "inquirer";
import * as _ from "remeda";
import { chat, edit } from "./actions";
import { openai, streamText } from "modelfusion";

const createPrompt = new Prompt({
  name: "createPrompt",
  description: "Create a new prompt",
  input: z.object({
    goal: z.string(),
    idealOutput: z.string().optional(),
  }),
  model: "gpt-4",
  cliOptions: {
    getNextActions: (prompt, messages) => {
      const actions: Action<any>[] = [
        {
          name: "run",
          action: async () => {
            const answer = await inquirer.prompt([
              {
                type: "number",
                name: "n_times",
                message: "How many times should I run the prompt? (default 1)",
                default: 1,
              },
            ]);
            const n = Math.max(Math.min(parseInt(answer.n_times), 0), 5);

            // need to push tokens into string array and console.clear(), console.log() them

            const results = await Promise.all(
              _.range(0, n).map(async () => {
                const stream = await streamText(
                  openai.ChatTextGenerator({
                    model: "gpt-4",
                    // temperature: this.temperature,
                    // maxCompletionTokens: this.max_tokens,
                  }),
                  [
                    ChatMessage.system(
                      messages[messages.length - 1].content as string
                    ),
                  ]
                );
                let fullText = "";
                for await (const message of stream) {
                  process.stdout.write(message);
                  fullText += message;
                }
                return fullText;
              })
            );
            console.log(results);
          },
        },
        edit({ input: messages }),
        chat({ input: messages }),
        { name: "save", async action() {} },
      ];
      return actions;
    },
    inputKeyToCLIPrompt(key) {
      if (key === "goal") {
        return "What is the goal of the prompt?";
      } else if (key === "idealOutput") {
        return "What is the ideal output of the prompt?";
      } else {
        return key;
      }
    },
  },
  prompts: [
    {
      // adapted from https://www.reddit.com/r/PromptEngineering/comments/12a5j34/iterative_prompt_creator/
      name: "reddit",
      compile: (vars) => [
        ChatMessage.system(
          `
# Instructions
- Act as a senior prompt engineer
- Task context: prompt generation, iteration<->(feedback and collaboration) to create a clear, concise, unbounded prompt tailored to meet specific needs.
- Your role is to provide guidance and expertise.
- Format the prompts using markdown
- Start simple by coming up with bullet-list prompt instructions without examples.
`.trim()
        ),
        ChatMessage.user(
          `
# Goal
${vars.goal}
${
  vars.idealOutput
    ? `# Ideal output
${vars.idealOutput}`
    : ""
} 
`.trim()
        ),
      ],
    },
  ],
  exampleData: [
    {
      goal: {
        name: "notes->flashcards",
        value: "To generate flashcards for me from my notes",
      },
    },
  ],
});

createPrompt.withTest("flashcard assistant", {
  goal: createPrompt.exampleData[0].goal.value,
});

if (require.main === module) {
  createPrompt.runCLI();
}
