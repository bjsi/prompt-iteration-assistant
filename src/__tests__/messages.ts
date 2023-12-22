import {
  ChatMessage,
  chatMessagesToInstructPrompt,
  instructPromptToChatMessages,
} from "../openai/messages";

test("converting back and forth between instruct and chat with roles", () => {
  const messages: ChatMessage[] = [ChatMessage.system("Hello")];
  const instruct = chatMessagesToInstructPrompt({
    messages,
    includeRoles: true,
  });
  expect(instruct).toEqual(`# System\nHello`);
  const messages2 = instructPromptToChatMessages(instruct);
  expect(messages2.messages).toEqual(messages);
});

test("converting back and forth between instruct and chat without roles", () => {
  const messages: ChatMessage[] = [ChatMessage.system("Hello")];
  const instruct = chatMessagesToInstructPrompt({
    messages,
    includeRoles: false,
  });
  expect(instruct).toEqual(`Hello`);
  const messages2 = instructPromptToChatMessages(instruct);
  expect(messages2.messages).toEqual(messages);
});

test("attributes", () => {
  const messages: ChatMessage[] = [ChatMessage.system("Hello")];
  const instruct = chatMessagesToInstructPrompt({
    messages,
    attributes: {
      name: "test",
      description: "test description",
    },
  });
  expect(instruct).toEqual(`---
name: test
description: test description
---

Hello`);
  const messages2 = instructPromptToChatMessages(instruct);
  expect(messages2.messages).toEqual(messages);
  expect(messages2.attributes).toEqual({
    name: "test",
    description: "test description",
  });
});
