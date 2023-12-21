import { CandidatePrompt } from "../../../lib/candidatePrompt";
import { ChatMessage } from "../../../openai/messages";
import { BuildPromptInput } from "../schemas/buildPromptInputSchema";

export const simplePrompt = new CandidatePrompt<BuildPromptInput>({
  name: "sr-prompt-engineer",
  compile: function () {
    return [
      ChatMessage.system(
        `
- You are a ChatGPT prompt engineer helping a user create a ChatGPT system instructions prompt.
- Your role is to write a ChatGPT system instructions prompt to achieve the user's goal.
- Aim for extreme brevity and clarity.
- Don't include examples.
- If the prompt requires input variables, use the following format: \${variableName}.
- Format the instructions using a markdown unordered list.
`.trim()
      ),
      ChatMessage.user(
        `
# The goal of the prompt
`.trim()
      ),
    ];
  },
});
