import { execFile } from "node:child_process";
import { cwd } from "node:process";
import { promisify } from "node:util";
import path from "node:path";

const execFileAsync = promisify(execFile);

// Define the tool in one object so we can both advertise it to the model
// and execute it locally when the model asks for it.
export const searchFilesTool = {
  name: "search_files",
  description:
    "Search for text in files at a given relative path. Use this to find code, identifiers, function names, variable names, routes, or exact text across the project. Use this when the user asks where something is defined, referenced, implemented, or used. If no path is provided, search from the current directory.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The text or pattern to search for.",
      },
      path: {
        type: "string",
        description:
          "Optional relative path to search from. Defaults to the current directory if not provided.",
      },
    },
    required: ["query"],
    additionalProperties: false,
  },
  execute: executeSearchFiles,
};

// Search for text in files with ripgrep and return the matching lines.
async function executeSearchFiles(input) {
  const query = input.query;
  const providedPath = input.path;

  if (typeof query !== "string" || query.trim() === "") {
    throw new Error("The `query` argument must be a non-empty string.");
  }

  if (providedPath !== undefined && typeof providedPath !== "string") {
    throw new Error("The `path` argument must be a string if provided.");
  }

  const searchRoot = resolveWorkingDirectoryPath(providedPath?.trim() || ".");

  try {
    const { stdout } = await execFileAsync(
      "rg",
      ["--line-number", "--with-filename", "--color", "never", query, searchRoot],
      { cwd: cwd(), maxBuffer: 1024 * 1024 },
    );

    const output = stdout.trim();
    return output || "No matches found.";
  } catch (error) {
    if (error.code === 1) {
      return "No matches found.";
    }

    if (error.code === "ENOENT") {
      throw new Error("ripgrep (`rg`) is not installed.");
    }

    throw new Error(error.stderr?.trim() || error.message);
  }
}

// Resolve a user-provided relative path and keep it inside the working directory.
function resolveWorkingDirectoryPath(filePath) {
  if (path.isAbsolute(filePath)) {
    throw new Error("The `path` argument must be a relative path.");
  }

  const workingDirectory = cwd();
  const resolvedPath = path.resolve(workingDirectory, filePath);
  const relativePath = path.relative(workingDirectory, resolvedPath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error("The `path` argument must stay inside the working directory.");
  }

  return resolvedPath;
}
