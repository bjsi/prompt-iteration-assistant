import chalk from "chalk";
import { marked } from "marked";
import { markedTerminal } from "marked-terminal";
import { ChatCompletionMessageParam } from "openai/resources";
import { ZodType } from "zod";
import { capitalizeFirst, zodSchemaToInterface } from "./string";
import highlight from "cli-highlight";
import { ChatMessage, chatMessagesToInstructPrompt } from "../openai/messages";

// @ts-ignore
marked.use(markedTerminal());

export function printMarkdown(markdown: string) {
  console.log(marked(markdown));
}

export function markdownInBox(markdown: string, title?: string) {
  return marked(`---\n${title}\n${markdown}\n---`);
}

export function printMarkdownInBox(markdown: string, title?: string) {
  console.log(markdownInBox(markdown, title));
}

export function printPrompt(messages: ChatMessage[]) {
  const md = chatMessagesToInstructPrompt({ messages });
  printMarkdownInBox(md, chalk.green("Prompt"));
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
  messages: ChatCompletionMessageParam[] | string;
  hideSystem?: boolean;
}

export const printChatMessages = (args: PrintChatMessagesArgs) => {
  const { messages, hideSystem } = args;
  if (typeof messages === "string") {
    console.log(markdownInBox(messages));
    return;
  }
  console.log(
    messages
      .filter((message) => (hideSystem ? message.role !== "system" : true))
      .map((message) => {
        const role = chalk.green(capitalizeFirst(message.role));
        return markdownInBox(message.content?.toString() || "", role);
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
