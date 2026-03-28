import { GoogleGenAI } from "@google/genai";
import "dotenv/config";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

// Keep the model name in one place so it's easy to change later.
const MODEL = "gemini-3-flash-preview";

// Build the agent as a plain object made of data and functions.
function newAgent(client, getUserMessage) {
  const chat = client.chats.create({
    model: MODEL,
    config: {
      maxOutputTokens: 1024,
    },
  });

  return {
    client,
    chat,
    getUserMessage,
    run() {
      return runAgent(this);
    },
    runInference(userInput) {
      return runInference(this, userInput);
    },
  };
}

// This is the main chat loop.
// It keeps asking for user input, sends it to Gemini, and prints the reply.
async function runAgent(agent) {
  console.log("Chat with Gemini (use 'ctrl-c' to quit)");

  while (true) {
    const userInput = await agent.getUserMessage();
    if (userInput === null) {
      break;
    }

    const response = await agent.runInference(userInput);
    console.log(`\u001b[93mGemini\u001b[0m: ${response.text}`);
  }
}

// This function sends one user message to the model and returns the response.
async function runInference(agent, userInput) {
  return agent.chat.sendMessage({
    message: userInput,
  });
}

// This sets up the SDK client and terminal input, then starts the agent.
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

  const agent = newAgent(ai, getUserMessage);

  try {
    await agent.run();
  } catch (error) {
    console.error(`Error: ${error.message}`);
  } finally {
    rl.close();
  }
}

await main();
