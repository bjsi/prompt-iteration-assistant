import Table from "tty-table";
import { EvaluateSummary } from "promptfoo";
import chalk from "chalk";

// promptfoo uses cli-table3 which has a bug where it hangs if the
// amount of data is too large, so we use tty-table instead.

export function generateTable(
  summary: EvaluateSummary,
  tableCellMaxLength = 250,
  maxRows = 25
) {
  const head = summary.table.head;
  const body = summary.table.body.slice(0, maxRows).map((row) => [
    ...row.vars.map((v) => {
      if (v.length > tableCellMaxLength) {
        v = v.slice(0, tableCellMaxLength) + "...";
      }
      return v;
    }),
    ...row.outputs.map(({ pass, score, text }) => {
      if (text.length > tableCellMaxLength) {
        text = text.slice(0, tableCellMaxLength) + "...";
      }
      if (pass) {
        return chalk.green("[PASS] ") + text;
      } else if (!pass) {
        // color everything red up until '---'
        return (
          chalk.red("[FAIL] ") +
          text
            .split("---")
            .map((c, idx) => (idx === 0 ? chalk.red.bold(c) : c))
            .join("---")
        );
      }
      return text;
    }),
  ]);

  const headerValues = head.vars.concat(
    head.prompts.map((prompt) => prompt.display)
  );

  const hasLongLine = (headerIdx: number) =>
    body.some((row) =>
      row[headerIdx].split("\n").some((line) => line.length > 50)
    );

  const header = headerValues.map((value, i) => ({
    value,
    align: "left",
    headerAlign: "left",
    width: hasLongLine(i) ? 50 : undefined,
  }));

  const table = Table(header, body);
  return table;
}

