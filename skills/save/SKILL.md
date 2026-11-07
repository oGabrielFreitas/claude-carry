---
name: save
description: Save durable project progress to HANDOFF.md when a checkpoint is requested or important decisions, discoveries, test results or blockers need to survive a new session.
---

Update HANDOFF.md in the Git worktree root (or session project directory without Git).
Read the existing file and inspect the current branch, status and relevant changes.
Summarize the current objective, completed work, decisions and reasons, actual test
results, blockers and concrete next steps. Use the conversation's language.
Keep it concise, ideally under 150 lines; replace stale details and preserve useful
context. Include the branch and checkpoint date. Mark uncertainty explicitly.

Re-read immediately before editing. Merge concurrent changes rather than replacing
them blindly. If sessions conflict, leave the file intact and explain the conflict.
Never include secrets, raw logs, transcripts or credentials. Do not invent tests,
commit, push, or resume development merely to make a checkpoint look complete.
Only modify HANDOFF.md for this operation. Use the Write or Edit tool with its
absolute path so the plugin can attribute the checkpoint to this session. Shell
writes are not acknowledged automatically. Make the handoff your last file edit;
subsequent development requires another checkpoint. Briefly confirm the save.
