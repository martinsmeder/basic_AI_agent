# basic_AI_agent

A simple JavaScript AI agent built with Node.js and the Groq API.

The agent runs in the terminal, keeps conversation history, lets the model request tools, executes those tools locally, and sends the tool results back to the model.

## How it works

- `agent.js`:
  - Builds and exports the agent.
  - Runs the terminal loop.
  - Adds user and model messages to the conversation array.
  - Executes the model’s requested tools and adds their results to the conversation array.
  - Sends available tools and conversation history to Groq.
  - Creates user messages.
  - Creates the tool-result object that gets sent back to the model after a tool is executed.
- `main.js`:
  - Imports dependencies, sets up terminal input, and starts the agent.
- `tools/`:
  - Defines and exports the individual tools.
