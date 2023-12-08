import { editor } from "@inquirer/prompts";
import { ChatCompletionMessageParam } from "openai/resources";
import {
  ChatMessage,
  chatMessagesToInstructPrompt,
  instructPromptToChatMessages,
} from "../openai/messages";
import { Action } from "../prompt";

export const edit = <T extends string | ChatCompletionMessageParam[]>(args: {
  input: T;
}): Action<T extends string ? string : ChatCompletionMessageParam[]> => ({
  name: "edit",
  action: async () => {
    const output = await editor({
      default:
        typeof args.input === "string"
          ? args.input
          : chatMessagesToInstructPrompt(args.input),
      message: "",
      waitForUseInput: false,
    });
    return (
      typeof args.input === "string"
        ? output
        : instructPromptToChatMessages(output)
    ) as any;
  },
});

export const chat = (args: { input: ChatCompletionMessageParam[] }) => ({
  name: "chat",
  action: async () => {
    return await editor({
      default: JSON.stringify(args.input, null, 2),
      message: "",
      waitForUseInput: false,
    });
  },
});

if (require.main === module) {
  (async () => {
    const msgs = [
      ChatMessage.system(
        `
# Instructions
- Act as a senior prompt engineer
- Task context: prompt generation, iteration<->(feedback and collaboration) to create a clear, concise, unbounded prompt tailored to meet specific needs.
- Your role is to provide guidance and expertise.
- Format the prompts using markdown
- Start simple by coming up with bullet-list prompt instructions without examples.
`.trim()
      ),
      ChatMessage.user(`# Goal`.trim()),
    ];
    const out = await edit({ input: msgs }).action();
    console.log(out);
  })();
}
