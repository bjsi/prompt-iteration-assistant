import * as promptfoo from "promptfoo";
import { ZodObject, ZodType, z } from "zod";
import {
  ChatCompletionMessage,
  ChatCompletionMessageParam,
} from "openai/resources";
import zodToJsonSchema from "zod-to-json-schema";
import { Command } from "commander";
import inquirer from "inquirer";
// @ts-ignore
import searchlist from "inquirer-search-list";
import dotenv from "dotenv";
import {
  OPENAI_CHAT_MODEL_NAME,
  OPENAI_INSTRUCT_MODEL_NAME,
} from "../openai/models";
import {
  ModelParams,
  customTestOptions,
  functionCallTestOptions,
  plainTextTestOptions,
} from "../promptfoo/options";
import { assertJSON, assertValidSchema } from "../promptfoo/assertions";
import { ChatMessage, chatMessagesToInstructPrompt } from "../openai/messages";
import {
  OPENAI_CHAT_MODELS,
  OPENAI_TEXT_GENERATION_MODELS,
  OpenAIChatMessage,
  OpenAICompletionModel,
  Run,
  StructureStreamPart,
  ZodSchema,
  countOpenAIChatPromptTokens,
  countTokens,
  generateStructure,
  generateText,
  openai,
  streamStructure,
  streamText,
} from "modelfusion";
import * as _ from "remeda";
import { toCamelCase } from "../helpers/string";
import chalk from "chalk";
import { CandidatePrompt } from "./candidatePrompt";
import { getValuesForSchema as askUserForValuesForSchema } from "./getValuesForSchema";
import { CREATE_NEW_TEST } from "../prompts/createNewTest/createNewTest";
import { sleep } from "openai/core";
import { getInputFromCLI, searchList } from "../dialogs/actions";
import { PromptController } from "./promptController";
import { confirm } from "../dialogs/actions";
import { generateTable } from "../promptfoo/generateTable";
import { Cost } from "modelfusion-experimental";

dotenv.config();
inquirer.registerPrompt("search-list", searchlist);

export type ExampleDataSet<T> = {
  [key in keyof T]: {
    name: string;
    value: T[key];
  };
};

export interface Action<Output> {
  name: string;
  action: () => Promise<Output>;
  enabled?: () => boolean;
}

export type PromptInput = ZodObject<any>;
export type PromptOutput = ZodType<any>;

export interface CLICommand<
  InputSchema extends PromptInput,
  OutputSchema extends PromptOutput
> {
  name: string;
  action: (prompt: Prompt<InputSchema, OutputSchema>) => Promise<void>;
}

export interface CLIOptions<
  InputSchema extends PromptInput,
  OutputSchema extends PromptOutput
> {
  formatChatMessage?: (message: ChatCompletionMessageParam) => any;
  inputKeyToCLIPrompt?: (key: keyof z.infer<InputSchema>) => string;
  getNextActions?: (
    prompt: Prompt<InputSchema, OutputSchema>
  ) => Promise<Action<any>[]>;
}

export interface PromptArgs<
  InputSchema extends ZodObject<any>,
  OutputSchema extends ZodType<any>
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
  exampleData?: ExampleDataSet<z.infer<InputSchema>>[];
  /**
   * Don't suggest example data in the CLI when picking input values.
   */
  dontSuggestExampleData?: boolean;
  /**
   * Options to help you build CLI dialogs with the prompt.
   */
  cliOptions?: CLIOptions<InputSchema, OutputSchema>;
  /**
   * Prompt controller that this prompt is registered to if any.
   */
  promptController?: PromptController<any>;
  /**
   * Initial values for the prompt's input variables.
   * Partial because the user can fill in the rest of the values in the CLI dialog.
   */
  vars?: Partial<z.infer<InputSchema>>;
  commands?: CLICommand<InputSchema, OutputSchema>[];

  //
  // LLM parameters

  model: OPENAI_CHAT_MODEL_NAME | OPENAI_INSTRUCT_MODEL_NAME;
  temperature?: number;
  max_tokens?: number;
  stop?: string[];
}

export class Prompt<
  InputSchema extends PromptInput,
  OutputSchema extends PromptOutput
