/*
 * Available OpenAI chat models.
 * @see https://platform.openai.com/docs/models/
 */
export const OPENAI_CHAT_MODEL_NAME = [
  "gpt-4",
  "gpt-4-0314",
  "gpt-4-0613",
  "gpt-4-1106-preview",
  "gpt-4-vision-preview",
  "gpt-4-32k",
  "gpt-4-32k-0314",
  "gpt-4-32k-0613",
  "gpt-3.5-turbo",
  "gpt-3.5-turbo-1106",
  "gpt-3.5-turbo-0301",
  "gpt-3.5-turbo-0613",
  "gpt-3.5-turbo-16k",
  "gpt-3.5-turbo-16k-0613",
] as const;

export type OPENAI_CHAT_MODEL_NAME = (typeof OPENAI_CHAT_MODEL_NAME)[number];

export const OPENAI_INSTRUCT_MODEL_NAME = ["gpt-3.5-turbo-instruct"] as const;

export type OPENAI_INSTRUCT_MODEL_NAME =
  (typeof OPENAI_INSTRUCT_MODEL_NAME)[number];
