import { ChatCompletionMessageParam } from "openai/resources";

import { z, ZodType } from "zod";

const SystemMessageSchema = z.object({
  role: z.literal("system"),
  content: z.string(),
});

const UserMessageSchema = z.object({
  role: z.literal("user"),
  content: z.string(),
});

const AssistantMessageSchema = z.object({
  role: z.literal("assistant"),
  content: z.string().nullable(),
  function_call: z
    .object({
      name: z.string(),
      arguments: z.string(),
    })
    .optional(),
});

export const ChatMessageSchema = z.union([
  SystemMessageSchema,
  UserMessageSchema,
  AssistantMessageSchema,
]);

export type ChatMessage = z.infer<typeof ChatMessageSchema>;

export const ChatMessage = {
  system(content: string): ChatMessage {
    return { role: "system", content } as const;
  },
  user(content: string): ChatMessage {
    return {
      role: "user",
      content,
    };
  },
  assistant(
    content: string | null,
    function_call?: {
      name: string;
      arguments: Record<string, any>;
    }
  ): ChatMessage {
    return {
      role: "assistant",
      content,
      function_call: function_call
        ? {
            name: function_call.name || "",
            arguments: JSON.stringify(function_call.arguments, null, 2),
          }
        : undefined,
    };
  },
};

export const chatMessagesToInstructPrompt = (
  messages: ChatCompletionMessageParam[]
) => {
  return messages
    .map((m) => {
      if (m.role === "system") {
        return `# System\n${m.content}`;
      } else if (m.role === "user") {
        return `# User\n${m.content}`;
      } else if (m.role === "assistant") {
        return `# Assistant\n${m.content}\n${JSON.stringify(
          m.function_call,
          null,
          2
        )}`;
      }
    })
    .join("\n\n");
};

export const instructPromptToChatMessages = (
  prompt: string
): ChatCompletionMessageParam[] => {
  const messages = prompt.split("\n\n");
  return messages.map((message) => {
    const lines = message.split("\n");
    const role = lines[0].replace("# ", "") as "System" | "User" | "Assistant";
    const content = lines.slice(1).join("\n");
    if (role === "System") {
      return ChatMessage.system(content);
    } else if (role === "User") {
      return ChatMessage.user(content);
    } else if (role === "Assistant") {
      return ChatMessage.assistant(content);
    }
  });
};
