import { z } from "zod";
import { Prompt } from "../prompt";
import { ChatMessage } from "../openai/messages";
import inquirer from "inquirer";
import _ from "remeda";

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
      // while (answer?.action !== "Exit") {
      //   answer = await inquirer.prompt([
      //     {
      //       type: "search-list",
      //       name: "action",
      //       message: "Select an option:",
      //       choices: ["Edit", "Chat", "Exit"],
      //     },
      //   ]);
      //   if (answer.action === "Edit") {
      //     const x = await inquirer.prompt([
      //       {
      //         type: "editor",
      //         default: output,
      //         name: "Edit",
      //       },
      //     ]);
      //   } else if (answer.action === "Chat") {
      //     const x = await inquirer.prompt([
      //       {
      //         type: "input",
      //         name: "Next Message",
      //       },
      //     ]);
      //     if (x["Next Message"]) {
      //       this.extraMessages.push({
      //         role: "user",
      //         content: x["Next Message"],
      //       });
      //     }
      //   }
      // }
      return [
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
            // TODO: need a generic callApi fn for this
            // const results = await Promise.all(
            //   _.range(0, n).map(async () => {
            //     prompt.run({});
            //   })
            // );
          },
        }, // times: default 1
        {type: "edit",
        "chat",
        "save",
        { type: "prompt", name: "input schema" },
        "output schema",
      ];
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
