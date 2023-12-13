import chalk from "chalk";
import { Prompt } from "./prompt";
import inquirer from "inquirer";
import { CREATE_NEW_PROMPT, buildPrompt } from "../prompts/buildPrompt";

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
      await buildPrompt().cli("run");
    } else if (result.prompt === "quit") {
      process.exit(0);
    } else {
      const prompt = this.getPrompt(result.prompt);
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
          ],
        },
      ]);

      const p = prompt();
      if (action.action === "test") {
        // todo: what if the prompt requires args?
        await p.cli("test");
      } else {
        const build = buildPrompt({
          state: {
            currentPrompt: p,
          },
          vars: {
            goal: p.description,
          },
        });
        await build.cli("run");
        // then update vars and save
      }
    }
  }
}
