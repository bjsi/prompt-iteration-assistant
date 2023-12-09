# Prompt Iteration Assistant

A set of simple tools to accelerate the prompt engineering iteration cycle.

⚠️ Work in Progress ⚠️

## Features

- Simple `Prompt` class abstraction.
- Methods to create [promptfoo](https://promptfoo.dev/) tests with minimal boilerplate.
- Easily register prompts as CLI scripts.
- CLI interface to quickly run tests or try out a prompt with new input.
- [zod](https://zod.dev/) integration for runtime type safety.
- built in dialogs and prompts to help with the entire prompt engineering pipeline 
  - creating prompt instructions
  - creating prompt input and output zod schemas
  - creating in-context examples
  - elaborating on examples
  - quickly run prompts to generate text inside the prompt you are editing, eg. to create example data
  - brainstorming possible inputs and edgecases, creating tests
- easily build your own dialogs
- easily extend for your purposes
- no janky, unpolished UI, just good old fashioned CLI tools

## How to Use

- `npm i prompt-iteration-assistant`

## Examples
