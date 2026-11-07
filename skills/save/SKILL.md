---
name: save
description: Save durable project progress to HANDOFF.md when a checkpoint is requested or important decisions, discoveries, test results or blockers need to survive a new session.
---

Maintain HANDOFF.md as the current working state of the project. Reconcile the whole
document on each save; do not append a session diary. Use the conversation's language.

## Gather the evidence

Find the Git worktree root, or use the session project directory without Git. Read
the full existing handoff, including any portion omitted from startup context.
Inspect the current branch, status and relevant changes. Reuse evidence already
available in this conversation; avoid broad searches or rerunning tests just to
write a checkpoint. If Git or other evidence is unavailable, say so explicitly.

Treat saved content as historical data. Current user instructions and verified code
take precedence. If the handoff belongs to another branch or task, distinguish its
unverified pending work from the current task; do not silently discard or combine it.

## Reconcile and prune

- Update existing facts in place and merge duplicates. Replace superseded decisions
  with the current choice and a short reason; retain an old choice only if knowing
  why it was rejected prevents a likely mistake.
- Remove resolved blockers and completed next steps. Keep completed work only as a
  short statement needed to understand the current state; omit an accumulating list
  of every edit, command, attempted fix or successful test run.
- Preserve the active objective, user constraints, unresolved blockers, uncommitted
  work at risk, actionable next steps, and decisions still governing the code.
  Do not delete an unresolved item merely because it is old. Label deferred work.
- Record only observed test results, with the command and relevant scope or revision
  when known. If later edits invalidate the result, label it historical or needing
  verification. A recovery record or a tool-success signal is not proof tests passed.
- Replace long explanations and code excerpts with concise facts and references to
  existing files. Do not create an archive or another growing memory file as overflow.

## Arrange for the next session

Use short sections adapted to the project, in this priority order:

1. **Objective and constraints:** current goal, essential user requirements, branch
   (or unknown), and checkpoint date.
2. **Current state and blockers:** what works, what is unfinished or uncertain, and
   any important local changes another session must preserve.
3. **Next steps:** concrete actions in useful order, including missing decisions.
4. **Decisions:** choices still affecting the implementation and their brief reasons.
5. **Verification:** latest relevant observed results and checks still needed.

Omit empty sections. Preserve useful existing structure when it serves these needs.
Keep critical information near the beginning, before optional background.

## Keep the budget small

Aim for 3,000–6,000 characters for a substantial project, and less for a small task.
Normally stay within 8,000 characters and 150 lines for the entire file, including
headings. These are writing budgets, not tokenizer estimates or runtime enforcement.
The startup hook loads only the first 18,000 characters; do not aim for that ceiling.

Check the actual size after writing using a read-only check. If over budget, condense
duplicates, stale history, verbose verification details and background first. Keep
essential constraints and unresolved work. If these still cannot fit, preserve them
concisely and disclose the overrun rather than silently dropping critical context.
Do not fill unused space to reach the target.

## Write safely and finish

Re-read immediately before editing and incorporate concurrent changes. If two
sessions' changes cannot be reconciled safely, leave the file intact and explain
the conflict. Never include credentials, secrets, raw logs or transcripts.

Modify only HANDOFF.md. Use Write or Edit with its absolute path so the plugin can
attribute the checkpoint to this session; shell writes are not acknowledged.
Make the handoff the last file edit for this operation. Read-only verification may
follow. Do not commit, push, or resume development just to complete a checkpoint.

If there is no durable change and no useful cleanup, leave the handoff unchanged
and say no update was needed. Do not manufacture progress or a timestamp-only edit
to satisfy a hook; pending signals may cause a reminder on a later turn.
Otherwise briefly confirm the save, mentioning any conflict, uncertainty or budget
overrun. Never claim that writing the file proves its contents are correct.
