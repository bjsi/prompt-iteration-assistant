import { z } from "zod";
import { CandidatePrompt } from "../lib/candidatePrompt";
import { Prompt } from "../lib/prompt";
import { DefaultRun } from "modelfusion";
import {
  OpenAICostCalculator,
  calculateCost,
  extractSuccessfulModelCalls,
} from "modelfusion-experimental";
import { ChatMessage } from "../openai/messages";
import { toCamelCase } from "../helpers/string";

const exampleNotes =
  "In mathematics, the derivative quantifies the sensitivity of change of a function's output with respect to its input. Derivatives are a fundamental tool of calculus. For example, the derivative of the position of a moving object with respect to time is the object's velocity: this measures how quickly the position of the object changes when time advances.";

const input = z.object({
  notes: z.string(),
});

const pInstruct = new Prompt({
  name: "Write Summary",
  input,
  model: "gpt-3.5-turbo-instruct",
  max_tokens: 300,
  prompts: [
    new CandidatePrompt<z.infer<typeof input>>({
      name: "test",
      compile() {
        return `Your task is to read the users notes and then write a summary of the notes in your own words:\n${this.getVariable(
          "notes"
        )}\n\nSummary:`;
      },
    }),
  ],
});

const pChat = new Prompt({
  name: "Write Summary",
  input,
  model: "gpt-4",
  max_tokens: 300,
  prompts: [
    new CandidatePrompt<z.infer<typeof input>>({
      name: "test",
      compile() {
        return [
          ChatMessage.system(
            `Your task is to read the users notes and then write a summary of the notes in your own words`
          ),
          ChatMessage.system(`Notes: ${this.getVariable("notes")}`),
        ];
      },
    }),
  ],
});

// test("chat message string output", async () => {
//   const res = await pChat.calculateCost(
//     { notes: exampleNotes },
//     `The derivative in mathematics evaluates how much the output of a function alters when influenced by changes in its inputs. It's a crucial component of calculus. A practical example of this is when the derivative of a moving object's position concerning time presents the object's speed, indicating the rapidity of the object's position changes as time progresses.`
//   );
//   expect(res.cost.formatAsDollarAmount({ decimals: 4 })).toEqual("$0.071");
// });

// test("chat message object output", async () => {
//   pChat.output = z.object({
//     summary: z.string(),
//   });
//   const res = await pChat.calculateCost(
//     { notes: exampleNotes },
//     JSON.stringify({
//       summary: ``,
//     })
//   );
//   expect(res.cost.formatAsDollarAmount({ decimals: 4 })).toEqual("$0.071");
// });

// test("instruct message", async () => {
//   const res = await pInstruct.calculateCost(
//     { notes: exampleNotes },
//     `Derivatives are a crucial component of calculus that show the rate of change between a function's output and its input. They are commonly used in math to calculate velocity, which is how fast an object's position changes over time.`
//   );
//   expect(res.cost.formatAsDollarAmount({ decimals: 4 })).toEqual("$0.002");
// });

if (require.main === module) {
  (async () => {
    const run = new DefaultRun();
    const promptVariables = { notes: exampleNotes };
    pChat.output = z.object({
      summary: z.string(),
    });

    const out = await pChat.run({
      promptVariables,
      stream: false,
      run,
    });
    console.log("output", out);
    const mfCost = await calculateCost({
      calls: extractSuccessfulModelCalls(run.events),
      costCalculators: [new OpenAICostCalculator()],
    });

    const myCost = await pChat.calculateCost(promptVariables);
    console.log(`MF Cost: ${mfCost.formatAsDollarAmount({ decimals: 4 })}`);
    console.log(
      `My cost: ${myCost.cost.formatAsDollarAmount({ decimals: 4 })}`
    );
  })();
}
