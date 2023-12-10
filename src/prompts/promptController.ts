import chalk from "chalk";
import { Prompt } from "../lib/prompt";
import inquirer from "inquirer";
import { buildPrompt } from "./buildPrompt";
import { chatMessagesToInstructPrompt } from "../openai/messages";
import { toCamelCase, zodSchemaToInterface } from "../helpers/stringUtils";

/**
 * A container for all the prompts in your program.
 */
export class PromptController<
  Prompts extends Record<string, (...args: any[]) => Prompt<any, any, any>>
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
    console.clear();
    console.log(`Welcome to ${chalk.blue("Prompt Iteration Assistant")}!`);
    if (Object.keys(this.prompts).length > 0) {
      console.log(
        `You have ${chalk.green(
          Object.keys(this.prompts).length
        )} registered prompts.`
      );
    }
    const result = await inquirer.prompt([
      {
        type: "search-list",
        name: "prompt",
        message: "Select a prompt to iterate on:",
        choices: Object.entries(this.prompts).map(([k, v]) => ({
          name: k,
          value: k,
        })),
      },
    ]);

    const prompt = this.getPrompt(result.prompt);
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

    const p = prompt();
    if (action.action === "test") {
      // todo: what if the prompt requires args?
      await p.cli("test");
    } else {
      const idx = 0;
      const rawPrompt = p.prompts[idx].raw().compile();
      const inputSchema = await zodSchemaToInterface({
        schema: p.input,
        name: toCamelCase(prompt.name + "Variables"),
      });

      const build = buildPrompt({
        state: {
          currentPrompt: chatMessagesToInstructPrompt(rawPrompt),
          inputSchema: inputSchema,
        },
        vars: {
          goal: p.description,
          idealOutput: p.output,
        },
      });
      await build.cli("run");
      // then update vars and save
    }
  }
}
