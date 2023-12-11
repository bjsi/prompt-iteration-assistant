import { z } from "zod";
import { Action, ExampleDataSet, Prompt } from "../lib/prompt";
import {
  ChatMessage,
  chatMessagesToInstructPrompt,
  instructPromptToChatMessages,
} from "../openai/messages";
import inquirer from "inquirer";
import * as _ from "remeda";
import { edit } from "./actions";
import { ChatCompletionMessageParam } from "openai/resources";
import {
  highlightJSON,
  highlightTS,
  printChatMessages,
  printMarkdownInBox,
  printPrompt,
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
import chalk from "chalk";
import { substituteChatPromptVars } from "../lib/substitutePromptVars";

const input = z.object({
  goal: z.string(),
});

interface BuildPromptState {
  feedback?: ChatCompletionMessageParam[];
  currentPrompt?: Prompt<any, any, any>;
}

export const CREATE_NEW_PROMPT = "New Prompt";

/**
 * This is a prompt which uses ChatGPT to help you create or edit a ChatGPT prompt.
 * It's a bit meta :)
 */
export const buildPrompt = (args?: {
  state?: Partial<BuildPromptState>;
  vars?: Partial<z.infer<typeof input>>;
}) =>
  new Prompt<typeof input, undefined, BuildPromptState>({
    state: args?.state || {},
    vars: args?.vars || {},
    name: CREATE_NEW_PROMPT,
    description: "Create a ChatGPT prompt to solve the user's task",
    input,
    model: "gpt-4",
    cliOptions: {
      getNextActions: async (prompt, initialMessages) => {
        console.clear();
        const curPrompt = prompt.state.currentPrompt;
        if (curPrompt) {
          if (curPrompt.input) {
            await printZodSchema({
              schema: curPrompt.input,
              name: "Input",
            });
          }
          if (curPrompt.output) {
            await printZodSchema({
              schema: curPrompt.output,
              name: "Output",
            });
          }
          printPrompt(curPrompt.prompts[0].raw().compile() as ChatMessage[]);
        } else {
          printMarkdownInBox(
            `- No prompt generated.\n- Run the ${chalk.green(
              "generate variations"
            )} command or ${chalk.green("edit")} one manually.`,
            chalk.green("Prompt")
          );
          printChatMessages({ messages: initialMessages, hideSystem: true });
        }

        const updateCurrentPrompt = async (newPromptText: string) => {
          const oldPrompt = prompt.state.currentPrompt?.prompts[0];
          if (!prompt.state.currentPrompt) {
            prompt.state.currentPrompt = new Prompt({
              state: {},
              name: "New Prompt",
              description: "New Prompt",
              model: "gpt-4",
              prompts: [],
            });
          }
          const curPrompt = prompt.state.currentPrompt;
          const newPromptMessages = instructPromptToChatMessages(newPromptText);
          curPrompt.prompts[0] = new CandidatePrompt({
            name: "generated",
            compile: function () {
              if (this._raw) {
                return newPromptMessages;
              } else {
                return substituteChatPromptVars(
                  newPromptMessages,
                  this.variables
                );
              }
            },
          });

          const newPromptVars =
            curPrompt.prompts[0].getAllVariablePlaceholders();
          const oldPromptVars = oldPrompt?.getAllVariablePlaceholders() || [];
          const difference = _.difference(newPromptVars, oldPromptVars);
          if (difference.length < 1) {
            return;
          }
          console.log("Prompt Variables: ", newPromptVars);
          console.log("Generating input schema...");
          const inputSchemaPrompt = createInputSchema();
          const inputSchemaText = await inputSchemaPrompt.run({
            promptVariables: {
              rawPrompt: newPromptText,
            },
            stream: false,
          });
          if (inputSchemaText) {
            const schema = createZodSchema(inputSchemaText);
            if (schema) {
              curPrompt.input = schema;
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
              let results = await Promise.race([
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
                console.clear();
                printChatMessages({
                  messages: instructPromptToChatMessages(
                    `# System\n` + results[0]
                  ),
                });
                const choices = [
                  { name: "accept", value: "accept" },
                  { name: "retry", value: "retry" },
                  { name: "cancel", value: "cancel" },
                ];
                const choice = await inquirer.prompt([
                  {
                    type: "list",
                    name: "choice",
                    message: "Accept this prompt?",
                    choices,
                  },
                ]);
                if (choice.choice === "accept") {
                  await updateCurrentPrompt("# System\n" + results[0]);
                } else if (choice.choice === "retry") {
                  return await actions[0].action();
                } else {
                  return;
                }
              } else if (results.length > 1) {
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

                  await updateCurrentPrompt("# System\n" + result);
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

              const promptBeingEdited = prompt.state.currentPrompt;
              const inputVariables = prompt.state.currentPrompt
                ? await promptBeingEdited?.askUserForValuesForInputSchema()
                : {};

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
                promptBeingEdited
                  ? generateConcurrently({
                      stream: () =>
                        Promise.resolve(
                          (async function* () {
                            const stream = await promptBeingEdited.run({
                              ...llmArgs,
                              stream: true,
                            });

                            for await (const part of stream) {
                              if (typeof part === "string") {
                                yield part;
                              } else {
                                yield highlightJSON(
                                  JSON.stringify(part, null, 2)
                                );
                              }
                            }
                          })()
                        ),
                      generate: async () => {
                        const res = await promptBeingEdited.run({
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
                    })
                  : // todo: wrong because we may have created an output schema
                    generateTextConcurrently({
                      messages: initialMessages as ChatMessage[],
                      numCalls,
                      abortSignal: controller.signal,
                    }),
              ]);
              controller.abort();
              await inquirer.prompt([
                {
                  type: "confirm",
                  name: "cancel",
                  message: `Continue`,
                },
              ]);
            },
          },
          edit({
            input: chatMessagesToInstructPrompt(
              prompt.state.currentPrompt?.prompts?.[0]?.raw().compile() || [
                ChatMessage.system("## Instructions:"),
              ]
            ),
            onSaved: async (updatedPrompt) => {
              if (!updatedPrompt) {
                return;
              }
              await updateCurrentPrompt(updatedPrompt);
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
                ChatMessage.assistant(
                  chatMessagesToInstructPrompt(
                    prompt.state.currentPrompt.prompts[0].raw().compile()
                  )
                ),
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
                await updateCurrentPrompt(revisedPrompt);
              }
            },
          },
          {
            name: "output schema",
            enabled: () => !!prompt.state.currentPrompt,
            action: async () => {
              if (!prompt.state.currentPrompt) {
                return;
              }
              const outputSchemaPrompt = createOutputSchema();
              await outputSchemaPrompt.cli("run");
              const outputSchemaText = outputSchemaPrompt.state.schema;
              if (outputSchemaText) {
                const schema = createZodSchema(outputSchemaText);
                if (schema) {
                  prompt.state.currentPrompt.output = schema;
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

${prompt.state.currentPrompt?.input || ""}

${prompt.state.currentPrompt?.output || ""}

interface ${name.replace(/ /g, "")}State { }

export const ${toCamelCase(name)} = new Prompt<
  typeof input,
  ${prompt.state.currentPrompt?.output ? "typeof output" : "undefined"},
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

              function removeDuplicateEmptyLines(code: string): string {
                const lines = code.split("\n");
                const newLines: string[] = [];
                let lastLine = "";

                for (let i = 0; i < lines.length; i++) {
                  const line = lines[i];
                  if (line === "" && lastLine === "") {
                    continue;
                  }
                  newLines.push(line);
                  lastLine = line;
                }

                return newLines.join("\n");
              }
              const cleanCode = removeDuplicateEmptyLines(code);

              console.log("Saving to prompt.ts");
              console.log(highlightTS(cleanCode));
              await sleep(2000);
              writeFileSync("prompt.ts", cleanCode);
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
- Format the instructions using a markdown list.
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
