import { streamText, generateText, openai } from "modelfusion";
import { ChatCompletionMessageParam } from "openai/resources";
import { printChatMessages, printMarkdown } from "../helpers/printUtils";
import { ChatMessage } from "./messages";

export async function runConcurrent(
  messages: ChatCompletionMessageParam[],
  numCalls: number,
  abortSignal?: AbortSignal
): Promise<string[]> {
  try {
    const results: string[] = [];
    const config = openai.ChatTextGenerator({
      model: "gpt-4",
      maxCompletionTokens: 300,
    });
    if (numCalls === 1) {
      const stream = await streamText(config, messages as any, {
        run: { abortSignal },
      });
      results.push("");
      for await (const part of stream) {
        process.stdout.write(part);
        results[0] += part;
      }
      console.log();
    } else {
      for (let i = 0; i < numCalls; i++) {
        const text = await generateText(config, messages as any, {
          run: { abortSignal },
        });
        results.push(text);

        if (i > 0) {
          printMarkdown("---");
        }
        printMarkdown(`# Result #${i + 1}:`);
        printChatMessages({ messages: [ChatMessage.assistant(text)] });
      }
    }
    return results;
  } catch (e) {
    if (e instanceof Error && e.message === "Aborted") {
      console.log("Stopped.");
    } else {
      console.error(e);
    }
  }
  return [];
}
