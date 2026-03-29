// Keep the model name in one place so the rest of the code does not depend on it.
const MODEL = "qwen/qwen3-32b";

// Build the agent as plain data plus functions.
export function newAgent(client, getUserMessage, tools, systemInstruction) {
  return {
    client,
    getUserMessage,
    systemInstruction,
    tools,
    toolDefinitions: tools.map((tool) => ({
      type: "function",
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    })),
    toolsByName: new Map(tools.map((tool) => [tool.name, tool])),
    run() {
      return runAgent(this);
    },
  };
}

// Run the main terminal loop.
// The `readUserInput` flag matters once tools are involved:
// after a tool call we want to send the tool result back to the model immediately,
// without waiting for the user to type another message.
async function runAgent(agent) {
  const conversation = [];

  console.log("Chat with Groq (use 'ctrl-c' to quit)");

  let readUserInput = true;

  while (true) {
    if (readUserInput) {
      const userInput = await agent.getUserMessage();
      if (userInput === null) {
        break;
      }

      conversation.push(createUserTextMessage(userInput));
    }

    const response = await runInference(agent, conversation);
    const message = response.choices?.[0]?.message;

    if (!message) {
      throw new Error("Model response did not include a message.");
    }

    conversation.push(createAssistantMessage(message));

    const toolCalls = message.tool_calls ?? [];
    const text =
      typeof message.content === "string" ? message.content.trim() : "";

    if (text) {
      console.log(`\u001b[93mGroq\u001b[0m: ${text}`);
    }

    if (toolCalls.length === 0) {
      readUserInput = true;
      continue;
    }

    for (const toolCall of toolCalls) {
      const toolResponseMessage = await executeToolCall(agent, toolCall);
      conversation.push(toolResponseMessage);
    }

    readUserInput = false;
  }
}

// Send the conversation history plus available tools to Groq.
async function runInference(agent, conversation) {
  return agent.client.chat.completions.create({
    model: MODEL,
    messages: createMessages(agent, conversation),
    tools: agent.toolDefinitions,
    tool_choice: "auto",
    max_completion_tokens: 1024,
  });
}

// Look up the requested tool, execute it, and package the result
// in the tool-message format Groq expects on the next turn.
async function executeToolCall(agent, toolCall) {
  const toolName = toolCall.function?.name;
  const tool = agent.toolsByName.get(toolName);

  if (!tool) {
    return createToolResultMessage(
      toolCall.id,
      toolName,
      JSON.stringify({ error: `Tool not found: ${toolName}` }),
    );
  }

  let args;

  try {
    args = JSON.parse(toolCall.function.arguments ?? "{}");
  } catch {
    return createToolResultMessage(
      toolCall.id,
      tool.name,
      JSON.stringify({ error: "Tool arguments were not valid JSON." }),
    );
  }

  console.log(`\u001b[92mtool\u001b[0m: ${tool.name}(${JSON.stringify(args)})`);

  try {
    const output = await tool.execute(args);
    return createToolResultMessage(
      toolCall.id,
      tool.name,
      JSON.stringify({ output }),
    );
  } catch (error) {
    return createToolResultMessage(
      toolCall.id,
      tool.name,
      JSON.stringify({ error: error.message }),
    );
  }
}

// Build the full messages array, including the system instruction first.
function createMessages(agent, conversation) {
  if (!agent.systemInstruction) {
    return conversation;
  }

  return [
    {
      role: "system",
      content: agent.systemInstruction,
    },
    ...conversation,
  ];
}

// Build a standard user text message for the conversation history.
function createUserTextMessage(text) {
  return {
    role: "user",
    content: text,
  };
}

// Build the assistant message shape so tool calls can be preserved in history.
function createAssistantMessage(message) {
  return {
    role: "assistant",
    content: message.content ?? "",
    tool_calls: message.tool_calls,
  };
}

// Build the tool-result message shape Groq expects on the next turn.
function createToolResultMessage(toolCallId, name, content) {
  return {
    role: "tool",
    tool_call_id: toolCallId,
    name,
    content,
  };
}
