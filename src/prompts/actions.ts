import { editor } from "@inquirer/prompts";
import { ChatCompletionMessageParam } from "openai/resources";
import {
  chatMessagesToInstructPrompt,
  instructPromptToChatMessages,
} from "../openai/messages";
import { Action } from "../prompt";

export const edit = <T extends string | ChatCompletionMessageParam[]>(args: {
  input: T;
  onSaved?: (
    output: T extends string ? string : ChatCompletionMessageParam[]
  ) => void;
  enabled?: () => boolean;
}): Action<T extends string ? string : ChatCompletionMessageParam[]> => ({
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
