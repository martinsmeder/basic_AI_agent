import { readFile } from "node:fs/promises";
import { cwd } from "node:process";
import path from "node:path";

// Define the tool in one object so we can both advertise it to the model
// and execute it locally when the model asks for it.
export const readFileTool = {
  name: "read_file",
  description:
    "Read the contents of a given relative file path. Use this when you want to inspect the exact implementation in a file, especially after search_files finds a likely match. Do not use this with directory names.",
  parameters: {
    type: "object",
    properties: {
      path: {
        type: "string",
        description: "The relative path of a file in the working directory.",
      },
    },
    required: ["path"],
    additionalProperties: false,
  },
  execute: executeReadFile,
};

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