> implements PromptArgs<InputSchema, OutputSchema>
{
  name: string;
  description?: string;
  cliOptions?: CLIOptions<InputSchema, OutputSchema>;

  prompts: CandidatePrompt<z.infer<InputSchema>>[];
  /**
   * Array of example data to use for CLI runs or testing.
   */
  exampleData: ExampleDataSet<z.infer<InputSchema>>[];
  dontSuggestExampleData?: boolean | undefined;
  model: OPENAI_CHAT_MODEL_NAME | OPENAI_INSTRUCT_MODEL_NAME;
  stop?: string[] | undefined;
  input?: InputSchema;
  output?: OutputSchema;

  promptController?: PromptController<any> | undefined;

  temperature?: number;
  max_tokens?: number;
  commands?: CLICommand<InputSchema, OutputSchema>[] | undefined;

  vars: Partial<z.infer<InputSchema>> = {};

  private tests: promptfoo.EvaluateTestSuite[] = [];

  constructor(args: PromptArgs<InputSchema, OutputSchema>) {
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
    this.vars = args.vars || {};
    this.dontSuggestExampleData = args.dontSuggestExampleData;
    this.promptController = args.promptController;
    this.commands = args.commands;

    this.temperature = args.temperature;
    this.max_tokens = args.max_tokens;
    this.stop = args.stop;
  }

  /**
   * Calculate the cost of running the prompt, excluding output.
   * To calculate total cost for an actual model call, see the `run` method.
   * WARNING: this method is experimental and may not be perfectly accurate.
   */
  async calculateCost(promptVariables: z.infer<InputSchema>) {
    const messages = this.chooseCandidatePrompt(promptVariables)
      .withVariables(promptVariables)
      .compile();
    const outputSchema = this.output
      ? JSON.stringify({
          name: toCamelCase(this.name),
          arguments: zodToJsonSchema(this.output),
        })
      : "";
    const tokenizer = openai.Tokenizer({ model: this.model });
    const promptTokens =
      typeof messages === "string"
        ? await countTokens(tokenizer, messages)
        : await countOpenAIChatPromptTokens({
            messages: messages as ChatMessage[],
            model: this.model as OPENAI_CHAT_MODEL_NAME,
          });
    const fnTokens = await countTokens(tokenizer, outputSchema);
    const costInfo =
      this.model === "gpt-3.5-turbo-instruct"
        ? OPENAI_TEXT_GENERATION_MODELS[this.model]
        : OPENAI_CHAT_MODELS[this.model];
    return {
      prompt: promptTokens,
      functions: fnTokens,
      total: promptTokens + fnTokens,
      cost: new Cost({
        costInMillicents:
          costInfo.promptTokenCostInMillicents * promptTokens +
          costInfo.promptTokenCostInMillicents * fnTokens,
        hasUnknownCost: false,
        callsWithUnknownCost: [],
      }),
    };
  }

  private createTest = <Input extends Record<string, any>>(args: {
    name: string;
    vars: Input;
    onlyTestMainPrompt?: boolean;
    customRunFunction?: (vars: Input) => Promise<any>;
    assertions: ((
      output: OutputSchema extends ZodType<infer U> ? U : string | null
    ) => {
      pass: boolean;
      score: number;
      reason: string;
    })[];
  }) => {
    const modelParams: ModelParams = {
      stop: this.stop,
      temperature: this.temperature,
      max_tokens: this.max_tokens,
    };
    const prompts = args.onlyTestMainPrompt
      ? [
          this.chooseCandidatePrompt(args.vars)
            .withVariables(args.vars)
            .compile(),
        ]
      : this.prompts.map((prompt) => prompt.withVariables(args.vars).compile());
    const options = args.customRunFunction
      ? customTestOptions({
          prompts,
          callApi: args.customRunFunction,
        })
      : this.output
      ? functionCallTestOptions({
          prompts,
          functions: [
            {
              name: toCamelCase(this.name),
              description: this.description,
              parameters: zodToJsonSchema(this.output),
            },
          ],
          model: this.model,
          modelParams,
        })
      : plainTextTestOptions({
          prompts,
          model: this.model,
          modelParams,
        });

    const defaultAsserts = this.output ? [assertValidSchema(this.output)] : [];
    const test: promptfoo.EvaluateTestSuite = {
      ...options,
      description: args.name,
      tests: [
        {
          vars: args.vars,
          assert: [
            ...defaultAsserts,
            ...(this.output
              ? args.assertions.map((a) =>
                  assertJSON(
                    // @ts-ignore
                    this.output!,
                    a
                  )
                )
              : args.assertions.map((a) => ({
                  type: "javascript" as const,
                  value: (output: string) => {
                    return a(output as any);
                  },
                }))),
          ],
        },
      ],
    };
    return test;
  };

  withCustomTest = <
    Input extends Record<string, string | object>,
    Output extends any
  >(
    opts: {
      name: string;
      vars: Input;
      onlyTestMainPrompt?: boolean;
    },
    fn: (this: typeof this, args: Input) => Promise<Output>,
    ...assertions: ((output: Output) => {
      pass: boolean;
      score: number;
      reason: string;
    })[]
  ) => {
    const test = this.createTest({
      ...opts,
      customRunFunction: fn.bind(this),
      assertions,
    });
    this.tests.push(test);
    return this;
  };

  /**
   * Add a command which displays in the CLI dialog.
   * Useful for adding commands to quickly test a prompt.
   */
  withCommand = (cmd: CLICommand<InputSchema, OutputSchema>) => {
    if (!this.commands) this.commands = [];
    this.commands?.push(cmd);
    return this;
  };

  /**
   * Add a prompt test.
   * Takes low level prompt variables as input and uses the default `prompt.run` method to execute the prompt.
   * If you want to use a custom run function, use `withCustomTest` instead.
   */
  withTest = (
    opts: {
      name: string;
      vars: z.infer<InputSchema>;
      onlyTestMainPrompt?: boolean;
    },
    ...assertions: ((
      output: OutputSchema extends ZodType<infer U> ? U : string | null
    ) => {
      pass: boolean;
      score: number;
      reason: string;
    })[]
  ) => {
    const test = this.createTest({
      ...opts,
      assertions,
    });
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
        messages: this.chooseCandidatePrompt(this.vars).raw().compile(),
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
    let nextAction: (() => Promise<void>) | undefined = undefined;
    let nextActionName: string | undefined = undefined;
    console.clear();
    while (true) {
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
      nextAction = nextActions?.find((x) => x.name === nextActionName)?.action;
      await nextAction?.();
      if (["quit", "back"].some((choice) => choice === nextActionName)) {
        break;
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
          await this.test({ name: test.test });
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
    const useCache = await confirm("Use cache?");
    const repetitions =
      parseInt(await getInputFromCLI("repetitions (default 1)")) || 1;
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
          writeLatestResults: true,
        },
        {
          maxConcurrency: 2,
          showProgressBar: true,
          cache: useCache,
          repeat: repetitions,
        }
      );
      for (let i = 0; i < results.table.head.prompts.length; i++) {
        const prompt = results.table.head.prompts[i];
        prompt.display = `Prompt: ${this.prompts[i].name}`;
      }
      console.log(
        generateTable(
          results,
          Number.MAX_SAFE_INTEGER,
          Number.MAX_SAFE_INTEGER
        ).render()
      );
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

  chooseCandidatePrompt = (vars: Partial<z.infer<InputSchema>>) => {
    return this.prompts[0];
  };

  /**
   * Basic Swiss Army knife prompt run function.
   * Supports generating and streaming text and structured data for OpenAI's instruct and chat models.
   * Also supports ModelFusion's `Run` object for logging and event tracking: https://modelfusion.dev/guide/util/run
   */
  async run(args: {
    promptVariables: z.infer<InputSchema>;
    stream: true;
    run?: Run;
  }): Promise<
    OutputSchema extends z.ZodObject<any>
      ? AsyncIterable<StructureStreamPart<z.infer<OutputSchema>>>
      : AsyncIterable<string>
  >;
  async run(args: {
    promptVariables: z.infer<InputSchema>;
    stream: false;
    run?: Run;
  }): Promise<
    OutputSchema extends z.ZodObject<any>
      ? z.infer<OutputSchema>
      : string | null
  >;
  async run(args: {
    promptVariables: z.infer<InputSchema>;
    stream: boolean;
    run?: Run;
  }): Promise<any> {
    const promptVars = this.input?.parse(args.promptVariables) || {};
    const messages = this.chooseCandidatePrompt(promptVars)
      .withVariables(promptVars)
      .compile();
    if (!this.output || this.model === "gpt-3.5-turbo-instruct") {
      const config =
        this.model === "gpt-3.5-turbo-instruct"
          ? openai.CompletionTextGenerator({
              model: "gpt-3.5-turbo-instruct",
              stopSequences: this.stop,
              temperature: this.temperature,
              maxGenerationTokens: this.max_tokens,
            })
          : openai.ChatTextGenerator({
              model: this.model,
              stopSequences: this.stop,
              temperature: this.temperature,
              maxGenerationTokens: this.max_tokens,
            });
      if (args.stream) {
        const stream = await streamText(
          config as any,
          config instanceof OpenAICompletionModel
            ? chatMessagesToInstructPrompt({ messages })
            : messages,
          { run: args.run }
        );
        return stream;
      } else {
        const text = await generateText(
          config as any,
          config instanceof OpenAICompletionModel
            ? chatMessagesToInstructPrompt({ messages })
            : messages,
          { run: args.run }
        );
        return text;
      }
    } else {
      const config = openai
        .ChatTextGenerator({
          model: this.model,
          stopSequences: this.stop,
          temperature: this.temperature,
          maxGenerationTokens: this.max_tokens,
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
          { run: args.run }
        );
        return stream;
      } else {
        return await generateStructure(
          config,
          new ZodSchema(this.output),
          messages as OpenAIChatMessage[],
          { run: args.run }
        );
      }
    }
  }
}
