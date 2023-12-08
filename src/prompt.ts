import * as promptfoo from "promptfoo";
import { ZodObject, ZodType, z } from "zod";
import { ChatCompletionMessageParam } from "openai/resources";
import zodToJsonSchema from "zod-to-json-schema";
import { Command } from "commander";
import inquirer from "inquirer";
// @ts-ignore
import searchlist from "inquirer-search-list";
import dotenv from "dotenv";
import { OPENAI_CHAT_MODEL, OPENAI_INSTRUCT_MODEL } from "./openai/models";
import {
  functionCallTestOptions,
  plainTextTestOptions,
} from "./promptfoo/options";
import { assertJSON, assertValidSchema } from "./promptfoo/assertions";
import OpenAI from "openai";
import { Stream } from "openai/streaming";
import { chatMessagesToInstructPrompt } from "./openai/messages";

dotenv.config();
inquirer.registerPrompt("search-list", searchlist);

export type CandidatePrompt<Args> = {
  compile: (args: Args) => ChatCompletionMessageParam[];
  name: string;
};

export type ExampleDataSet<T extends ZodType> = {
  [key in keyof z.infer<T>]: {
    name: string;
    value: z.infer<T>[key];
  };
};

export interface Action<Input, Output> {
  name: string;
  action: (args: Input) => Promise<Output>;
}

export interface CLIOptions<
  InputSchema extends ZodObject<any>,
  OutputSchema extends ZodType = ZodType<string | null>
> {
  formatChatMessage?: (message: ChatCompletionMessageParam) => any;
  inputKeyToCLIPrompt?: (key: keyof z.infer<InputSchema>) => string;
  getNextActions?: (
    prompt: Prompt<InputSchema, OutputSchema>,
    messages: ChatCompletionMessageParam[]
  ) => Action<any, any>[];
}

export class Prompt<
  InputSchema extends ZodObject<any>,
  OutputSchema extends ZodType = ZodType<string | null>
