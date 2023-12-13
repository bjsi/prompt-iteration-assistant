import * as promptfoo from "promptfoo";
import { ZodObject, ZodType, z } from "zod";
import { ChatCompletionMessageParam } from "openai/resources";
import zodToJsonSchema from "zod-to-json-schema";
import { Command } from "commander";
import inquirer from "inquirer";
// @ts-ignore
import searchlist from "inquirer-search-list";
import dotenv from "dotenv";
import { OPENAI_CHAT_MODEL, OPENAI_INSTRUCT_MODEL } from "../openai/models";
import {
  functionCallTestOptions,
  plainTextTestOptions,
} from "../promptfoo/options";
import { assertJSON, assertValidSchema } from "../promptfoo/assertions";
import { chatMessagesToInstructPrompt } from "../openai/messages";
import {
  OpenAIChatMessage,
  OpenAICompletionModel,
  StructureStreamPart,
  ZodSchema,
  generateStructure,
  generateText,
  openai,
  streamStructure,
  streamText,
} from "modelfusion";
import * as _ from "remeda";
import { toCamelCase } from "../helpers/stringUtils";
import chalk from "chalk";
import { CandidatePrompt } from "./candidatePrompt";
import { getValuesForSchema as askUserForValuesForSchema } from "./getValuesForSchema";
import { CREATE_NEW_TEST } from "../prompts/createNewTest";
import { sleep } from "openai/core";
import { searchList } from "../prompts/actions";
import { PromptController } from "./promptController";

dotenv.config();
inquirer.registerPrompt("search-list", searchlist);

export type ExampleDataSet<T extends ZodType> = {
  [key in keyof z.infer<T>]: {
    name: string;
    value: z.infer<T>[key];
  };
};

export interface Action<Output> {
  name: string;
  action: () => Promise<Output>;
  enabled?: () => boolean;
}

export interface CLIOptions<
  InputSchema extends ZodObject<any>,
  OutputSchema extends ZodType | undefined = undefined,
  State extends {} = Record<string, any>
> {
  formatChatMessage?: (message: ChatCompletionMessageParam) => any;
  inputKeyToCLIPrompt?: (key: keyof z.infer<InputSchema>) => string;
  getNextActions?: (
    prompt: Prompt<InputSchema, OutputSchema, State>
  ) => Promise<Action<any>[]>;
}

interface PromptArgs<
  InputSchema extends ZodObject<any> = ZodObject<any>,
  OutputSchema extends ZodType | undefined = undefined,
  State extends {} = Record<string, any>
> {
  /**
   * The human readable name of the prompt.
   * This is turned into camelCase and used as the name of the OpenAI function_call.
   */
  name: string;
  /**
   * The human readable description of the prompt.
   * This is used as the description of the OpenAI function_call.
   */
  description?: string;
  /**
   * An array of candidate prompts.
   * When you run tests, each prompt is compiled with the test's prompt variables and evaluated.
   * The first prompt in the array is considered the "main" prompt.
   */
  prompts: CandidatePrompt<z.infer<InputSchema>>[];
  /**
   * Zod schema for the prompt's input variables.
   */
  input?: InputSchema;
  /**
   * Optional Zod schema for the prompt's output variables.
   * This is used for parameters in the OpenAI function_call.
   */
  output?: OutputSchema;
  /**
   * Array of example data to use in CLI runs and tests.
   */
  exampleData?: ExampleDataSet<InputSchema>[];
  /**
   * Don't suggest example data in the CLI when picking input values.
   */
  dontSuggestExampleData?: boolean;
  /**
   * Options to help you build CLI dialogs with the prompt.
   */
  cliOptions?: CLIOptions<InputSchema, OutputSchema, State>;
  /**
   * Prompt controller that this prompt is registered to if any.
   */
  promptController?: PromptController<any>;
  /**
   * Prompt state that is persisted between CLI dialog actions.
   * This is useful for storing messages and other data.
   */
  state: State;

  /**
   * Initial values for the prompt's input variables.
   * Partial because the user can fill in the rest of the values in the CLI dialog.
   */
  vars?: Partial<z.infer<InputSchema>>;

  //
  // LLM parameters

  model: OPENAI_CHAT_MODEL | OPENAI_INSTRUCT_MODEL;
  temperature?: number;
  max_tokens?: number;
}

export class Prompt<
  InputSchema extends ZodObject<any>,
  OutputSchema extends ZodType | undefined = undefined,
  State extends {} = Record<string, any>
