# Prompt Iteration Assistant

A set of simple tools to accelerate the prompt engineering iteration cycle.

⚠️ Work in Progress ⚠️

## Motivation

I work full time as an AI Engineer at RemNote where I am building the RemNote Flashcard Copilot. On the side I'm working with OpenPipe to build Open Recommender, an open source LLM-powered YouTube video recommendation system. 

A huge portion of my time in both of these projects goes towards prompt engineering, iteration and evaluation. I realised recently that while each step in the prompt iteration cycle is very simple, there aren't any tools that support it in the way I want, so the process ends up feeling quite frustrating. Prompt Iteration Assistant is my attempt to build a set of simple tools to make prompt engineering 10x easier and faster.

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

- `npm i prompt-iteration-assistant`.
- See the `src/examples` folder or get in touch with me if you get stuck!