// if (require.main === module) {
//   const summary: EvaluateSummary = {
//     table: {
//       head: {
//         prompts: [
//           {
//             display: "prompt 1",
//             id: "prompt1",
//           },
//           {
//             display: "prompt 2",
//             id: "prompt2",
//           },
//         ],
//         vars: ["var 1", "var2"],
//       },
//       body: [
//         {
//           vars: ["hello", "world"],
//           outputs: [
//             {
//               pass: true,
//               score: 0.5,
//               text: `
//  npm notice 3.4kB  dist/helpers/printUtils.js
// npm notice 396B   dist/helpers/stringUtils.d.ts
// npm notice 2.3kB  dist/helpers/stringUtils.js
// npm notice 177B   dist/helpers/zodUtils.d.ts
// npm notice 939B   dist/helpers/zodUtils.js
// npm notice 204B   dist/index.d.ts
// npm notice 891B   dist/index.js
// npm notice 2.2kB  dist/lib/candidatePrompt.d.ts
// npm notice 2.7kB  dist/lib/candidatePrompt.js
// npm notice 590B   dist/lib/getValuesForSchema.d.ts
// npm notice 5.1kB  dist/lib/getValuesForSchema.js
// npm notice 5.2kB  dist/lib/prompt.d.ts
// npm notice 17.1kB dist/lib/prompt.js
// npm notice 391B   dist/lib/promptController.d.ts
// npm notice 4.5kB  dist/lib/promptController.js
// npm notice 611B   dist/lib/substitutePromptVars.d.ts
// npm notice 997B   dist/lib/substitutePromptVars.js
// npm notice 2.3kB  dist/openai/messages.d.ts
// npm notice 3.9kB  dist/openai/messages.js
// npm notice 542B   dist/openai/models.d.ts
// npm notice 649B   dist/openai/models.js
// npm notice 389B   dist/openai/runConcurrent.d.ts
// npm notice 5.4kB  dist/openai/runConcurrent.js
// npm notice 564B   dist/promptfoo/assertions.d.ts
// npm notice 983B   dist/promptfoo/assertions.js
// npm notice 269B   dist/promptfoo/generateTable.d.ts
// npm notice 2.2kB  dist/promptfoo/generateTable.js
// npm notice 788B   dist/promptfoo/options.d.ts
// npm notice 975B   dist/promptfoo/options.js
// npm notice 572B   dist/prompts/actions.d.ts
// npm notice 3.4kB  dist/prompts/actions.js
// npm notice 441B   dist/prompts/brainstormInputs.d.ts
// npm notice 1.5kB  dist/prompts/brainstormInputs.js
// npm notice 1.1kB  dist/prompts/buildPrompt.d.ts
// npm notice 29.1kB dist/prompts/buildPrompt.js
// npm notice 393B   dist/prompts/createInputSchema.d.ts
// npm notice 1.4kB  dist/prompts/createInputSchema.js
// npm notice 58B    dist/prompts/createNewTest.d.ts
// npm notice 197B   dist/prompts/createNewTest.js
// npm notice 398B   dist/prompts/createOutputSchema.d.ts
// npm notice 3.7kB  dist/prompts/createOutputSchema.js
// npm notice 1.2kB  package.json
// npm notice === Tarball Details ===
// npm notice name:          prompt-iteration-assistant
// npm notice version:       0.0.9
// npm notice filename:      prompt-iteration-assistant-0.0.9.tgz
// npm notice package size:  24.1 kB
// npm notice unpacked size: 113.7 kB
// npm notice shasum:        a639d09cc442cdecd2dd1fc391684f796f41c8ae
// npm notice integrity:     sha512-pDi/UOSg5Yf4h[...]a38blgs9Wni2A==
// npm notice total files:   46
// npm notice
// npm notice Publishing to https://registry.npmjs.org/ with tag latest and default access (dry-run)
// + prompt-iteration-assistant@0.0.9
// pu%
// ➜ prompt-iteration-assistant main ✓ npm publish
// npm notice
// npm notice 📦  prompt-iteration-assistant@0.0.9
// npm notice === Tarball Contents ===
// npm notice 611B   CHANGELOG.md
// npm notice 1.1kB  LICENSE
// npm notice 1.0kB  README.md
// npm notice 889B   dist/helpers/printUtils.d.ts
// npm notice 3.4kB  dist/helpers/printUtils.js
// npm notice 396B   dist/helpers/stringUtils.d.ts
// npm notice 2.3kB  dist/helpers/stringUtils.js
// npm notice 177B   dist/helpers/zodUtils.d.ts
// npm notice 939B   dist/helpers/zodUtils.js
// npm notice 204B   dist/index.d.ts
// npm notice 891B   dist/index.js
// npm notice 2.2kB  dist/lib/candidatePrompt.d.ts
// npm notice 2.7kB  dist/lib/candidatePrompt.js
// npm notice 590B   dist/lib/getValuesForSchema.d.ts
// npm notice 5.1kB  dist/lib/getValuesForSchema.js
// npm notice 5.2kB  dist/lib/prompt.d.ts
// npm notice 17.1kB dist/lib/prompt.js
// npm notice 391B   dist/lib/promptController.d.ts
// npm notice 4.5kB  dist/lib/promptController.js
// npm notice 611B   dist/lib/substitutePromptVars.d.ts
// npm notice 997B   dist/lib/substitutePromptVars.js
// npm notice 2.3kB  dist/openai/messages.d.ts
// npm notice 3.9kB  dist/openai/messages.js
// npm notice 542B   dist/openai/models.d.ts
// npm notice 649B   dist/openai/models.js
// npm notice 389B   dist/openai/runConcurrent.d.ts
// npm notice 5.4kB  dist/openai/runConcurrent.js
// npm notice 564B   dist/promptfoo/assertions.d.ts
// npm notice 983B   dist/promptfoo/assertions.js
// npm notice 269B   dist/promptfoo/generateTable.d.ts
// npm notice 2.2kB  dist/promptfoo/generateTable.js
// npm notice 788B   dist/promptfoo/options.d.ts
// npm notice 975B   dist/promptfoo/options.js
// npm notice 572B   dist/prompts/actions.d.ts
// npm notice 3.4kB  dist/prompts/actions.js
// npm notice 441B   dist/prompts/brainstormInputs.d.ts
// npm notice 1.5kB  dist/prompts/brainstormInputs.js
// npm notice 1.1kB  dist/prompts/buildPrompt.d.ts
// npm notice 29.1kB dist/prompts/buildPrompt.js
// npm notice 393B   dist/prompts/createInputSchema.d.ts
// npm notice 1.4kB  dist/prompts/createInputSchema.js
// npm notice 58B    dist/prompts/createNewTest.d.ts
// npm notice 197B   dist/prompts/createNewTest.js
// npm notice 398B   dist/prompts/createOutputSchema.d.ts
// npm notice 3.7kB  dist/prompts/createOutputSchema.js
// npm notice 1.2kB  package.json
// npm notice === Tarball Details ===
// npm notice name:          prompt-iteration-assistant
// npm notice version:       0.0.9
// npm notice filename:      prompt-iteration-assistant-0.0.9.tgz
// npm notice package size:  24.1 kB
// npm notice unpacked size: 113.7 kB
// npm notice shasum:        a639d09cc442cdecd2dd1fc391684f796f41c8ae
// npm notice integrity:     sha512-pDi/UOSg5Yf4h[...]a38blgs9Wni2A==
// npm notice total files:   46
// npm notice
// `,
//             },
//             {
//               pass: false,
//               score: 0.5,
//               text: "output 2",
//             },
//           ],
//         },
//         {
//           vars: ["something", "cool"],
//           outputs: [
//             {
//               pass: true,
//               score: 0.5,
//               text: "output 3",
//             },
//             {
//               pass: false,
//               score: 0.5,
//               text: "output 4",
//             },
//           ],
//         },
//       ],
//     },
//   };
//   const table = generateTable(summary, Number.MAX_SAFE_INTEGER);
//   console.log(table.render());
// }
