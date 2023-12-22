import chalk from "chalk";
import { Prompt } from "./prompt";
import inquirer from "inquirer";
import {
  CREATE_NEW_PROMPT,
  buildPrompt,
} from "../prompts/buildPrompt/buildPrompt";

/**
 * A container for all the prompts in your program.
 *
 * Example:
 * ```ts
 * const promptController = new PromptController({
 *   [BRAINSTORM_IDEAS]: brainstormInputs,
 * });
 * promptController.cli();
 * ```
 */
export class PromptController<
  Prompts extends Record<string, (...args: any[]) => Prompt<any, any>>
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
      console.log();
      console.log(
        `You have ${chalk.green(
          Object.keys(this.prompts).length
        )} registered prompts.`
      );
    }
    console.log();
    const result = await inquirer.prompt([
      {
        type: "search-list",
        name: "prompt",
        message: "Select a prompt:",
        choices: Object.entries(this.prompts)
          .map(([k, v]) => ({
            name: k,
            value: k,
          }))
          .concat([
            {
              name: CREATE_NEW_PROMPT,
              value: CREATE_NEW_PROMPT,
            },
            {
              name: "quit",
              value: "quit",
            },
          ]),
      },
    ]);

    if (result.prompt === CREATE_NEW_PROMPT) {
      await buildPrompt({ promptController: this }).cli("run");
    } else if (result.prompt === "quit") {
      process.exit(0);
    } else {
      // todo: what if the prompt requires args?
      const prompt = this.getPrompt(result.prompt)();
      const customCmds = prompt.commands || [];
      const action = await inquirer.prompt([
        {
          type: "search-list",
          name: "action",
          message: "Select an action:",
          choices: [
            {
              name: result.prompt === CREATE_NEW_PROMPT ? "run" : "improve",
              value: "improve",
            },
            {
              name: "test",
              value: "test",
            },
            ...customCmds.map((cmd) => ({
              name: cmd.name,
              value: cmd.name,
            })),
          ],
        },
      ]);

      if (action.action === "test") {
        await prompt.cli("test");
      } else if (action.action === "improve") {
        console.log("improving...");
        const build = buildPrompt({
          promptController: this,
          state: {
            currentPrompt: prompt,
          },
          vars: {
            goal: prompt.description,
          },
        });
        await build.cli("run");
      } else if (customCmds.find((cmd) => cmd.name === action.action)) {
        const cmd = customCmds.find((cmd) => cmd.name === action.action)!;
        await cmd.action(prompt);
      }
    }
  }
}
