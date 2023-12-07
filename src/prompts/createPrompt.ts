import { z } from "zod";
import { Prompt } from "../prompt";

const createPrompt = new Prompt({
  name: "createPrompt",
  description: "Create a new prompt",
  input: z.object({
    goal: z.string(),
    idealOutput: z.string(),
  }),
  model: "gpt-4",
  prompts: [
    {
      name: "",
      compile: (vars) => [],
    },
  ],
});

function cli() {}

if (require.main === module) {
}
