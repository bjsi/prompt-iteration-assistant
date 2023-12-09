import { z } from "zod";
import { Action, Prompt } from "../prompt";
import { ChatMessage } from "../openai/messages";
import inquirer from "inquirer";
import * as _ from "remeda";
import { edit } from "./actions";
import { ChatCompletionMessageParam } from "openai/resources";
import { printChatMessages, printMarkdown } from "../helpers/printUtils";
import { runConcurrent } from "../openai/runConcurrent";
import { createSchema } from "./createSchema";

const input = z.object({
  goal: z.string(),
  idealOutput: z.string().optional(),
});

interface CreatePromptState {
  currentPrompt?: string;
  feedback?: ChatCompletionMessageParam[];
  inputSchema?: string;
  outputSchema?: string;
}

/**
 * This is a prompt which uses ChatGPT to help you create a ChatGPT prompt. It's a bit meta :)
 */
export const createPrompt = new Prompt<
  typeof input,
  undefined,
  CreatePromptState
>({
  state: {},
  name: "Create Prompt",
  description: "Create a ChatGPT prompt to solve the user's task",
  input,
  model: "gpt-4",
  cliOptions: {
    getNextActions: (prompt, initialMessages) => {
      console.clear();
      printChatMessages({ messages: initialMessages, hideSystem: true });
      if (prompt.state.currentPrompt) {
        printChatMessages({
          messages: [ChatMessage.assistant(prompt.state.currentPrompt)],
        });
      }
      const actions: Action<any>[] = [
        {
          name: "create prompt",
          action: async () => {
            const controller = new AbortController();
            const results = await Promise.race([
              inquirer.prompt([
                {
                  type: "confirm",
                  name: "cancel",
                  message: `Stop Generation`,
                },
              ]),
              (() => {
                console.log();
                return runConcurrent(initialMessages, 1, controller.signal);
              })(),
            ]);
            controller.abort();
            if (!Array.isArray(results) || results.length === 0) {
              return;
            } else if (results.length === 1) {
              prompt.state.currentPrompt = results[0];
            } else if (results.length > 1) {
              // pick which result to use
              const { favorite } = await inquirer.prompt([
                {
                  type: "list",
                  name: "favorite",
                  message: "Which prompt is your favorite?",
                  choices: results.map((_, i) => ({
                    name: `Result #${i + 1}`,
                    value: i,
                  })),
                },
              ]);
              const result = results[parseInt(favorite)] as string;
              prompt.state.currentPrompt = result;
            }
          },
        },
        {
          name: "test prompt",
          enabled: () => !!prompt.state.currentPrompt,
          action: async () => {
            if (!prompt.state.currentPrompt) {
              return;
            }
            // get inputs

            const answer = await inquirer.prompt([
              {
                type: "number",
                name: "n_times",
                message: "How many times should I run the prompt? (default 1)",
                default: 1,
              },
            ]);

            const numCalls = Math.min(Math.max(parseInt(answer.n_times), 0), 5);
            const controller = new AbortController();
            const results = await Promise.race([
              inquirer.prompt([
                {
                  type: "confirm",
                  name: "cancel",
                  message: `Stop Generation?`,
                },
              ]),
              runConcurrent(
                // todo: compile prompt
                [ChatMessage.user(prompt.state.currentPrompt!)],
                numCalls
              ),
            ]);
            controller.abort();
            console.log(results);
          },
        },
        edit({
          input: prompt.state.currentPrompt || "",
          onSaved: (updatedPrompt) => {
            prompt.state.currentPrompt = updatedPrompt;
          },
        }),
        {
          name: "feedback",
          enabled: () => !!prompt.state.currentPrompt,
          async action() {
            if (!prompt.state.currentPrompt) {
              return;
            }
            const answer = await inquirer.prompt([
              {
                type: "input",
                name: "feedback",
                message: "Feedback for the prompt engineer:",
              },
            ]);
            const messages: ChatCompletionMessageParam[] = [
              ...initialMessages,
              ChatMessage.assistant(prompt.state.currentPrompt!),
              ChatMessage.user(answer.feedback),
            ];
            const response = await runConcurrent(messages, 1);
            const revisedPrompt = response[0];
            const confirm = await inquirer.prompt([
              {
                type: "confirm",
                name: "confirm",
                message: "Keep the revised prompt?",
              },
            ]);
            if (confirm.confirm) {
              prompt.state.currentPrompt = revisedPrompt;
            }
          },
        },
        {
          name: "input schema",
          enabled: () => !!prompt.state.currentPrompt,
          action: async () => {
            const schemaPrompt = createSchema("input");
            await schemaPrompt.runCLI("run");
            prompt.state.inputSchema = schemaPrompt.state.schema;
          },
        },
        {
          name: "output schema",
          enabled: () => !!prompt.state.currentPrompt,
          action: async () => {
            const schemaPrompt = createSchema("output");
            await schemaPrompt.runCLI("run");
            prompt.state.inputSchema = schemaPrompt.state.schema;
          },
        },
        { name: "save", async action() {} },
        {
          name: "quit",
          async action() {
            process.exit(0);
          },
        },
      ].filter((a) => a.enabled?.() ?? true);
      return actions;
    },
    inputKeyToCLIPrompt(key) {
      if (key === "goal") {
        return "Goal of the prompt:";
      } else if (key === "idealOutput") {
        return "Ideal output:";
      } else {
        return key;
      }
    },
  },
  prompts: [
    {
      name: "sr-prompt-engineer",
      compile: (vars) => [
        ChatMessage.system(
          `
- You are a ChatGPT prompt engineer helping a user create a ChatGPT system instructions prompt.
- Your role is to write a ChatGPT system instructions prompt to achieve the user's goal.
- Create very concise system prompt instructions for ChatGPT tailored to the user's specific needs.
- Don't include examples in the prompt.
- If the prompt requires input variables, use the following format: \${variableName}.
- Format the prompt using markdown.
`.trim()
        ),
        ChatMessage.user(
          `
The goal of the prompt is ${vars.goal}.
`.trim()
        ),
      ],
    },
  ],
  exampleData: [
    {
      goal: {
        name: "notes to flashcards",
        value: "To generate flashcards for me from my notes",
      },
    },
  ],
});

createPrompt.withTest("flashcard assistant", {
  goal: createPrompt.exampleData[0].goal.value,
});

if (require.main === module) {
  const mode = process.argv[2];
  createPrompt.runCLI(mode as any);
}