> {
  name: string;
  description?: string;
  /**
   * The first prompt in the array is considered the "main" prompt.
   */
  prompts: CandidatePrompt<z.infer<InputSchema>>[];
  /**
   * Array of example data to use for CLI runs or testing.
   */
  exampleData: ExampleDataSet<InputSchema>[];
  model: OPENAI_CHAT_MODEL | OPENAI_INSTRUCT_MODEL;
  input: InputSchema;
  output?: OutputSchema;
  cliOptions?: CLIOptions<InputSchema>;

  temperature?: number;
  max_tokens?: number;

  private extraMessages: ChatCompletionMessageParam[] = [];
  private tests: promptfoo.EvaluateTestSuite[] = [];

  constructor(args: {
    name: string;
    description?: string;
    model: OPENAI_CHAT_MODEL | OPENAI_INSTRUCT_MODEL;
    temperature?: number;
    max_tokens?: number;
    prompts: CandidatePrompt<z.infer<InputSchema>>[];
    input: InputSchema;
    output?: OutputSchema;
    exampleData?: ExampleDataSet<InputSchema>[];
    cliOptions?: CLIOptions<InputSchema>;
  }) {
    this.name = args.name;
    this.output = args.output;
    this.description = args.description;
    this.prompts = args.prompts;
    this.input = args.input;
    this.model = args.model;
    this.exampleData = args.exampleData || [];
    this.cliOptions = args.cliOptions;
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
          prompts: this.prompts.map((prompt) => prompt.compile(promptVars)),
          functions: [
            {
              name: this.name,
              description: this.description,
              parameters: zodToJsonSchema(this.output),
            },
          ],
          model: this.model,
        })
      : plainTextTestOptions({
          prompts: this.prompts.map((prompt) => prompt.compile(promptVars)),
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

  /**
   * Each `Prompt` contains its own `nextAction` handlers, but all of them require
   * filling out the `input` schema first, so this method fills out the input schema
   * before calling the `nextAction` handler.
   */
  private runLoop = async () => {
    const keys = Object.keys(
      this.input.shape
    ) as (keyof z.infer<InputSchema>)[];
    const args: z.infer<InputSchema> = {};
    for (const key of keys) {
      const examples = this.exampleData.filter((set) => Boolean(set[key]));
      const formatKey = () =>
        (this.cliOptions?.inputKeyToCLIPrompt?.(key) || key.toString()) +
        (this.input.shape[key].optional ? " (optional)" : "");
      if (examples.length) {
        const answer = await inquirer.prompt([
          {
            type: "search-list",
            name: key,
            message: formatKey(),
            choices: [
              "input",
              ...examples
                .map((d) => Object.values(d).map((d) => d.name))
                .flat(),
            ],
          },
        ]);
        if (answer[key] === "input") {
          const answer = await inquirer.prompt([
            {
              type: "input",
              name: key,
              message: formatKey(),
            },
          ]);
          args[key] = answer[key];
        } else {
          console.log(args);
          args[key] = examples.find((d) => d[key].name === answer[key])![
            key
          ].value;
        }
      } else {
        const answer = await inquirer.prompt([
          {
            type: "input",
            name: key,
            message: formatKey(),
          },
        ]);
        args[key] = answer[key];
      }
    }

    // at this point, we have all the input variables
    while (true) {
      // get the list of nextActions from the prompt's cliOptions or provide default options
      const nextActions = this.cliOptions?.getNextActions?.(
        this,
        this.prompts[0].compile(args)
      );
      const nextAction = await inquirer.prompt([
        {
          type: "search-list",
          name: "action",
          message: "Select an option:",
          choices: nextActions || ["run"],
        },
      ]);
      if (nextAction) {
        await nextAction.run();
      }
    }
  };

  async runCLI() {
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
      // Use Inquirer.js to display a selection menu
      const answer = await inquirer.prompt<{ action: "run" | "test" }>([
        {
          type: "search-list",
          name: "action",
          message: "Select an option:",
          choices: ["run", "test"],
        },
      ]);

      // Handle the selected option
      if (answer.action === "test") {
        const test = await inquirer.prompt([
          {
            type: "search-list",
            name: "test",
            message: "Select a test:",
            choices: ["All", ...this.tests.map((test) => test.description)],
          },
        ]);
        if (test.test === "All") {
          await this.test();
        } else {
          await this.test(test.test);
        }
      } else if (answer.action === "run") {
        this.runLoop();
      }
    }
  }

  async test(name?: string) {
    const tests = this.tests.filter(
      (test) => !name || test.description === name
    );
    if (!tests.length) {
      console.log(`No test found with name "${name}"`);
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
        }
      );
      for (let i = 0; i < results.table.head.prompts.length; i++) {
        const prompt = results.table.head.prompts[i];
        prompt.display = this.prompts[i].name;
      }
      console.log(promptfoo.generateTable(results).toString());
    }
  }

  async run(args: {
    promptVariables: z.infer<InputSchema>;
    stream: true;
    verbose?: boolean;
  }): Promise<
    Stream<
      OutputSchema extends ZodType<infer U> ? U : ChatCompletionMessageParam
    >
  >;
  async run(args: {
    promptVariables: z.infer<InputSchema>;
    stream: false;
    verbose?: boolean;
  }): Promise<
    OutputSchema extends ZodType<infer U> ? U : ChatCompletionMessageParam
  >;
  async run(args: {
    promptVariables: z.infer<InputSchema>;
    stream: boolean;
    verbose?: boolean;
  }): Promise<
    | (OutputSchema extends ZodType<infer U> ? U : string | null)
    | Stream<
        OutputSchema extends ZodType<infer U> ? U : ChatCompletionMessageParam
      >
  > {
    const promptVars = this.input.parse(args.promptVariables);
    const messages = this.prompts[0]
      .compile(promptVars)
      .concat(this.extraMessages);
    if (args.verbose) {
      console.log("model:", this.model);
      if (this.model === "gpt-3.5-turbo-instruct") {
        console.log(chatMessagesToInstructPrompt(messages));
      } else {
        console.log(messages);
      }
    }
    const response =
      this.model === "gpt-3.5-turbo-instruct"
        ? await new OpenAI().completions.create({
            prompt: chatMessagesToInstructPrompt(messages),
            model: this.model,
            temperature: this.temperature,
            max_tokens: this.max_tokens,
          })
        : await new OpenAI().chat.completions.create({
            messages,
            model: this.model,
            function_call: this.output ? { name: this.name } : undefined,
            functions: this.output
              ? [
                  {
                    name: this.name,
                    description: this.description,
                    parameters: zodToJsonSchema(this.output),
                  },
                ]
              : undefined,
            stream: args.stream,
          });
    if (response instanceof Stream) {
      if (this.output) {
        throw new Error("Not Implemented Yet");
      } else {
        throw new Error("Not Implemented Yet");
      }
    } else if (response.object === "text_completion") {
      if (args.verbose) console.log(response.choices[0]);
      return response.choices[0].text as any;
    } else {
      if (args.verbose) console.log(response.choices[0].message);
      if (this.output) {
        const args = JSON.parse(
          response.choices[0].message.function_call?.arguments || "{}"
        );
        const parsed = this.output.safeParse(args);
        return parsed.success
          ? parsed.data
          : this.run({ ...args, retries: (args.retries || 0) + 1 });
      } else {
        return response.choices[0].message as any;
      }
    }
  }
}
