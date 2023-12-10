import { ZodObject, z } from "zod";
import { Action, ExampleDataSet, Prompt } from "../lib/prompt";
import { ChatMessage } from "../openai/messages";
import inquirer from "inquirer";
import * as _ from "remeda";
import { edit } from "./actions";
import { ChatCompletionMessageParam } from "openai/resources";
import {
  highlightJSON,
  highlightTS,
  printChatMessages,
  printZodSchema,
} from "../helpers/printUtils";
import {
  generateConcurrently,
  generateTextConcurrently,
} from "../openai/runConcurrent";
import { createOutputSchema } from "./createOutputSchema";
import { toCamelCase } from "../helpers/stringUtils";
import { sleep } from "openai/core";
import { writeFileSync } from "fs";
import { createInputSchema } from "./createInputSchema";
import { CandidatePrompt } from "../lib/candidatePrompt";
import { createZodSchema } from "../helpers/zodUtils";
import { generateText, openai, streamText } from "modelfusion";

const input = z.object({
  goal: z.string(),
});

interface BuildPromptState {
  currentPrompt?: string;
  feedback?: ChatCompletionMessageParam[];
  inputSchema?: ZodObject<any>;
  outputSchema?: ZodObject<any>;
  promptWeAreBuilding?: Prompt<any, any, any>;
}

/**
 * This is a prompt which uses ChatGPT to help you create or build upon a ChatGPT prompt.
 * It's a bit meta :)
 */
