import {
  CREATE_INPUT_SCHEMA,
  createInputSchema,
} from "./prompts/createInputSchema/createInputSchema";
import {
  CREATE_OUTPUT_SCHEMA,
  createOutputSchema,
} from "./prompts/createOutputSchema/createOutputSchema";
import {
  CREATE_PROMPT_METADATA,
  createPromptMetadata,
} from "./prompts/createPromptMetadata/createPromptMetadata";
import { PromptController } from "./lib/promptController";
import {
  BRAINSTORM_INPUTS,
  brainstormInputs,
} from "./prompts/brainstormInputs/brainstormInputs";

/**
 * Run this script to use prompt-iteration-assistant to improve prompt-iteration-assistant :)
 */
if (require.main === module) {
  const promptController = new PromptController({
    [CREATE_PROMPT_METADATA]: createPromptMetadata,
    [BRAINSTORM_INPUTS]: brainstormInputs,
    [CREATE_INPUT_SCHEMA]: createInputSchema,
    [CREATE_OUTPUT_SCHEMA]: createOutputSchema,
  });
  promptController.cli();
}
