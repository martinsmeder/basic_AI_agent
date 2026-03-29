# basic_AI_agent

A simple JavaScript AI agent built with Node.js and the Gemini API.

The agent runs in the terminal and lets you execute custom tools locally.

## How it works

- `agent.js`:
  - Builds and exports the agent.
  - Runs the terminal loop.
  - Adds user and model messages to the conversation array.
  - Executes the model’s requested tools and adds their results to the conversation array.
  - Sends available tools and conversation history to Gemini.
  - Creates user messages.
  - Creates the tool-result object that gets sent back to Gemini after a tool is executed.
- `main.js`:
  - Imports dependencies, sets up terminal input, and starts the agent.
- `tools/`:
  - Defines and exports the individual tools.
