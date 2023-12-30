import chalk from "chalk";
import { z } from "zod";
import { printZodSchema } from "../helpers/print";
import { toCamelCase, truncate } from "../helpers/string";
import { ExampleDataSet } from "./prompt";
import inquirer from "inquirer";
import { getInputFromEditor } from "../dialogs/actions";
import { brainstormInputs } from "../prompts/brainstormInputs/brainstormInputs";
import { sleep } from "openai/core";

export function variablesMissingValues<Schema extends z.ZodObject<any>>(args: {
  schema: Schema;
  existingVariables?: Partial<z.infer<Schema>>;
}) {
  const variableKeysWithoutValues = (
    Object.keys(args.schema.shape) as (keyof z.infer<Schema>)[]
  ).filter((key) => !args.existingVariables?.[key]);
  return variableKeysWithoutValues;
}

export async function getValuesForSchema<
  Schema extends z.ZodObject<any>
>(args: {
  name: string;
  schema: Schema;
  prompt: string;
  existingVariables?: Partial<z.infer<Schema>>;
  exampleData?: ExampleDataSet<Schema>[];
  formatKey?: (key: keyof z.infer<Schema>) => string;
}) {
  console.clear();
  const variables: Partial<z.infer<Schema>> = {
    ...(args.existingVariables || ({} as any)),
  };
  const variableKeysWithoutValues = variablesMissingValues(args);
  if (variableKeysWithoutValues.length) {
    console.log(
      `${chalk.green(args.name)} requires ${
        variableKeysWithoutValues.length
      } argument${variableKeysWithoutValues.length === 1 ? "" : "s"}:`
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
    const answer = await inquirer.prompt([
      {
        type: "search-list",
        name: key,
        message: `${i + 1}. ${formatKey()}`,
        choices: [
          "input value",
          "edit value",
          "generate value",
          ...examples
            .map((d) =>
              Object.values(d).map(
                (d) =>
                  `${d.name}${
                    typeof d.value === "string"
                      ? chalk.hex("#a5abb6")(` ("${truncate(d.value, 30)}")`)
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
      const value = await getInputFromEditor({ input: "" });
      console.log(value);
      variables[key] = value as any;
    } else if (answer[key] === "generate value") {
      const example = await brainstormInputs(
        z.object({ [key]: args.schema.shape[key] })
      ).run({
        promptVariables: {
          prompt: args.prompt || "",
        },
        stream: false,
      });
      console.log(example);
      variables[key] = example[key];
      await sleep(10_000);
    } else {
      console.log(variables);
      variables[key] = examples.find((d) => d[key].name === answer[key])![
        key
      ].value;
    }
  }
  return variables;
}
