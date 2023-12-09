import chalk from "chalk";
import highlight from "cli-highlight";
import { compile } from "json-schema-to-typescript";
import { marked } from "marked";
import { markedTerminal } from "marked-terminal";
import { ChatCompletionMessageParam } from "openai/resources";
import { ZodType } from "zod";
import zodToJsonSchema from "zod-to-json-schema";
import { capitalizeFirst } from "./stringUtils";

// @ts-ignore
marked.use(markedTerminal());

export function printMarkdown(markdown: string) {
  console.log(marked(markdown));
}

export const printZodSchema = async (args: {
  schema: ZodType;
  name: string;
  onlyFields?: boolean;
}) => {
  const jsonSchema = zodToJsonSchema(args.schema);
  const tsInterface = highlight(
    await compile(
      // @ts-ignore
      jsonSchema,
      args.name,
      { bannerComment: "" }
    ),
    { language: "typescript" }
  );
  if (args.onlyFields) {
    const fields = tsInterface
      .split("\n")
      .filter((line) => line.includes(":"))
      .map((line) => line.trim());
    console.log(fields.join("\n"));
  } else {
    console.log(tsInterface);
  }
};

interface PrintChatMessagesArgs {
  messages: ChatCompletionMessageParam[];
  hideSystem?: boolean;
}

export const printChatMessages = (args: PrintChatMessagesArgs) => {
  const { messages, hideSystem } = args;
  console.log(
    messages
      .filter((message) => (hideSystem ? message.role !== "system" : true))
      .map((message) => {
        const role = chalk.green(capitalizeFirst(message.role)) + ":\n";
        return role + marked(message.content?.toString() || "");
      })
      .join("\n\n")
  );
};
