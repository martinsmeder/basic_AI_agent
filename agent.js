import { FunctionCallingConfigMode } from "@google/genai";

// Keep the model name in one place so the rest of the code does not depend on it.
const MODEL = "gemini-2.5-flash";

// Build the agent as plain data plus functions.
export function newAgent(client, getUserMessage, tools) {
  return {
    client,
    getUserMessage,
    tools,
    run() {
      return runAgent(this);
    },
    runInference(conversation) {
      return runInference(this, conversation);
    },
    executeFunctionCall(functionCall) {
      return executeFunctionCall(this, functionCall);
    },
  };
}

// Run the main terminal loop.
// The `readUserInput` flag matters once tools are involved:
// after a tool call we want to send the tool result back to Gemini immediately,
// without waiting for the user to type another message.
async function runAgent(agent) {
  const conversation = [];

  console.log("Chat with Gemini (use 'ctrl-c' to quit)");

  let readUserInput = true;

  while (true) {
    if (readUserInput) {
      const userInput = await agent.getUserMessage();
      if (userInput === null) {
        break;
      }

      conversation.push({
        role: "user",
        parts: [{ text: userInput }],
      });
    }

    const response = await agent.runInference(conversation);
    const modelContent = response.candidates?.[0]?.content;

    if (!modelContent) {
      throw new Error("Model response did not include content.");
    }

    conversation.push(modelContent);

    const functionCalls = response.functionCalls ?? [];
    const text = response.text?.trim();

    if (text) {
      console.log(`\u001b[93mGemini\u001b[0m: ${text}`);
    }

    if (functionCalls.length === 0) {
      readUserInput = true;
      continue;
    }

    const functionResponseParts = [];

    for (const functionCall of functionCalls) {
      const functionResponsePart =
        await agent.executeFunctionCall(functionCall);
      functionResponseParts.push(functionResponsePart);
    }

    conversation.push({
      role: "user",
      parts: functionResponseParts,
    });

    readUserInput = false;
  }
}

// Send the conversation history plus available tools to Gemini.
async function runInference(agent, conversation) {
  return agent.client.models.generateContent({
    model: MODEL,
    contents: conversation,
    config: {
      maxOutputTokens: 1024,
      tools: [
        {
          functionDeclarations: agent.tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters,
          })),
        },
      ],
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingConfigMode.AUTO,
        },
      },
    },
  });
}

// Look up the requested tool, execute it, and package the result
// in the function-response format Gemini expects on the next turn.
async function executeFunctionCall(agent, functionCall) {
  const tool = agent.tools.find(
    (candidate) => candidate.name === functionCall.name,
  );

  if (!tool) {
    return {
      functionResponse: {
        id: functionCall.id,
        name: functionCall.name,
        response: {
          error: `Tool not found: ${functionCall.name}`,
        },
      },
    };
  }

  const args = functionCall.args ?? {};
  console.log(`\u001b[92mtool\u001b[0m: ${tool.name}(${JSON.stringify(args)})`);

  try {
    const output = await tool.execute(args);

    return {
      functionResponse: {
        id: functionCall.id,
        name: tool.name,
        response: {
          output,
        },
      },
    };
  } catch (error) {
    return {
      functionResponse: {
        id: functionCall.id,
        name: tool.name,
        response: {
          error: error.message,
        },
      },
    };
  }
}
