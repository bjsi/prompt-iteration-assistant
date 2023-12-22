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
