import { GoogleGenAI } from "@google/genai";
import "dotenv/config";
import { stdin as input, stdout as output } from "node:process";
import readline from "node:readline/promises";

import { newAgent } from "./agent.js";
import { readFileTool } from "./tools/read_file.js";

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
