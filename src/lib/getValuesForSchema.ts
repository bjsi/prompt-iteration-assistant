import chalk from "chalk";
import { z } from "zod";
import { printZodSchema } from "../helpers/printUtils";
import { toCamelCase, truncate } from "../helpers/stringUtils";
import { ExampleDataSet } from "./prompt";
import inquirer from "inquirer";
import { edit } from "../prompts/actions";

export async function getValuesForSchema<
  Schema extends z.ZodObject<any>
>(args: {
  name: string;
  schema: Schema;
  existingVariables?: Partial<z.infer<Schema>>;
  exampleData?: ExampleDataSet<Schema>[];
  formatKey?: (key: keyof z.infer<Schema>) => string;
}) {
  console.clear();
  const variables: Partial<z.infer<Schema>> = {
    ...(args.existingVariables || ({} as any)),
  };
  const variableKeysWithoutValues = (
    Object.keys(args.schema.shape) as (keyof z.infer<Schema>)[]
  ).filter((key) => !variables[key]);
  if (variableKeysWithoutValues.length) {
    console.log(
      `The "${chalk.green(args.name)}" prompt takes ${
        variableKeysWithoutValues.length
      } arguments:`
    );
    console.log();
    await printZodSchema({
      schema: args.schema,
      name: toCamelCase(args.name + "Args"),
      onlyFields: true,
    });
    console.log();
  }
  for (let i = 0; i < variableKeysWithoutValues.length; i++) {
    const key = variableKeysWithoutValues[i];
    const examples = (args.exampleData || []).filter((set) =>
      Boolean(set[key])
    );
    const formatKey = () =>
      (args.formatKey?.(key) || key.toString()) +
      (args.schema.shape[key].isOptional() ? " (optional)" : "");
    if (examples.length) {
      const answer = await inquirer.prompt([
        {
          type: "search-list",
          name: key,
          message: `${i + 1}. ${key.toString()}`,
          choices: [
            "input value",
            "edit value",
            ...examples
              .map((d) =>
                Object.values(d).map(
                  (d) =>
                    `${d.name}${
                      typeof d.value === "string"
                        ? chalk.hex("#a5abb6")(` (${truncate(d.value, 30)})`)
                        : ""
                    }`
                )
              )
              .flat(),
          ],
        },
      ]);
      if (answer[key] === "input value") {
        const answer = await inquirer.prompt([
          {
            type: "input",
            name: key,
            message: formatKey(),
          },
        ]);
        variables[key] = answer[key];
      } else if (answer[key] === "edit value") {
        const value = await edit({ input: "" }).action();
        console.log(value);
        variables[key] = value as any;
      } else {
        console.log(variables);
        variables[key] = examples.find((d) => d[key].name === answer[key])![
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
      variables[key] = answer[key];
    }
  }
  return variables;
}