export const buildPrompt = (args?: {
  state?: Partial<BuildPromptState>;
  vars?: Partial<z.infer<typeof input>>;
}) =>
  new Prompt<typeof input, undefined, BuildPromptState>({
    state: args?.state || {},
    vars: args?.vars || {},
    name: "Create Prompt",
    description: "Create a ChatGPT prompt to solve the user's task",
    input,
    model: "gpt-4",
    cliOptions: {
      getNextActions: async (prompt, initialMessages) => {
        console.clear();
        if (prompt.state.currentPrompt) {
          if (prompt.state.inputSchema) {
            await printZodSchema({
              schema: prompt.state.inputSchema,
              name: "Input",
            });
          }
          if (prompt.state.outputSchema) {
            await printZodSchema({
              schema: prompt.state.outputSchema,
              name: "Output",
            });
          }
          printChatMessages({
            messages: [ChatMessage.assistant(prompt.state.currentPrompt)],
          });
        } else {
          printChatMessages({ messages: initialMessages, hideSystem: true });
        }

        const updateCurrentPrompt = async (newPrompt: string) => {
          prompt.state.currentPrompt = newPrompt;
          if (
            !newPrompt.includes("${") ||
            newPrompt === prompt.state.currentPrompt
          ) {
            return;
          }
          // todo: optimize by only running this if the variables have changed
          const inputSchemaPrompt = createInputSchema();
          const inputSchemaText = await inputSchemaPrompt.run({
            promptVariables: {
              rawPrompt: newPrompt,
            },
            stream: false,
          });
          if (inputSchemaText) {
            const schema = createZodSchema(inputSchemaText);
            if (schema) {
              prompt.state.inputSchema = schema;
            }
          }
        };

        const actions: Action<any>[] = [
          {
            name: "generate variations",
            action: async () => {
              const controller = new AbortController();
              const numCalls = await inquirer.prompt([
                {
                  type: "number",
                  name: "n_times",
                  message:
                    "How many prompt variations should I generate? (default 1)",
                  default: 1,
                },
              ]);
              const n = Math.min(Math.max(parseInt(numCalls.n_times), 0), 5);
              console.clear();
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
                  return generateTextConcurrently({
                    messages: initialMessages as ChatMessage[],
                    numCalls: n,
                    abortSignal: controller.signal,
                  });
                })(),
              ]);
              controller.abort();
              if (!Array.isArray(results) || results.length === 0) {
                return;
              } else if (results.length === 1) {
                await updateCurrentPrompt(results[0]);
              } else if (results.length > 1) {
                // pick which result to use
                const choices = [
                  ...results.map((_, i) => ({
                    name: `Result #${i + 1}`,
                    value: i,
                  })),
                  { name: "retry", value: "retry" },
                  { name: "cancel", value: "cancel" },
                ];
                const { favorite } = await inquirer.prompt([
                  {
                    type: "list",
                    name: "favorite",
                    message: "Which prompt is your favorite?",
                    choices,
                  },
                ]);
                if (favorite === "retry") {
                  return await actions[0].action();
                } else if (favorite === "cancel") {
                  return;
                } else {
                  const idx = parseInt(favorite);
                  const result = results[idx] as string;
                  updateCurrentPrompt(result);
                }
              }
            },
          },
          {
            name: "test run",
            enabled: () => !!prompt.state.currentPrompt,
            action: async () => {
              if (!prompt.state.currentPrompt) {
                return;
              }

              const promptWeAreBuilding = prompt.state.promptWeAreBuilding;
              if (!promptWeAreBuilding) {
                return;
              }

              const inputVariables =
                (await promptWeAreBuilding?.askUserForValuesForInputSchema()) ||
                {};

              const answer = await inquirer.prompt([
                {
                  type: "number",
                  name: "n_times",
                  message:
                    "How many times should I run the prompt? (default 1)",
                  default: 1,
                },
              ]);

              const numCalls = Math.min(
                Math.max(parseInt(answer.n_times), 0),
                5
              );
              const controller = new AbortController();
              const llmArgs = {
                promptVariables: inputVariables,
                abortSignal: controller.signal,
              };
              const results = await Promise.race([
                inquirer.prompt([
                  {
                    type: "confirm",
                    name: "cancel",
                    message: `Stop Generation?`,
                  },
                ]),
                generateConcurrently({
                  stream: () =>
                    Promise.resolve(
                      (async function* () {
                        const stream = await promptWeAreBuilding.run({
                          ...llmArgs,
                          stream: true,
                        });

                        for await (const part of stream) {
                          if (typeof part === "string") {
                            yield part;
                          } else {
                            yield highlightJSON(JSON.stringify(part, null, 2));
                          }
                        }
                      })()
                    ),
                  generate: async () => {
                    const res = await promptWeAreBuilding.run({
                      ...llmArgs,
                      stream: false,
                    });
                    if (typeof res === "string") {
                      return res;
                    } else {
                      return highlightJSON(JSON.stringify(res, null, 2));
                    }
                  },
                  numCalls,
                }),
              ]);
              controller.abort();
              console.log(results);
            },
          },
          edit({
            input: prompt.state.currentPrompt || "",
            onSaved: (updatedPrompt) => {
              if (!updatedPrompt) {
                return;
              }
              updateCurrentPrompt(updatedPrompt);
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

              const controller = new AbortController();
              // todo: cancellation
              const response = await generateTextConcurrently({
                messages: messages as ChatMessage[],
                numCalls: 1,
                abortSignal: controller.signal,
              });
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
            name: "output schema",
            enabled: () => !!prompt.state.currentPrompt,
            action: async () => {
              const outputSchemaPrompt = createOutputSchema();
              await outputSchemaPrompt.cli("run");
              const outputSchemaText = outputSchemaPrompt.state.schema;
              if (outputSchemaText) {
                const schema = createZodSchema(outputSchemaText);
                if (schema) {
                  prompt.state.outputSchema = schema;
                }
              }
            },
          },
          {
            name: "save",
            enabled: () => !!prompt.state.currentPrompt,
            async action() {
              const name = "New Prompt";
              const description = "Prompt Description";
              const exampleData: ExampleDataSet<any>[] = [];

              const code = `
import { z } from "zod";

${prompt.state.inputSchema || ""}

${prompt.state.outputSchema || ""}

interface ${name.replace(/ /g, "")}State { }

export const ${toCamelCase(name)} = new Prompt<
  typeof input,
  ${prompt.state.outputSchema ? "typeof output" : "undefined"},
  ${toCamelCase(name)}State
>({
  state: {},
  name: "${name}",
  description: "${description}",
  input,
  model: "gpt-4",
  prompts: [
    {
      name: "new",
      compile: (vars) => [
        ChatMessage.system(\`${prompt.state.currentPrompt}\`)
      ]
    }
  ],
  exampleData: ${JSON.stringify(exampleData, null, 2)},
});

if (require.main === module) {
  ${toCamelCase(name)}.runCLI();
}`;
              console.log("Saving to prompt.ts");
              console.log(highlightTS(code));
              await sleep(2000);
              writeFileSync("prompt.ts", code);
            },
          },
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
        } else {
          return key;
        }
      },
    },
    prompts: [
      new CandidatePrompt<z.infer<typeof input>>({
        name: "sr-prompt-engineer",
        compile: function () {
          return [
            ChatMessage.system(
              `
- You are a ChatGPT prompt engineer helping a user create a ChatGPT system instructions prompt.
- Your role is to write a ChatGPT system instructions prompt to achieve the user's goal.
- Create a very concise system prompt instructions for ChatGPT tailored to the user's specific needs.
- Don't include examples in the prompt.
- If the prompt requires input variables, use the following format: \${variableName}.
- Format the prompt using markdown.
`.trim()
            ),
            ChatMessage.user(
              `
# The goal of the prompt
- ${this.getVariable("goal")}
`.trim()
            ),
          ];
        },
      }),
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

if (require.main === module) {
  const bp = buildPrompt();

  bp.withTest("flashcard assistant", {
    goal: bp.exampleData[0].goal.value,
  });

  bp.cli("test");
}
