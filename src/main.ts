import {
  CREATE_PROMPT_METADATA,
  createPromptMetadata,
} from "./prompts/createPromptMetadata";
import { PromptController } from "./prompts/promptController";

if (require.main === module) {
  const promptController = new PromptController({
    [CREATE_PROMPT_METADATA]: createPromptMetadata,
  });
  promptController.cli();
}
