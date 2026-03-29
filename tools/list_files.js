import { Type } from "@google/genai";
import { readdir } from "node:fs/promises";
import { cwd } from "node:process";
import path from "node:path";

// Define the tool in one object so we can both advertise it to Gemini
// and execute it locally when Gemini asks for it.
export const listFilesTool = {
  name: "list_files",
  description:
    "List files and directories at a given relative path. If no path is provided, list files in the current directory.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      path: {
        type: Type.STRING,
        description:
          "Optional relative path to list files from. Defaults to the current directory if not provided.",
      },
    },
    additionalProperties: false,
  },
  execute: executeListFiles,
};

// List files and directories from the working directory or a relative subdirectory.
// Directories are returned with a trailing slash so Gemini can tell them apart.
async function executeListFiles(input) {
  const providedPath = input.path;

  if (providedPath !== undefined && typeof providedPath !== "string") {
    throw new Error("The `path` argument must be a string if provided.");
  }

  const relativeDirectory = providedPath?.trim() || ".";

  if (path.isAbsolute(relativeDirectory)) {
    throw new Error("The `path` argument must be a relative path.");
  }

  const workingDirectory = cwd();
  const resolvedDirectory = path.resolve(workingDirectory, relativeDirectory);
  const normalizedRelativePath = path.relative(workingDirectory, resolvedDirectory);

  if (
    normalizedRelativePath.startsWith("..") ||
    path.isAbsolute(normalizedRelativePath)
  ) {
    throw new Error("The `path` argument must stay inside the working directory.");
  }

  const directoryEntries = await readdir(resolvedDirectory, {
    withFileTypes: true,
  });

  const files = directoryEntries.map((entry) =>
    entry.isDirectory() ? `${entry.name}/` : entry.name,
  );

  return JSON.stringify(files);
}
