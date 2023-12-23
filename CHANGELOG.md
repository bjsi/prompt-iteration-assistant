## 0.0.25

- Fix function calling misbehaving in tests (again).

## 0.0.23

- Fix function calling misbehaving in tests.

## 0.0.22

- Add `onlyTestMainPrompt` option to test methods.

## 0.0.21

- Fix model params not assigned properly (again).

## 0.0.20

- Fix model params not assigned properly.

## 0.0.19

- Fix options not passed to tests.

## 0.0.18

- Add params to `prompt.chooseCandidatePrompt` function.

## 0.0.17

- Add `prompt.chooseCandidatePrompt` function.

## 0.0.16

- Support OpenAI instruct call stop sequences.
- Export `ExampleDataset` type.
- Support basic string prompts.
- Better instruct model support.

## 0.0.15

- Export `toCamelCase` string utility function.
- Add assertions rest parameter to `withCustomTest` function.

## 0.0.14

- Export more CLI dialog helpers.
- Support adding custom CLI dialog commands for each prompt using the `prompt.withCommand()` function.

## 0.0.13

- Remove required `state` field from the `Prompt` class.
- Improve typing.
- Add support for custom prompt run function in tests. See `prompt.withCustomTest`.

## 0.0.12

- More CLI table fixes.

## 0.0.11

- More CLI table fixes.

## 0.0.10

- More CLI table fixes.

## 0.0.9

- Fix test results table cell length limit.

## 0.0.8

- Fix test results table not showing up.
- Fix back command in CLI dialogs.
- Allow repeating tests.

## 0.0.7

- Fix running tests by name not working.
- Changed `skipCache` to `useCache` with default of `true` in `test` function.

## 0.0.6

- Fix bug where `confirm` function was undefined.

## 0.0.5

- Fixed more ESM madness.

## 0.0.4

- Forgot to run build... :D

## 0.0.3

- Fixed `package.json` to publish as commonjs.

## 0.0.2

- Fixed a collection of bugs and inconveniences in the CLI dialog menus.

## 0.0.1

- Initial release 🎉.
