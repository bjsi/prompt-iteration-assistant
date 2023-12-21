import { CandidatePrompt } from "../../../lib/candidatePrompt";
import { BrainstormInputsInput } from "../schemas/brainstormInputsSchema";
import { ChatMessage } from "../../../openai/messages";

export const simplePrompt = new CandidatePrompt<BrainstormInputsInput>({
  name: "simple",
  compile: function () {
    return [
      ChatMessage.system(
        `
# Instructions
- Act as a senior ChatGPT prompt engineer.
- You are helping the user write tests for their prompt, as if it was a function
- Your role is to come up with inputs to the prompt to use in tests.
        `.trim()
      ),
      ChatMessage.user(
        `# My ChatGPT Prompt:\n"""${this.getVariable("prompt")}"""`
      ),
    ];
  },
});