> implements PromptArgs<InputSchema, OutputSchema, State>
{
  name: string;
  description?: string;
  cliOptions?: CLIOptions<InputSchema, OutputSchema, State>;

  prompts: CandidatePrompt<z.infer<InputSchema>>[];
  /**
   * Array of example data to use for CLI runs or testing.
   */
  exampleData: ExampleDataSet<InputSchema>[];
  dontSuggestExampleData?: boolean | undefined;
  model: OPENAI_CHAT_MODEL | OPENAI_INSTRUCT_MODEL;
  input?: InputSchema;
  output?: OutputSchema;

  promptController?: PromptController<any> | undefined;

  temperature?: number;
  max_tokens?: number;

  state: State;
  vars: Partial<z.infer<InputSchema>> = {};

  private extraMessages: ChatCompletionMessageParam[] = [];
  private tests: promptfoo.EvaluateTestSuite[] = [];

  constructor(args: PromptArgs<InputSchema, OutputSchema, State>) {
    this.name = args.name;
    this.output = args.output;
    this.input = args.input;
    this.description = args.description;
    if (this.description) {
      this.input?.describe(this.description);
    }
    this.prompts = args.prompts;
    this.model = args.model;
    this.exampleData = args.exampleData || [];
    this.cliOptions = args.cliOptions;
    this.state = args.state;
    this.vars = args.vars || {};
    this.dontSuggestExampleData = args.dontSuggestExampleData;
  }

  withTest = (
    name: string,
    promptVars: z.infer<InputSchema>,
    ...asserts: ((
      output: OutputSchema extends ZodType<infer U> ? U : string | null
    ) => {
      pass: boolean;
      score: number;
      reason: string;
    })[]
  ) => {
    const options = this.output
      ? functionCallTestOptions({
          prompts: this.prompts.map((prompt) =>
            prompt.withVariables(promptVars).compile()
          ),
          functions: [
            {
              name: toCamelCase(this.name),
              description: this.description,
              parameters: zodToJsonSchema(this.output),
            },
          ],
          model: this.model,
        })
      : plainTextTestOptions({
          prompts: this.prompts.map((prompt) =>
            prompt.withVariables(promptVars).compile()
          ),
          model: this.model,
        });
    const defaultAsserts = this.output ? [assertValidSchema(this.output)] : [];
    const test: promptfoo.EvaluateTestSuite = {
      ...options,
      description: name,
      tests: [
        {
          vars: {
            ...promptVars,
          },
          assert: [
            ...defaultAsserts,
            ...(this.output
              ? asserts.map((a) => assertJSON(this.output!, a))
              : asserts.map((a) => ({
                  type: "javascript" as const,
                  value: (output: string) => {
                    return a(output as any);
                  },
                }))),
          ],
        },
      ],
    };

    this.tests.push(test);
    return this;
  };

  askUserForValuesForInputSchema = async () => {
    if (!this.input) {
      return {};
    }
    return await askUserForValuesForSchema({
      name: this.name,
      schema: this.input,
      existingVariables: this.vars,
      exampleData: this.dontSuggestExampleData ? [] : this.exampleData,
      prompt: chatMessagesToInstructPrompt({
        messages: this.prompts[0].raw().compile(),
        attributes: {
          name: this.name,
          description: this.description,
        },
      }),
      formatKey: this.cliOptions?.inputKeyToCLIPrompt,
    });
  };

  /**
   * Each `Prompt` contains its own `nextAction` handlers, but all of them require
   * filling out the `input` schema first, so this method fills out the input schema
   * before calling the `nextAction` handler.
   */
  private runLoop = async () => {
    // this.vars = await this.askUserForValuesForInputSchema();
    let nextActionName: string | undefined = undefined;
    console.clear();
    while (nextActionName !== "done" && nextActionName !== "exit") {
      // get the list of nextActions from the prompt's cliOptions or provide default options
      const nextActions = await this.cliOptions?.getNextActions?.(this);
      const { action } = await inquirer.prompt([
        {
          type: "search-list",
          name: "action",
          message: "Select an option:",
          choices: (nextActions || [])?.map((x) => x.name) || ["run"],
        },
      ]);
      nextActionName = action;
      if (nextActionName) {
        const nextAction = nextActions?.find((x) => x.name === nextActionName);
        if (nextAction) {
          await nextAction.action();
        }
      }
    }
  };

  async cli(mode?: "test" | "run") {
    const schema = z.union([
      z.object({
        test: z.string().optional(),
      }),
      z.object({
        ui: z.string().optional(),
      }),
    ]);
    const program = new Command();

    program.option("-t, --test <name>", "run a test").parse(process.argv);
    program.option("-u, --ui <name>", "open webui").parse(process.argv);
    program.option("-r, --run", "run the prompt").parse(process.argv);

    const opts = schema.parse({
      ...program.opts(),
    });
    if (Object.keys(opts).length === 0) {
      console.clear();
      const choices = _.compact([
        "run",
        this.tests.length > 0 && "test",
        this.promptController && "back",
        "quit",
      ]);

      if (
        choices.filter((x) => !["quit", "back"].some((choice) => choice === x))
          .length === 1 ||
        mode === "run"
      ) {
        await this.runLoop();
        return;
      } else {
        console.log(`${chalk.green(this.name)} ${`(${this.description})`}`);
        console.log("Would you like to run or test this prompt?");
      }

      const answer = mode
        ? { action: mode }
        : await inquirer.prompt<{ action: "run" | "test" }>([
            {
              type: "search-list",
              name: "action",
              message: "Options:",
              choices,
            },
          ]);

      // Handle the selected option
      if (answer.action === "test") {
        const test = await inquirer.prompt([
          {
            type: "search-list",
            name: "test",
            message: "Select a test:",
            choices: [
              "all",
              ...this.tests.map((test) => test.description),
              CREATE_NEW_TEST,
            ],
          },
        ]);
        if (test.test === "all") {
          await this.test();
        } else if (test.test === CREATE_NEW_TEST) {
          console.log("TODO: create new test");
          await sleep(5_000);
          this.cli();
        } else {
          await this.test(test.test);
        }
      } else if (answer.action === "run") {
        await this.runLoop();
      } else if (answer.action === "back") {
        this.promptController?.cli();
      } else {
        return;
      }
    }
  }

  async test(args?: { name?: string }) {
    const skipCache = await confirm("Skip cache?");
    const tests = this.tests.filter(
      (test) => !args?.name || test.description === args.name
    );
    if (!tests.length) {
      console.log(`No test found`);
      return;
    }
    for (const test of tests) {
      console.log(`Running test ${test.description}`);
      const results = await promptfoo.evaluate(
        {
          ...test,
          env: {
            OPENAI_API_KEY: process.env.OPENAI_API_KEY,
          },
        },
        {
          maxConcurrency: 2,
          showProgressBar: true,
          cache: skipCache,
        }
      );
      for (let i = 0; i < results.table.head.prompts.length; i++) {
        const prompt = results.table.head.prompts[i];
        prompt.display = `Prompt: ${this.prompts[i].name}`;
      }
      console.log(promptfoo.generateTable(results, 4000).toString());
      const choice = await searchList({
        message: "Select an action:",
        choices: ["run again", "edit", "back", "home", "quit"],
      });
      if (choice === "run again") {
        await this.test(args);
      } else if (choice === "edit") {
        await this.cli("run");
      } else if (choice === "back") {
        await this.cli("test");
      } else if (choice === "home") {
        await this.cli();
      } else if (choice === "quit") {
        process.exit(0);
      }
    }
  }

  async run(args: {
    promptVariables: z.infer<InputSchema>;
    stream: true;
    verbose?: boolean;
    abortSignal?: AbortSignal;
  }): Promise<
    OutputSchema extends ZodType<infer U>
      ? AsyncIterable<StructureStreamPart<U>>
      : AsyncIterable<string>
  >;
  async run(args: {
    promptVariables: z.infer<InputSchema>;
    stream: false;
    verbose?: boolean;
    abortSignal?: AbortSignal;
  }): Promise<OutputSchema extends ZodType<infer U> ? U : string | null>;
  async run(args: {
    promptVariables: z.infer<InputSchema>;
    stream: boolean;
    verbose?: boolean;
    abortSignal?: AbortSignal;
  }): Promise<any> {
    const promptVars = this.input?.parse(args.promptVariables) || {};
    const messages = this.prompts[0]
      .withVariables(promptVars)
      .compile()
      .concat(this.extraMessages);
    if (args.verbose) {
      console.log("model:", this.model);
      if (this.model === "gpt-3.5-turbo-instruct") {
        console.log(chatMessagesToInstructPrompt({ messages }));
      } else {
        console.log(messages);
      }
    }

    if (!this.output || this.model === "gpt-3.5-turbo-instruct") {
      const config =
        this.model === "gpt-3.5-turbo-instruct"
          ? openai.CompletionTextGenerator({
              model: "gpt-3.5-turbo-instruct",
              temperature: this.temperature,
              maxCompletionTokens: this.max_tokens,
            })
          : openai.ChatTextGenerator({
              model: this.model,
              temperature: this.temperature,
              maxCompletionTokens: this.max_tokens,
            });
      if (args.stream) {
        const stream = await streamText(
          config as any,
          config instanceof OpenAICompletionModel
            ? chatMessagesToInstructPrompt({ messages })
            : messages,
          { run: { abortSignal: args.abortSignal } }
        );
        return stream;
      } else {
        const text = await generateText(
          config as any,
          config instanceof OpenAICompletionModel
            ? chatMessagesToInstructPrompt({ messages })
            : messages,
          { run: { abortSignal: args.abortSignal } }
        );
        return text;
      }
    } else {
      const config = openai
        .ChatTextGenerator({
          model: this.model,
          temperature: this.temperature,
          maxCompletionTokens: this.max_tokens,
        })
        .asFunctionCallStructureGenerationModel({
          fnName: toCamelCase(this.name),
          fnDescription: this.description,
        });
      if (args.stream) {
        const stream = await streamStructure(
          config,
          new ZodSchema(this.output),
          messages as OpenAIChatMessage[],
          { run: { abortSignal: args.abortSignal } }
        );
        return stream;
      } else {
        return await generateStructure(
          config,
          new ZodSchema(this.output),
          messages as OpenAIChatMessage[],
          { run: { abortSignal: args.abortSignal } }
        );
      }
    }
  }
}
