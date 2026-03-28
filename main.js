import { FunctionCallingConfigMode, GoogleGenAI, Type } from "@google/genai";
import "dotenv/config";
import { readFile } from "node:fs/promises";
import { stdin as input, stdout as output, cwd } from "node:process";
import path from "node:path";
import readline from "node:readline/promises";

// Keep the model name in one place so the rest of the code does not depend on it.
const MODEL = "gemini-3-flash-preview";

// Define the tool in one object so we can both advertise it to Gemini
// and execute it locally when Gemini asks for it.
const readFileTool = {
  name: "read_file",
  description:
    "Read the contents of a given relative file path. Use this when you want to see what's inside a file. Do not use this with directory names.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      path: {
        type: Type.STRING,
        description: "The relative path of a file in the working directory.",
      },
    },
    required: ["path"],
    additionalProperties: false,
  },
  execute: executeReadFile,
};

// Build the agent as plain data plus functions.
function newAgent(client, getUserMessage, tools) {
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

// Read one file from the current working directory.
// This keeps the tool scoped to relative paths inside the project.
async function executeReadFile(input) {
  const filePath = input.path;

  if (typeof filePath !== "string" || filePath.trim() === "") {
    throw new Error("The `path` argument must be a non-empty string.");
  }

  if (path.isAbsolute(filePath)) {
    throw new Error("The `path` argument must be a relative path.");
  }

  const workingDirectory = cwd();
  const resolvedPath = path.resolve(workingDirectory, filePath);
  const relativePath = path.relative(workingDirectory, resolvedPath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(
      "The `path` argument must stay inside the working directory.",
    );
  }

  const fileContents = await readFile(resolvedPath, "utf8");
  return fileContents;
}

// Set up the SDK client and terminal input, then start the agent.
async function main() {
  const ai = new GoogleGenAI({});
  const rl = readline.createInterface({ input, output });

  // Read one line from the terminal each time the agent asks for input.
  const getUserMessage = async () => {
    try {
      return await rl.question("\u001b[94mYou\u001b[0m: ");
    } catch {
      return null;
    }
  };

  const tools = [readFileTool];
  const agent = newAgent(ai, getUserMessage, tools);

  try {
    await agent.run();
  } catch (error) {
    console.error(`Error: ${error.message}`);
  } finally {
    rl.close();
  }
}

await main();
