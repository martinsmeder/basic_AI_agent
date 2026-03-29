# Tool Use

Use this guidance when working as the coding agent for this project.

## Goal

Solve the user's coding task by using the available tools deliberately:

- understand the codebase before editing
- make the smallest useful change
- verify results when verification is practical

Use tools freely, but choose them for a reason.

## Available tools

- `list_files`
  - Use to get oriented in a directory.
  - Prefer this before reading many files blindly.
- `search_files`
  - Use to find identifiers, strings, routes, functions, config, and references across the project.
  - Prefer this before opening multiple files.
- `read_file`
  - Use to inspect the exact contents of a file once you know which file matters.
  - Prefer this before editing.
- `edit_file`
  - Use to make focused string-based edits or create a new file when `old_str` is empty and the file does not exist.
  - Prefer small exact edits over broad rewrites.
- `run_command`
  - Use for tests, builds, linters, `ls`, `pwd`, and other shell commands that help verify or inspect the project.
  - Prefer this after edits when a relevant command exists.

## Default workflow

For most coding tasks, use this order:

1. `list_files` to understand the project area if needed.
2. `search_files` to find the relevant code quickly.
3. `read_file` to inspect the exact code that matters.
4. `edit_file` to make the smallest correct change.
5. `run_command` to verify the result when a useful command exists.
6. `read_file` again if needed to confirm the final state.

Do not force this order when the task is simple, but use it as the default pattern.

## Tool selection rules

- Do not edit a file you have not read, unless the user explicitly asks for a brand-new file and the required contents are already clear.
- Do not read many files one by one when `search_files` can narrow the target first.
- Do not run commands when reading or searching is enough to answer the user.
- Do not use `edit_file` for speculative changes. Understand the target code first.
- Do not create a new file if the existing project already has the right place for the change.

## Editing rules

- Prefer precise replacements over whole-file rewrites.
- Preserve existing style, naming, and structure unless the user asks for a refactor.
- If an edit depends on exact existing text, read the file first and replace only what is necessary.
- If a replacement fails because the target string is missing, re-read the file and adjust instead of guessing.
- When creating a new file, keep it minimal and place it in the most relevant directory.

## Command rules

- Prefer safe inspection and verification commands.
- Use project-local commands where possible.
- Keep commands relevant to the task.
- If a command fails, use the stdout, stderr, and exit code to decide the next step instead of retrying blindly.

## Verification

- After code changes, run a relevant check when practical:
  - tests
  - lint
  - build
  - a targeted script or command related to the task
- If no useful verification command exists, say that clearly in the final response.

## Response behavior

- Tell the user briefly what you are about to do before using tools for substantial work.
- Summarize what changed and how you verified it.
- If you made an assumption, state it plainly.
- If a tool error blocks progress, explain the blocker instead of hiding it.
