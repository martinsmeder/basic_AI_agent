import { mkdir, readFile, writeFile } from "node:fs/promises";
import { cwd } from "node:process";
import path from "node:path";

// Define the tool in one object so we can both advertise it to the model
// and execute it locally when the model asks for it.
export const editFileTool = {
  name: "edit_file",
  description: `Make edits to a text file.

Replaces 'old_str' with 'new_str' in the given file. 'old_str' and 'new_str' MUST be different from each other.

If the file specified with path doesn't exist, it will be created when 'old_str' is an empty string.
`,
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "The relative path to the file.",
      },
      old_str: {
        type: "string",
        description:
          "Text to search for. It must match exactly in the file content.",
      },
      new_str: {
        type: "string",
        description: "Text to replace old_str with.",
      },
    },
    required: ["path", "old_str", "new_str"],
    additionalProperties: false,
  },
  execute: executeEditFile,
};

// Edit a file by replacing one exact string with another.
// If the file does not exist and `old_str` is empty, create the file instead.
async function executeEditFile(input) {
  const filePath = input.path;
  const oldStr = input.old_str;
  const newStr = input.new_str;

  if (
    typeof filePath !== "string" ||
    filePath.trim() === "" ||
    typeof oldStr !== "string" ||
    typeof newStr !== "string" ||
    oldStr === newStr
  ) {
    throw new Error("Invalid input parameters.");
  }

  const resolvedPath = resolveWorkingDirectoryPath(filePath);

  try {
    const currentContent = await readFile(resolvedPath, "utf8");

    if (oldStr === "") {
      throw new Error(
        "The `old_str` argument must not be empty when editing an existing file.",
      );
    }

    const updatedContent = currentContent.replaceAll(oldStr, newStr);

    if (currentContent === updatedContent) {
      throw new Error("old_str not found in file");
    }

    await writeFile(resolvedPath, updatedContent, "utf8");
    return "OK";
  } catch (error) {
    if (error.code === "ENOENT" && oldStr === "") {
      return createNewFile(resolvedPath, newStr, filePath);
    }

    throw error;
  }
}

// Create a new file and any parent directories that do not exist yet.
async function createNewFile(resolvedPath, content, displayPath) {
  const directory = path.dirname(resolvedPath);

  if (directory !== ".") {
    await mkdir(directory, { recursive: true });
  }

  await writeFile(resolvedPath, content, "utf8");
  return `Successfully created file ${displayPath}`;
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
