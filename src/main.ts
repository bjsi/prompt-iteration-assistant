import {
  BRAINSTORM_INPUTS,
  brainstormInputs,
} from "./prompts/brainstormInputs";
import {
  CREATE_INPUT_SCHEMA,
  createInputSchema,
} from "./prompts/createInputSchema";
import {
  CREATE_OUTPUT_SCHEMA,
  createOutputSchema,
} from "./prompts/createOutputSchema";
import {
  CREATE_PROMPT_METADATA,
  createPromptMetadata,
} from "./prompts/createPromptMetadata";
import { PromptController } from "./prompts/promptController";

if (require.main === module) {
  const promptController = new PromptController({
    [CREATE_PROMPT_METADATA]: createPromptMetadata,
    [BRAINSTORM_INPUTS]: brainstormInputs,
    [CREATE_INPUT_SCHEMA]: createInputSchema,
    [CREATE_OUTPUT_SCHEMA]: createOutputSchema,
  });
  promptController.cli();
}
