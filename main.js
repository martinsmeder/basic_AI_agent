import Groq from "groq-sdk";
import "dotenv/config";
import { readFile } from "node:fs/promises";
import { stdin as input, stdout as output } from "node:process";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

import { newAgent } from "./agent.js";
import { editFileTool } from "./tools/edit_file.js";
import { listFilesTool } from "./tools/list_files.js";
import { readFileTool } from "./tools/read_file.js";
import { runCommandTool } from "./tools/run_command.js";
import { searchFilesTool } from "./tools/search_files.js";

// Set up the SDK client and terminal input, then start the agent.
async function main() {
  const ai = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const rl = readline.createInterface({ input, output });
  const systemInstruction = await loadSystemInstruction();

  // Get user message from the terminal
  const getUserMessage = async () => {
    try {
      return await rl.question("\u001b[94mYou\u001b[0m: ");
    } catch {
      return null;
    }
  };

  const tools = [
    readFileTool,
    listFilesTool,
    editFileTool,
    searchFilesTool,
    runCommandTool,
  ];
  const agent = newAgent(ai, getUserMessage, tools, systemInstruction);

  try {
    await agent.run();
  } catch (error) {
    console.error(`Error: ${error.message}`);
  } finally {
    rl.close();
  }
}

// Load the tool-use skill so we can send it as the system instruction.
async function loadSystemInstruction() {
  const currentFilePath = fileURLToPath(import.meta.url);
  const currentDirectory = path.dirname(currentFilePath);
  const skillPath = path.join(currentDirectory, "skills", "tool_use.md");

  return readFile(skillPath, "utf8");
}

await main();
