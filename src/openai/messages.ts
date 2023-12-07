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
        return m.content;
      } else if (m.role === "user") {
        return `${m.content}`;
      } else if (m.role === "assistant") {
        return `${m.content}`;
      } else if (m.role === "function") {
        return `${m.content}`;
      }
    })
    .join("\n\n");
};
