import { BRAINSTORM_IDEAS, brainstormIdeas } from "./examples/simple";
import {
  BRAINSTORM_INPUTS,
  brainstormInputs,
} from "./prompts/brainstormInputs";
import { CREATE_NEW_PROMPT, buildPrompt } from "./prompts/buildPrompt";
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
import { PromptController } from "./lib/promptController";

if (require.main === module) {
  const promptController = new PromptController({
    [CREATE_PROMPT_METADATA]: createPromptMetadata,
    [BRAINSTORM_INPUTS]: brainstormInputs,
    [CREATE_INPUT_SCHEMA]: createInputSchema,
    [CREATE_OUTPUT_SCHEMA]: createOutputSchema,
    // testing
    [BRAINSTORM_IDEAS]: brainstormIdeas,
  });
  promptController.cli();
}
