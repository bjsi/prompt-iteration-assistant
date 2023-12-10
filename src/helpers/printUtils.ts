import chalk from "chalk";
import { marked } from "marked";
import { markedTerminal } from "marked-terminal";
import { ChatCompletionMessageParam } from "openai/resources";
import { ZodType } from "zod";
import { capitalizeFirst, zodSchemaToInterface } from "./stringUtils";
import boxen from "boxen";
import highlight from "cli-highlight";

// @ts-ignore
marked.use(markedTerminal());

export function printMarkdown(markdown: string) {
  console.log(marked(markdown));
}

export const printZodSchema = async (args: {
  schema: ZodType;
  name?: string;
  onlyFields?: boolean;
}) => {
  const tsInterface = highlightTS(await zodSchemaToInterface(args));
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
        const role = chalk.green(capitalizeFirst(message.role));
        return boxen(marked(message.content?.toString() || ""), {
          title: role,
        });
      })
      .join("\n\n")
  );
};

export function highlightTS(text: string) {
  return highlight(text, { language: "ts" });
}

export function highlightJSON(text: string) {
  return highlight(text, { language: "json" });
}
