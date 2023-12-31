import { ChatCompletionMessageParam } from "openai/resources";
import { chatMessagesToInstructPrompt } from "../openai/messages";
import { getPromptVars } from "./substitutePromptVars";

/**
 * @example
 * ```ts
 interface ExamplePromptArgs {
  name: string;
 }

 const examplePrompt = new CandidatePrompt<ExamplePromptArgs>({
   name: "Greet the user",
   compile: function () {
     return [
       ChatMessage.user(
         // don't forget to use this.getVariable() instead of string interpolation! 
         `Please write a greeting message for ${this.getVariable("name")}.`
       ),
     ];
   },
 });

 examplePrompt
   .withVariables({
     name: "James",
   })
   .compile();
 * ```
 */
export class CandidatePrompt<Variables extends {}> {
  /**
   * The name of the prompt.
   */
  name: string;
  /**
   * If true, the prompt will be compiled without the variables filled in.
   */
  _raw = false;
  /**
   * A function that returns an array of chat messages with or without the variables
   * filled in, depending on the value of `raw`.
   *
   * NOTE: can't be an arrow function because you need to access `this` to get the variables.
   */
  compile: (
    this: CandidatePrompt<Variables>
  ) => ChatCompletionMessageParam[] | string;
  private unboundCompile: () => ChatCompletionMessageParam[] | string;

  /**
   * The variables to be used in the prompt. Use `this.getVariable()` to access them.
   */
  variables: Variables = {} as any;

  constructor(args: {
    name: string;
    compile: (
      this: CandidatePrompt<Variables>
    ) => ChatCompletionMessageParam[] | string;
    raw?: boolean;
  }) {
    this.name = args.name;
    this.compile = args.compile.bind(this);
    this.unboundCompile = args.compile;
    this._raw = !!args.raw;
  }

  withVariables(args: Variables) {
    this.variables = args;
    return this;
  }

  /**
   * Run `prompt.raw().compile()` to get the raw version of the prompt without the ${variables} filled in.
   */
  raw() {
    // need to make a copy of the prompt so that we don't mutate the original
    return new CandidatePrompt<Variables>({
      name: this.name,
      compile: this.unboundCompile,
      raw: true,
    });
  }

  /**
   * Gets all of the ${variableName} placeholders in the prompt as a list.
   */
  getAllVariablePlaceholders() {
    const messages = this.raw().compile();
    const asString = Array.isArray(messages)
      ? chatMessagesToInstructPrompt({ messages })
      : messages;
    const vars = getPromptVars(asString);
    return vars;
  }

  /**
   * Use this method to access the variables in the prompt instead of string interpolation.
   *
   * It's useful to have access to the raw version of the prompt without the variables
   * filled in by the string interpolation because we can pass the raw prompt to GPT eg.
   * to generate a new prompt based on the current prompt. This allows us to keep the
   * type safety benefits of using string interpolation but also get the raw string version.
   */
  getVariable<K extends keyof Variables>(key: K) {
    if (this._raw) {
      return `\${${key.toString()}}`;
    } else {
      const value = this.variables[key];
      if (value === undefined) {
        throw new Error(
          `Variable ${key.toString()} not found for prompt ${this.name}`
        );
      }
      return value;
    }
  }
}
