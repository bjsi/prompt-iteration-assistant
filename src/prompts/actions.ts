import { editor } from "@inquirer/prompts";
import {
  ChatMessagesWithAttributes,
  chatMessagesToInstructPrompt,
  instructPromptToChatMessages,
} from "../openai/messages";
import { Action } from "../lib/prompt";

export const edit = <T extends string | ChatMessagesWithAttributes>(args: {
  input: T;
  onSaved?: (
    output: T extends string ? string : ChatMessagesWithAttributes
  ) => void;
  enabled?: () => boolean;
}): Action<T extends string ? string : ChatMessagesWithAttributes> => ({
  name: "edit",
  enabled: args.enabled,
  action: async () => {
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
    args.onSaved?.(messages);
    return messages;
  },
});
