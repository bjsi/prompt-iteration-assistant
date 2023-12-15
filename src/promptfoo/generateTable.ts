import Table from "cli-table";
import { EvaluateSummary } from "promptfoo";
import chalk from "chalk";

// promptfoo uses cli-table3 which has a bug where it hangs if the
// amount of data is too large, so we use cli-table instead.

export function generateTable(
  summary: EvaluateSummary,
  tableCellMaxLength = 250,
  maxRows = 25
) {
  const maxWidth = process.stdout.columns ? process.stdout.columns - 10 : 120;
  const head = summary.table.head;
  const headLength = head.prompts.length + head.vars.length;
  const table = new Table({
    head: [...head.vars, ...head.prompts.map((prompt) => prompt.display)],
    colWidths: Array(headLength).fill(Math.floor(maxWidth / headLength)),
    style: {
      head: ["blue", "bold"],
    },
  });
  // Skip first row (header) and add the rest. Color PASS/FAIL
  for (const row of summary.table.body.slice(0, maxRows)) {
    table.push([
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
  }
  return table;
}
