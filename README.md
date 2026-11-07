<p align="center">
  <img src="assets/claude-carry-icon.png" alt="Claude Carry icon: a backpack carrying project context" width="160" />
</p>

# Claude Carry - Carry Context, Save Tokens

**Start fresh sessions with your project's goals, decisions, and next steps, so you spend less time and fewer tokens rebuilding context.**

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Node.js 20+](https://img.shields.io/badge/Node.js-20%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Claude Code plugin](https://img.shields.io/badge/Claude_Code-Plugin-D97757)](https://code.claude.com/docs/en/plugins)
[![Runtime dependencies: zero](https://img.shields.io/badge/Runtime_dependencies-0-brightgreen)](package.json)

Claude Carry gives Claude Code a persistent `HANDOFF.md` and **smart checkpoints**. It loads project context when a session starts, detects work worth saving, and asks Claude to update the handoff before finishing. By carrying forward a focused summary of goals, decisions, progress, and next steps, it can reduce the need to re-explain the project or reconstruct context in each new session.

[Quick start](#quick-start) · [Token efficiency and compact](#token-efficiency-and-compact) · [How it works](#how-it-works) · [Project files](#project-files) · [Configuration](#configuration) · [Limitations](#limitations) · [Contributing](#contributing)

## Why Claude Carry?

A new session should not mean reconstructing your objective, decisions, test results, and next steps from scratch. Claude Carry keeps that information in your repository, where you can inspect and edit it.

- **Smart by default:** detects source changes, common test commands, and tool failures.
- **Context on startup:** loads the handoff when starting, resuming, clearing, or compacting a session.
- **Manual controls:** initialize, save, or resume whenever you need to.
- **Technical recovery:** records pending work before compaction and on normal exit.
- **Local hooks:** Node.js standard library only, with no network calls or extra model processes.

This can save session tokens otherwise spent repeating instructions or rebuilding context. The amount saved depends on the project and how much context would otherwise need to be reloaded; it is not a fixed or guaranteed reduction. Claude writes the semantic summary using the active conversation, which consumes session tokens. The hooks themselves do not call an API.

## Requirements

- [Claude Code](https://code.claude.com/docs/en/overview), updated to support plugin skills and command hooks with an `args` array.
- [Node.js 20 or later](https://nodejs.org/), available as `node` on `PATH`.
- [Git](https://git-scm.com/downloads), recommended for repository change detection. Without Git, editing and tool-failure signals still work.

The code uses cross-platform Node.js APIs and passes hook arguments without a shell. Integration tests have been run on Windows; Linux and macOS still need platform verification. No `npm install` step is required.

## Token efficiency and compact

**Claude Carry can save tokens when a concise handoff replaces repeated explanations and unnecessary rediscovery in fresh sessions.** Its advantage over relying on `/compact` alone is a persistent, inspectable project handoff that can be loaded across session boundaries. It has not been benchmarked as cheaper than `/compact`.

| Need                            | Claude Carry                                                                       | `/compact`                                                             |
| ------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Continue in a new session       | Loads a saved `HANDOFF.md` from the project.                                       | Summarizes the current conversation for continued use in that session. |
| Preserve explicit project state | Keeps an editable record of decisions, verified results, blockers, and next steps. | Retains selected conversation details in a generated summary.          |
| Reduce the active conversation  | Does not clear or shrink it automatically.                                         | Compresses conversation history to free context space.                 |
| Token overhead                  | Summary generation, checkpoint tool calls, and loading the handoff use tokens.     | Processing the conversation and generating the summary use tokens.     |

For a focused restart at a natural milestone:

1. Let the smart checkpoint finish, or run `/claude-carry:save`.
2. Confirm that `HANDOFF.md` contains the essential state and next steps.
3. Use `/clear` or open a new session. The startup hook loads the handoff.
4. Run `/claude-carry:resume` when you want Claude to verify the saved state and continue.

This workflow may avoid repeated manual compactions when a small project handoff is enough to continue. Use `/compact` when you still need details from the active conversation. Both approaches can be useful together.

For efficiency, keep the handoff short, remove stale detail, and use `smart` rather than `aggressive` mode. Smart mode can request a checkpoint after every turn with detected work; those saves can outweigh any benefit in short sessions. The plugin adds startup context and does not increase usage limits. Prompt caching also affects the relative cost of continuing a session versus restarting it.

**No percentage savings or universal advantage is claimed.** Compare similar tasks with and without the plugin, including checkpoint requests, handoff loading, file reads, and cache effects. Use `/context` to inspect context size and the usage reporting available in your Claude Code version to compare total usage; a smaller context alone does not prove lower total cost.

See Anthropic's [context management guide](https://code.claude.com/docs/en/how-claude-code-works#when-context-fills-up) for compaction behavior and [cost guidance](https://code.claude.com/docs/en/costs#reduce-token-usage) for context, caching, and token tradeoffs.

## Quick start

### Install from GitHub

Once the plugin files are published to this repository, run inside Claude Code:

```text
/plugin marketplace add oGabrielFreitas/claude-carry
/plugin install claude-carry@claude-carry-marketplace
```

Restart your session after installation or an update. Open the project where you want persistent context, then run:

```text
/claude-carry:init
```

Initialization creates or updates the handoff and adds `.claude-carry/` to the project's `.gitignore`, preserving existing content. Continue working normally.

### Try a local checkout

From the **project you want to work on**, launch Claude with the absolute path to this plugin:

```sh
claude --plugin-dir "/absolute/path/to/claude-carry"
```

On Windows, for example:

```powershell
claude --plugin-dir "D:/Projects/claude-carry"
```

For a persistent local installation, run inside Claude Code:

```text
/plugin marketplace add /absolute/path/to/claude-carry
/plugin install claude-carry@claude-carry-marketplace
```

See the [official installation guide](https://code.claude.com/docs/en/discover-plugins) for installation scopes and marketplace management.

## Updating an existing installation

Version **0.1.1** improves handoff reconciliation and pruning. For a GitHub marketplace
installation, first publish the updated files and version to the repository. Then
run these commands in your terminal:

```sh
claude plugin marketplace update claude-carry-marketplace
claude plugin update claude-carry@claude-carry-marketplace
claude plugin list
```

For an installation explicitly scoped to a project, run the update from that project
and add `--scope project`; use `--scope local` for a local-scope installation. Inspect
the installed plugin in `/plugin` if you are unsure which scope you used.

Restart Claude Code after the update, or run `/reload-plugins` inside the session.
Confirm version `0.1.1` in the plugin listing. Your project's `HANDOFF.md`, mode
configuration and `.claude-carry/` state do not need to be deleted or recreated.
Run `/claude-carry:save` once to reconcile an existing handoff using the new guidance.

If you use `--plugin-dir` or a marketplace registered from a local path, update that
source folder and restart the session. A separate downloaded copy needs the new
files too; editing this repository does not change that copy. Avoid editing the
managed cache under `~/.claude/plugins/`.

See the official [update instructions](https://code.claude.com/docs/en/discover-plugins#update-plugins-now)
and [local loading rules](https://code.claude.com/docs/en/plugins/loading#in-place-and-copied-plugins).

## Commands

| Command                | Purpose                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `/claude-carry:init`   | Prepare project continuity and ignore local runtime files.                         |
| `/claude-carry:save`   | Save the objective, progress, decisions, verified tests, blockers, and next steps. |
| `/claude-carry:resume` | Verify saved context against the repository and continue authorized pending work.  |

`init` is optional: the first checkpoint can create `HANDOFF.md`. If you skip it, add `.claude-carry/` to `.gitignore` yourself. Claude Carry does not modify `CLAUDE.md`, commit, or push on your behalf.

## How it works

| Event                | Behavior                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `SessionStart`       | Loads up to 18,000 handoff characters, identifies the branch, and lists the five most recently modified recovery records. |
| `UserPromptSubmit`   | Allows a new checkpoint reminder for the new turn.                                                                        |
| `PostToolUse`        | Tracks in-project edits and common test commands; acknowledges this session's handoff writes.                             |
| `PostToolUseFailure` | Marks a tool failure as a possible reason to save context.                                                                |
| `Stop`               | Checks for pending changes and requests a checkpoint, with repeated-state and continuation-loop guards.                   |
| `PreCompact`         | Saves a fresh technical snapshot of pending work and supplies guidance for the compaction summary.                        |
| `SessionEnd`         | Saves pending signals with the last observed snapshot, avoiding a full Git scan during shutdown.                          |

The Git detector compares the commit, branch, staged changes, and contents of modified or untracked, non-ignored files. Contents are hashed in chunks, including large files. Existing changes at session startup become the baseline. `HANDOFF.md` and `.claude-carry/` are excluded from file comparisons.

A checkpoint is acknowledged when this session successfully writes `HANDOFF.md` through `Write`, `Edit`, or `MultiEdit`. Its repository snapshot is captured at that moment, so later changes remain pending. A handoff edit from another session does not, by itself, clear this session's pending work.

The save skill uses `Write` or `Edit` with an absolute path. Shell-based or external handoff edits remain readable but are not automatically acknowledged as checkpoints.

Ordinary questions without pending work do not trigger smart checkpoints. Discoveries and decisions without file changes rely on Claude following the save skill's guidance; Git cannot infer their meaning.

## Project files

### Keeping the handoff concise

The save skill reconciles the whole document: it removes resolved tasks, merges
duplicates, replaces superseded decisions, and retains unresolved work and current
constraints. Old test results are marked historical when later changes invalidate
them. Initialization and resumption use the same save guidance.

For substantial projects, the writing target is 3,000–6,000 characters, normally no
more than 8,000 characters and 150 lines; small tasks should use less. Claude is
instructed to verify size and condense the file before finishing. Essential facts
take priority over the target, and exceptional overruns should be reported. This is
model guidance, not a script-enforced size limit or an automatic deletion policy.

Critical state appears first. There is no append-only session diary or overflow
archive. With no durable change or useful cleanup, the skill leaves the handoff
untouched instead of making a timestamp-only edit. Runtime state files still have
no automatic age-based cleanup.

### Files on disk

**Yes: the plugin creates a `.claude-carry/` directory in each project it runs in.** It uses the Git worktree root, or the session project directory when Git is unavailable. The hook creates the directory even before `init` and in manual mode.

```text
your-project/
├── HANDOFF.md                         # Human-readable project context
├── .claude-carry.json                 # Optional mode configuration
├── .claude-carry/                     # Local runtime state — do not commit
│   ├── <session-hash>.json            # Per-session baseline and signals
│   └── <session-hash>.recovery.json   # Pending-work recovery, when needed
└── .gitignore
```

| File                 | Contents                                                                   | Version control                     |
| -------------------- | -------------------------------------------------------------------------- | ----------------------------------- |
| `HANDOFF.md`         | Objective, branch, progress, decisions, tests, blockers, next steps        | Your choice; review before sharing. |
| `.claude-carry.json` | Optional mode selection                                                    | Can be shared with your team.       |
| `.claude-carry/`     | Session state, hashes, timestamps, branches, commit IDs, changed filenames | Keep local and ignored.             |

Add this entry to the project's `.gitignore`:

```gitignore
.claude-carry/
```

Runtime records contain no source diffs, tool output, command text, or conversation transcripts. Filenames and other metadata can still be private. A recovery record does **not** prove that a test passed or contain a semantic summary.

Recovery records include a write time (`at`) and the snapshot observation time (`observedAt`). Exit records may contain older filenames and Git state; pending tool signals can be newer than the snapshot. Verify the repository before resuming.

Successful checkpoints clear the current session's recovery file. Other sessions' records are retained. After closing active sessions, you can delete `.claude-carry/` to reset runtime state; this also removes unsaved technical recovery information. It does not delete `HANDOFF.md` or your source files.

## Configuration

No configuration is needed for smart mode. To choose explicitly, create `.claude-carry.json` in the project root:

```json
{
  "mode": "smart"
}
```

| Mode         | Behavior                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------- |
| `smart`      | Default. Requests checkpoints for detected work and encourages saving meaningful decisions. |
| `manual`     | Loads context; no automatic checkpoint requests or recovery writes. Use `save` explicitly.  |
| `aggressive` | Also requests a checkpoint check on otherwise idle turns. May use more session tokens.      |

Requests are suppressed for repeated state within a turn, and `stop_hook_active` prevents recursive continuation. A new prompt permits a fresh reminder for work that still needs a checkpoint. Invalid configuration produces a diagnostic and lets the session continue.

## Limitations

- **Best-effort persistence.** Claude may be interrupted or unable to write a summary. A crash or power loss can prevent even the emergency hook from running.
- **Short exit budget.** Claude Code normally gives session-end hooks 1.5 seconds; a plugin timeout alone does not extend that budget. Exit recovery uses cached observations. See the [hook reference](https://code.claude.com/docs/en/hooks#sessionend).
- **Shared handoff.** State is per session, but `HANDOFF.md` is shared within a worktree. The skill rereads before editing; model writes are not protected by a transactional lock. Prefer separate worktrees for simultaneous tasks and verify the recorded branch.
- **Heuristic signals.** Common test commands and tool failures prompt a review; they do not prove meaningful progress or test success. Unrecognized commands and purely conversational discoveries depend on Claude's judgment.
- **Git inspection can fail.** Each Git command has a five-second timeout and an 8 MiB output limit. Hook deadlines may interrupt long scans. When inspection fails, tool signals remain available, but external changes may be missed.
- **No semantic guarantee.** A successful handoff write confirms an observed save, not the summary's accuracy or completeness. Verify saved context against current code and user instructions.

## Troubleshooting

| Symptom                              | What to check                                                                                                                                 |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Commands do not appear               | Confirm the plugin is installed/enabled and restart Claude Code.                                                                              |
| Hooks do not run                     | Inspect `/hooks`; check that `node` and, optionally, `git` are on `PATH`.                                                                     |
| A save is requested again            | Use the save skill's `Write`/`Edit` workflow; inspect changes made after the checkpoint.                                                      |
| No checkpoint after an external edit | Check Git availability and ignore rules. Without Git, only tool signals are tracked.                                                          |
| `checkpoint hook unavailable`        | Check project permissions, JSON configuration, runtime state, and Node/Git availability. Diagnostics deliberately omit input and tool output. |

## Development and validation

From this repository:

```sh
npm test
claude plugin validate .
```

Tests use Node's built-in test runner and disposable Git repositories. Coverage includes checkpoint requests, loop prevention, cross-session acknowledgment, edits after a save, new-turn retries, large files, recovery, staged changes, detached HEAD, ignored files, deletions, renames, nested worktrees, invalid configuration, split UTF-8 input, and operation without Git.

These tests exercise hook JSON input/output and filesystem behavior. They do not replace testing inside Claude Code. For a manual check, load the plugin in a disposable project, request a small edit, inspect the handoff, and open a new session. An ordinary question with no pending work should not request a checkpoint.

## Contributing

Bug reports and focused pull requests are welcome. Include your operating system, Node/Git/Claude Code versions, the hook event, and a minimal reproduction. Redact private paths, handoff content, and credentials.

- [Source repository](https://github.com/oGabrielFreitas/claude-carry)
- [Report an issue](https://github.com/oGabrielFreitas/claude-carry/issues)
- [Claude Code plugin documentation](https://code.claude.com/docs/en/plugins)
- [Hook reference](https://code.claude.com/docs/en/hooks)

Created by [Gabriel Freitas](https://github.com/oGabrielFreitas). More development content: [DescolaDev on YouTube](https://www.youtube.com/@DescolaDev).

## License

[Apache License 2.0](LICENSE).
