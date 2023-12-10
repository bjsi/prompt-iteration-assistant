import chalk from "chalk";
import { Prompt } from "../lib/prompt";
import { createInputSchema } from "./createInputSchema";
import {
  CREATE_PROMPT_METADATA,
  createPromptMetadata,
} from "./createPromptMetadata";
import inquirer from "inquirer";
import { buildPrompt } from "./buildPrompt";
import { chatMessagesToInstructPrompt } from "../openai/messages";
import { zodSchema } from "modelfusion";
import { toCamelCase, zodSchemaToInterface } from "../helpers/stringUtils";
import { input } from "@inquirer/prompts";

// select prompt or create new prompt
// cli: test / improve
// improve = run the buildPrompt cmd
// test = select tests to run and iterate on

export class PromptController<
  Prompts extends Record<string, Prompt<any, any, any>>
> {
  private prompts: Prompts;

  constructor(prompts: Prompts) {
    this.prompts = prompts;
  }

  getPrompt<Name extends keyof Prompts>(name: Name): Prompts[Name] {
    return this.prompts[name];
  }

  getPrompts(): Prompts {
    return this.prompts;
  }

  async cli() {
    console.log(`Welcome to ${chalk.blue("Prompt Iteration Assistant")}!`);
    if (Object.keys(this.prompts).length > 0) {
      console.log(
        `You have ${chalk.green(this.prompts.length)} registered prompts.`
      );
    }
    const result = await inquirer.prompt([
      {
        type: "search-list",
        name: "prompt",
        message: "Select a prompt to iterate on:",
        choices: Object.values(this.prompts).map((p) => ({
          name: p.name,
          value: p,
        })),
      },
    ]);

    const prompt = result.prompt as Prompt<any, any, any>;
    const action = await inquirer.prompt([
      {
        type: "search-list",
        name: "action",
        message: "Select an action:",
        choices: [
          {
            name: "Test",
            value: "test",
          },
          {
            name: "Improve",
            value: "improve",
          },
        ],
      },
    ]);

    if (action.action === "test") {
      await prompt.cli("test");
    } else {
      // todo: what if there are multiple alternative prompts
      // what format should the prompt be in? string? object?
      const idx = 0;
      const rawPrompt = prompt.prompts[idx].raw().compile();
      const inputSchema = await zodSchemaToInterface({
        schema: prompt.input,
        name: toCamelCase(prompt.name + "Variables"),
      });

      const build = buildPrompt({
        state: {
          currentPrompt: chatMessagesToInstructPrompt(rawPrompt),
          inputSchema: inputSchema,
        },
        vars: {
          goal: prompt.description,
          idealOutput: prompt.output,
        },
      });
      await build.cli("run");
      // then update vars and save
    }
  }
}
