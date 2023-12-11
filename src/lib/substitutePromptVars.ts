import { ChatMessage } from "../openai/messages";

export const substitutePromptVars = (
  text: string,
  variables: Record<string, string>
) => {
  // eg. ${name}
  return text.replace(/\${\s*(\w+)\s*}/g, (_, key) => {
    return variables[key] || "";
  });
};

export const substituteChatPromptVars = (
  messages: ChatMessage[],
  variables: Record<string, string>
) => {
  const compiledPrompt = messages.map((m) => ({
    ...m,
    content: substitutePromptVars(m.content || "", variables),
  }));
  return compiledPrompt;
};
