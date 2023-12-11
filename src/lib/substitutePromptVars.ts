import { ChatMessage } from "../openai/messages";

/**
 * find names of variables in a string
 */
export const getPromptVars = (text: string) => {
  // eg. ${name}
  const matches = text.match(/\${\s*(\w+)\s*}/g);
  if (!matches) return [];
  return matches.map((m) => m.slice(2, -1));
};

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
