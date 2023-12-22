import { ChatCompletionMessageParam } from "openai/resources";
import fm from "front-matter";
import { z } from "zod";

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
  assistant<T extends {}>(
    content: string | null,
    function_call?: {
      name: string;
      arguments: T;
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

const promptFrontMatterSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
});

export const chatMessagesToInstructPrompt = (args: {
  messages: ChatCompletionMessageParam[] | string;
  attributes?: z.infer<typeof promptFrontMatterSchema>;
  includeRoles?: boolean;
}) => {
  const { messages, attributes, includeRoles } = args;
  const body =
    typeof messages === "string"
      ? messages
      : messages
          .map((m) => {
            if (m.role === "system") {
              return includeRoles ? `# System\n${m.content}` : m.content;
            } else if (m.role === "user") {
              return includeRoles ? `# User\n${m.content}` : m.content;
            } else if (m.role === "assistant") {
              const functionCall = JSON.stringify(m.function_call, null, 2);
              return includeRoles
                ? `# Assistant\n${m.content}\n${functionCall}`
                : `${m.content}\n${functionCall}`;
            }
          })
          .join("\n\n");
  const frontMatter = attributes
    ? `---\n${Object.entries(attributes)
        .map(([key, value]) => {
          return `${key}: ${value}`;
        })
        .join("\n")}\n---\n\n`
    : "";
  return `${frontMatter}${body}`;
};

export interface ChatMessagesWithAttributes {
  messages: ChatMessage[];
  attributes?: z.infer<typeof promptFrontMatterSchema>;
}

export const instructPromptToChatMessages = (
  promptText: string
): ChatMessagesWithAttributes => {
  const parsed = fm(promptText);
  const attributes = promptFrontMatterSchema.safeParse(parsed.attributes);
  const body = parsed.body;

  const lines = body.split("\n");
  const messages = [];
  // default to system
  let currentRole: ChatMessage["role"] | null = "system";
  let content: string[] = [];

  lines.forEach((line) => {
    if (line.match(/^# (System|User|Assistant)\s*$/)) {
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

  return {
    attributes: attributes.success ? attributes.data : undefined,
    messages,
  };
};

const createChatMessage = (role: ChatMessage["role"], content: string) => {
  role = role.toLowerCase() as ChatMessage["role"];
  if (!["system", "user", "assistant"].includes(role)) {
    throw new Error(`Invalid role: ${role}`);
  }
  return ChatMessage[role](content);
};
