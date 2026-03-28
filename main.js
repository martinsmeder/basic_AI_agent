import { GoogleGenAI } from "@google/genai";
import "dotenv/config";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const MODEL = "gemini-3-flash-preview";

function newAgent(client, getUserMessage) {
  return new Agent(client, getUserMessage);
}

class Agent {
  constructor(client, getUserMessage) {
    this.client = client;
    this.getUserMessage = getUserMessage;
    this.chat = client.chats.create({
      model: MODEL,
      config: {
        maxOutputTokens: 1024,
      },
    });
  }

  async run() {
    console.log("Chat with Gemini (use 'ctrl-c' to quit)");

    while (true) {
      const userInput = await this.getUserMessage();
      if (userInput === null) {
        break;
      }

      const response = await this.runInference(userInput);
      console.log(`\u001b[93mGemini\u001b[0m: ${response.text}`);
    }
  }

  async runInference(userInput) {
    return this.chat.sendMessage({
      message: userInput,
    });
  }
}

async function main() {
  const ai = new GoogleGenAI({});
  const rl = readline.createInterface({ input, output });

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
