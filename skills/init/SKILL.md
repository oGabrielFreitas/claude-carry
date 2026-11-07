---
name: init
description: Initialize Claude Carry continuity in the current project, preserving an existing HANDOFF.md.
---

Find the Git worktree root, or use the session project directory without Git.
If HANDOFF.md exists, read it and preserve its useful content. Otherwise create a
concise handoff with objective, branch, current state, decisions, verified tests,
blockers and next steps based on available evidence. Ask only if the objective
cannot be inferred. Never invent history or include secrets.

Add `.claude-carry/` to the project's .gitignore if absent, preserving existing
entries. This directory contains local runtime and recovery records. Do not ignore
HANDOFF.md automatically. Do not modify CLAUDE.md or commit/push anything.
Smart mode is already the default; no configuration file is necessary.
Make any .gitignore changes before the final handoff write. Use Write or Edit with
the absolute HANDOFF.md path so the plugin can acknowledge this session's checkpoint.
