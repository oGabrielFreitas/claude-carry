---
name: init
description: Initialize Claude Carry continuity in the current project, preserving an existing HANDOFF.md.
---

Find the Git worktree root, or use the session project directory without Git. Read
an existing HANDOFF.md in full before changing it; initialization is safe to repeat
and must preserve relevant decisions and unresolved work.

Read [the save workflow](../save/SKILL.md) and apply its reconciliation, evidence,
size-budget and safe-write rules when preparing the handoff. Only init additionally
permits the .gitignore change below. Do not initialize with invented history or a
large speculative project analysis. If the user has not supplied an objective,
record that it is not yet specified and ask for it briefly after initialization.

Ensure `.claude-carry/` is ignored in the project's .gitignore, preserving existing
entries. Avoid duplicate entries and check for later negation rules that would
undo the exclusion. The directory holds local runtime state and recovery records.
Do not ignore HANDOFF.md automatically or modify CLAUDE.md. Smart is already the
default; preserve any existing mode configuration rather than resetting it.

Make necessary .gitignore changes before the final handoff write. Use Write or Edit
with the absolute HANDOFF.md path. If initialization is already complete and there
is nothing durable to update, do not rewrite files. Briefly report what was prepared
or already present, including whether Git inspection was available. Do not commit
or push anything.
