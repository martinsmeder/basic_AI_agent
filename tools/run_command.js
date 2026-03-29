import { execFile } from "node:child_process";
import { cwd } from "node:process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const DEFAULT_TIMEOUT_MS = 10_000;

// Define the tool in one object so we can both advertise it to the model
// and execute it locally when the model asks for it.
export const runCommandTool = {
  name: "run_command",
  description:
    "Run a shell command in the current working directory. Use this for tests, builds, linters, or other project commands. Returns stdout, stderr, and the exit code.",
  parameters: {
    type: "object",
    properties: {
      command: {
        type: "string",
        description: "The shell command to run.",
      },
      timeout_ms: {
        type: "integer",
        description:
          "Optional timeout in milliseconds. Defaults to 10000 if not provided.",
      },
    },
    required: ["command"],
    additionalProperties: false,
  },
  execute: executeRunCommand,
};

// Run one shell command from the current working directory and return its result.
async function executeRunCommand(input) {
  const command = input.command;
  const timeoutMs = input.timeout_ms ?? DEFAULT_TIMEOUT_MS;

  if (typeof command !== "string" || command.trim() === "") {
    throw new Error("The `command` argument must be a non-empty string.");
  }

  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error("The `timeout_ms` argument must be a positive integer.");
  }

  try {
    const { stdout, stderr } = await execFileAsync(
      "bash",
      ["-lc", command],
      {
        cwd: cwd(),
        timeout: timeoutMs,
        maxBuffer: 1024 * 1024,
      },
    );

    return JSON.stringify({
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode: 0,
    });
  } catch (error) {
    return JSON.stringify({
      stdout: error.stdout?.trim() || "",
      stderr: error.stderr?.trim() || error.message,
      exitCode: error.code ?? 1,
    });
  }
}
