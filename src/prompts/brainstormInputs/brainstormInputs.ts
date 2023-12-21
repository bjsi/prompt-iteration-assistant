import { ZodObject } from "zod";
import { brainstormInputsSchema } from "./schemas/brainstormInputsSchema";
import { Prompt } from "../../lib/prompt";
import { simplePrompt } from "./prompts/simple";

export const BRAINSTORM_INPUTS = "Brainstorm Inputs";

export const brainstormInputs = (
  // dynamic because we're brainstorming inputs for arbitrary prompts we don't know about yet
  inputSchema?: ZodObject<any>
) =>
  new Prompt({
    name: BRAINSTORM_INPUTS,
    description: "Brainstorm inputs to a ChatGPT prompt.",
    input: brainstormInputsSchema,
    // the output schema for this prompt is
    // the input schema for the prompt
    // we're brainstorming inputs to
    output: inputSchema,
    model: "gpt-4",
    max_tokens: 300,
    prompts: [simplePrompt],
  });
