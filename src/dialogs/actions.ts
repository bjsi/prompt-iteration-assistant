import { editor } from "@inquirer/prompts";
import {
  ChatMessagesWithAttributes,
  chatMessagesToInstructPrompt,
  instructPromptToChatMessages,
} from "../openai/messages";
import inquirer from "inquirer";

/**
 * Presents a list of choices to the user and returns the selected choice
 */
export const searchList = async <T extends string>(args: {
  message: string;
  choices: T[];
  default?: string;
}): Promise<T> => {
  const { message, choices, default: def } = args;
  const res = await inquirer.prompt([
    {
      type: "search-list",
      name: "choice",
      message: message,
      choices: choices,
      default: def,
    },
  ]);
  return res.choice;
};

/**
 * @returns true if the user confirms, false otherwise
 */
export const confirm = async (message: string) => {
  const res = await inquirer.prompt({
    name: "confirm",
    message: message,
    type: "confirm",
  });
  return !!res.confirm;
};

/**
 * Allows the user to select an input method and returns the input.
 * Supports CLI input and editor input using the user's `$EDITOR` env var.
 */
export const getUserInput = async (args: {
  message?: string;
  input?: string;
}) => {
  const { message, input } = args;
  const prompts: string[] = ["input value", "edit value"];
  const choice = await inquirer.prompt([
    {
      type: "search-list",
      name: "edit-mode",
      message: "Select an input method:",
      choices: prompts,
    },
  ]);
  if (choice["edit-mode"] === "input value") {
    return await getInputFromCLI(message || "");
  } else {
    return await getInputFromEditor({ input: input || "" });
  }
};

export const getInputFromCLI = async (message: string) => {
  const res = await inquirer.prompt({
    name: "input",
    message: message,
    type: "input",
  });
  return res.input as string;
};

/**
 * Opens the user's `$EDITOR` and returns the input.
 */
export const getInputFromEditor = async <
  T extends string | ChatMessagesWithAttributes
>(args: {
  input: T;
}): Promise<T> => {
  const output = await editor({
    default:
      typeof args.input === "string"
        ? args.input
        : chatMessagesToInstructPrompt(args.input),
    message: "",
    waitForUseInput: false,
    postfix: ".md",
  });
  const messages = (
    typeof args.input === "string"
      ? output
      : instructPromptToChatMessages(output)
  ) as any;
  return messages;
};
