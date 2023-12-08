import { editor } from "@inquirer/prompts";
import { Action } from "../prompt";

async function edit(input: string) {
  return await editor({
    default: input,
    message: "",
    waitForUseInput: false,
  });
}

export function editAction(): Action<{ input: string }, string> {
  return {
    name: "edit",
    action: async (args) => {
      const answer = await edit(args.input);
      return answer;
    },
  };
}
