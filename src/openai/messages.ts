import { Chat, ChatCompletionMessageParam } from "openai/resources";

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

export const instructPromptToChatMessages = (prompt: string) => {
  const lines = prompt.split("\n");
  const messages = [];
  let currentRole: ChatMessage["role"] | null = null;
  let content: string[] = [];

  lines.forEach((line) => {
    if (line.match(/^# (System|User|Assistant)/)) {
      if (currentRole && content.length > 0) {
        messages.push(createChatMessage(currentRole, content.join("\n")));
      }
      currentRole = line.replace("# ", "").toLowerCase() as ChatMessage["role"];
      content = [];
    } else {
      content.push(line);
    }
  });

  if (currentRole && content.length > 0) {
    messages.push(createChatMessage(currentRole, content.join("\n")));
  }

  return messages;
};

const createChatMessage = (role: ChatMessage["role"], content: string) => {
  return ChatMessage[role](content);
};
