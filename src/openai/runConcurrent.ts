import { Chat } from "openai/resources";
import { printChatMessages, printMarkdown } from "../helpers/printUtils";
import { ChatMessage } from "./messages";
import * as _ from "remeda";
import { generateText, openai, streamText } from "modelfusion";

export async function generateTextConcurrently(args: {
  messages: ChatMessage[];
  abortSignal?: AbortSignal;
  numCalls: number;
}) {
  const { messages: initialMessages, abortSignal, numCalls: n } = args;
  const config = openai.ChatTextGenerator({
    model: "gpt-4",
    maxCompletionTokens: 300,
  });
  const opts = {
    run: {
      abortSignal,
    },
  };
  return await generateConcurrently({
    stream: () => streamText(config, initialMessages as ChatMessage[], opts),
    generate: () =>
      generateText(config, initialMessages as ChatMessage[], opts),
    numCalls: n,
  });
}

export async function generateConcurrently(args: {
  stream: () => Promise<AsyncIterable<string>>;
  generate: () => Promise<string>;
  numCalls: number;
}): Promise<string[]> {
  try {
    const results: string[] = [];

    if (args.numCalls === 1) {
      const stream = await args.stream();
      results.push("");
      for await (const part of stream) {
        process.stdout.write(part);
        results[0] += part;
      }
      console.log();
    } else {
      const results: string[] = [];
      await Promise.all(
        _.range(0, args.numCalls).map(async () => {
          const text = await args.generate();
          const i = results.push(text) - 1;
          printMarkdown(`# Result #${i + 1}:`);
          printChatMessages({ messages: [ChatMessage.assistant(text)] });
          return text;
        })
      );
      return results;
    }
  } catch (e) {
    if (e instanceof Error && e.message === "Aborted") {
      console.log("Stopped.");
    } else {
      console.error(e);
    }
  }
  return [];
}
