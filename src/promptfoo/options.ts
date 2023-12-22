import { ChatCompletionMessageParam } from "openai/resources";
import { OPENAI_CHAT_MODEL, OPENAI_INSTRUCT_MODEL } from "../openai/models";

export const plainTextTestOptions = (opts: {
  prompts: (ChatCompletionMessageParam[] | string)[];
  model: OPENAI_CHAT_MODEL | OPENAI_INSTRUCT_MODEL;
  stopSequences?: string[];
  temperature?: number;
}) => {
  return {
    prompts: opts.prompts.map((p) => JSON.stringify(p)),
    providers: [
      {
        id: `openai:${opts.model}`,
      },
    ],
  };
};

export const functionCallTestOptions = (opts: {
  prompts: (ChatCompletionMessageParam[] | string)[];
  functions?: any[];
  model: OPENAI_CHAT_MODEL | OPENAI_INSTRUCT_MODEL;
  stopSequences?: string[];
  temperature?: number;
}) => {
  return {
    prompts: opts.prompts.map((p) => JSON.stringify(p)),
    providers: [
      {
        id: `openai:${opts.model}`,
        config: {
          functions: opts.functions,
          stopSequences: opts.stopSequences,
          temperature: opts.temperature,
        },
      },
    ],
    defaultTest: {
      options: {
        postprocess: "JSON.stringify(JSON.parse(output.arguments), null, 2)",
      },
    },
  };
};

export const customTestOptions = <Input extends Record<string, any>>(opts: {
  prompts: (ChatCompletionMessageParam[] | string)[];
  callApi: (input: Input) => Promise<string | object | undefined>;
}) => {
  return {
    prompts: opts.prompts.map((p) => JSON.stringify(p)),
    providers: async (_: string, ctx?: { vars: Record<string, any> }) => {
      if (!ctx?.vars) throw new Error("vars not defined");
      const output = await opts.callApi(ctx?.vars as Input);
      return {
        output,
      };
    },
  };
};
