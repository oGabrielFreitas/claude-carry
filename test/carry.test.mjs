import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';

const script = fileURLToPath(new URL('../scripts/carry.mjs', import.meta.url));
function project(t, gitEnabled = true) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'carry space-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', windowsHide: true });
  const write = (name, text) => fs.writeFileSync(path.join(root, name), text);
  if (gitEnabled) {
    git('init', '-q');
    git('config', 'user.name', 'Test');
    git('config', 'user.email', 'test@example.invalid');
    write('app.txt', 'initial');
    git('add', '.'); git('commit', '-qm', 'initial');
  }
  function hook(event, extra = {}) {
    const result = spawnSync(process.execPath, [script], {
      input: JSON.stringify({ cwd: root, session_id: 'test-session', hook_event_name: event, ...extra }),
      encoding: 'utf8', windowsHide: true, env: { ...process.env, CLAUDE_PROJECT_DIR: root },
    });
    assert.equal(result.status, 0);
    assert.equal(result.stderr, '');
    return result.stdout.startsWith('{') ? JSON.parse(result.stdout) : result.stdout;
  }
  const checkpoint = text => {
    write('HANDOFF.md', text);
    hook('PostToolUse', { tool_name: 'Write', tool_input: { file_path: path.join(root, 'HANDOFF.md') } });
  };
  return { root, git, write, hook, checkpoint, recoveries: () => fs.readdirSync(path.join(root, '.claude-carry')).filter(n => n.endsWith('.recovery.json')) };
}

test('smart checkpoints content changes once, acknowledges handoff, then detects another edit', t => {
  const p = project(t);
  assert.match(p.hook('SessionStart').hookSpecificOutput.additionalContext, /smart/);
  assert.equal(p.hook('Stop'), '');
  p.write('app.txt', 'changed');
  assert.equal(p.hook('Stop').decision, 'block');
  assert.equal(p.hook('Stop', { stop_hook_active: true }), '');
  assert.equal(p.hook('Stop'), '');
  assert.equal(p.recoveries().length, 1);
  p.checkpoint('# Saved\nImplemented change.');
  assert.equal(p.hook('Stop', { stop_hook_active: true }), '');
  assert.equal(p.recoveries().length, 0);
  p.write('app.txt', 'changed again');
  assert.equal(p.hook('Stop').decision, 'block');
});

test('preexisting dirt does not trigger; same status with new untracked contents does', t => {
  const p = project(t);
  p.write('new.txt', 'one');
  p.hook('SessionStart');
  assert.equal(p.hook('Stop'), '');
  p.write('new.txt', 'two');
  assert.equal(p.hook('Stop').decision, 'block');
});

test('tests and failures without source edits request a checkpoint, reads do not', t => {
  const p = project(t);
  p.hook('SessionStart');
  p.hook('PostToolUse', { tool_name: 'Bash', tool_input: { command: 'git status' } });
  assert.equal(p.hook('Stop'), '');
  p.hook('PostToolUse', { tool_name: 'Bash', tool_input: { command: 'npm test' } });
  assert.equal(p.hook('Stop').decision, 'block');
  p.checkpoint('Tests passed.'); p.hook('Stop');
  p.hook('PostToolUseFailure', { tool_name: 'Bash', tool_response: 'SECRET' });
  p.hook('SessionEnd');
  const recovery = fs.readFileSync(path.join(p.root, '.claude-carry', p.recoveries()[0]), 'utf8');
  assert.ok(!recovery.includes('SECRET'));
  assert.equal(p.hook('Stop').decision, 'block');
});

test('compaction preserves pending state and exposes recovery after a new session', t => {
  const p = project(t);
  p.hook('SessionStart'); p.write('app.txt', 'unfinished');
  assert.match(p.hook('PreCompact'), /Preserve/);
  assert.equal(p.recoveries().length, 1);
  assert.match(p.hook('SessionStart', { session_id: 'new' }).hookSpecificOutput.additionalContext, /\.recovery\.json/);
  p.hook('SessionStart', { source: 'compact' });
  assert.equal(p.hook('Stop').decision, 'block');
});

test('manual never asks or writes recovery; aggressive checks an otherwise idle turn', t => {
  const p = project(t);
  p.write('.claude-carry.json', '{"mode":"manual"}'); p.hook('SessionStart');
  p.write('app.txt', 'changed');
  assert.equal(p.hook('Stop'), ''); p.hook('SessionEnd');
  assert.equal(p.recoveries().length, 0);
  p.write('.claude-carry.json', '{"mode":"aggressive"}');
  assert.equal(p.hook('Stop').decision, 'block');
  assert.equal(p.hook('Stop', { stop_hook_active: true }), '');
});

test('works without Git using editing signals', t => {
  const p = project(t, false);
  p.hook('SessionStart');
  p.hook('PostToolUse', { tool_name: 'Write', tool_input: { file_path: path.join(p.root, 'new.txt') } });
  assert.equal(p.hook('Stop').decision, 'block');
});

test('handles staged changes, commits and detached HEAD', t => {
  const p = project(t);
  p.git('checkout', '--detach', '-q');
  p.hook('SessionStart');
  p.write('app.txt', 'staged'); p.git('add', 'app.txt');
  assert.equal(p.hook('Stop').decision, 'block');
  p.checkpoint('Saved staging'); p.hook('Stop');
  p.git('commit', '-qm', 'change');
  assert.equal(p.hook('Stop').decision, 'block');
});

test('empty repository and malformed input fail safely', t => {
  const p = project(t, false); p.git('init', '-q');
  p.hook('SessionStart'); p.write('first.txt', 'first');
  assert.equal(p.hook('Stop').decision, 'block');
  const result = spawnSync(process.execPath, [script], { input: '{bad', encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0); assert.equal(result.stdout, '');
  assert.match(result.stderr, /unavailable/);
});

test('another session changing the handoff cannot acknowledge pending work', t => {
  const p = project(t);
  p.hook('SessionStart');
  p.write('app.txt', 'unsaved work');
  p.write('HANDOFF.md', 'Written elsewhere');
  assert.equal(p.hook('Stop').decision, 'block');
  p.hook('PreCompact');
  assert.equal(p.recoveries().length, 1);
});

test('changes made after the checkpoint remain pending', t => {
  const p = project(t);
  p.hook('SessionStart');
  p.write('app.txt', 'first change');
  p.checkpoint('First change completed');
  p.write('app.txt', 'later change');
  assert.equal(p.hook('Stop').decision, 'block');
});

test('a new user turn permits a retry without a loop in the current turn', t => {
  const p = project(t, false);
  p.hook('SessionStart');
  p.hook('PostToolUseFailure', { tool_name: 'Bash' });
  assert.equal(p.hook('Stop').decision, 'block');
  assert.equal(p.hook('Stop'), '');
  p.hook('UserPromptSubmit');
  assert.equal(p.hook('Stop').decision, 'block');
  assert.equal(p.hook('Stop', { stop_hook_active: true }), '');
});

test('large file changes are detected even with identical size and timestamps', t => {
  const p = project(t);
  const file = path.join(p.root, 'large.bin');
  fs.writeFileSync(file, Buffer.alloc(3 * 1024 * 1024, 1));
  const time = new Date('2026-01-01T00:00:00Z');
  fs.utimesSync(file, time, time);
  p.hook('SessionStart');
  fs.writeFileSync(file, Buffer.alloc(3 * 1024 * 1024, 2));
  fs.utimesSync(file, time, time);
  assert.equal(p.hook('Stop').decision, 'block');
});

test('editing a file outside the project does not mark project work', t => {
  const p = project(t, false);
  p.hook('SessionStart');
  p.hook('PostToolUse', { tool_name: 'Edit', tool_input: { file_path: path.resolve(p.root, '..', 'elsewhere.txt') } });
  assert.equal(p.hook('Stop'), '');
});

test('recovery listings select the most recent files by time', t => {
  const p = project(t);
  p.hook('SessionStart');
  const dir = path.join(p.root, '.claude-carry');
  for (let index = 0; index < 6; index++) {
    const file = path.join(dir, `${index}.recovery.json`);
    fs.writeFileSync(file, '{}');
    const time = new Date(2026, 0, 6 - index);
    fs.utimesSync(file, time, time);
  }
  const context = p.hook('SessionStart').hookSpecificOutput.additionalContext;
  assert.ok(context.includes('0.recovery.json'));
  assert.ok(!context.includes('5.recovery.json'));
});

test('shutdown recovery labels cached observations instead of implying a fresh scan', t => {
  const p = project(t);
  p.hook('SessionStart');
  p.write('app.txt', 'unfinished');
  p.hook('PostToolUse', { tool_name: 'Edit', tool_input: { file_path: path.join(p.root, 'app.txt') } });
  p.hook('SessionEnd');
  const record = JSON.parse(fs.readFileSync(path.join(p.root, '.claude-carry', p.recoveries()[0]), 'utf8'));
  assert.equal(record.event, 'SessionEnd');
  assert.equal(record.pendingSignal, true);
  assert.ok(record.observedAt);
  assert.ok(record.at >= record.observedAt);
});

test('handoff-only and ignored changes do not request smart checkpoints', t => {
  const p = project(t);
  p.write('.gitignore', 'ignored.log\n');
  p.hook('SessionStart');
  p.checkpoint('Current objective');
  p.write('ignored.log', 'ignored output');
  assert.equal(p.hook('Stop'), '');
  assert.equal(p.recoveries().length, 0);
});

test('tracked deletions and renames remain detectable after a checkpoint', t => {
  const p = project(t);
  p.hook('SessionStart');
  fs.unlinkSync(path.join(p.root, 'app.txt'));
  assert.equal(p.hook('Stop').decision, 'block');
  p.checkpoint('Removed app.txt');
  p.write('app.txt', 'restored');
  p.git('add', 'app.txt'); p.git('commit', '-qm', 'restore');
  p.checkpoint('Restored file');
  fs.renameSync(path.join(p.root, 'app.txt'), path.join(p.root, 'renamed.txt'));
  assert.equal(p.hook('Stop').decision, 'block');
});

test('a nested directory in a separate worktree uses the correct project root', t => {
  const p = project(t);
  const worktree = path.join(p.root, 'separate-worktree');
  p.git('worktree', 'add', '-qb', 'carry-test', worktree);
  const nested = path.join(worktree, 'nested');
  fs.mkdirSync(nested);
  const invoke = event => {
    const result = spawnSync(process.execPath, [script], {
      input: JSON.stringify({ cwd: nested, session_id: 'worktree', hook_event_name: event }),
      encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: nested }, windowsHide: true,
    });
    assert.equal(result.stderr, '');
    return JSON.parse(result.stdout);
  };
  const context = invoke('SessionStart').hookSpecificOutput.additionalContext;
  assert.ok(context.includes(worktree));
  assert.ok(fs.existsSync(path.join(worktree, '.claude-carry')));
  assert.ok(!fs.existsSync(path.join(nested, '.claude-carry')));
  fs.writeFileSync(path.join(worktree, 'app.txt'), 'changed from nested session');
  assert.equal(invoke('Stop').decision, 'block');
});

test('invalid configuration fails open without printing private configuration', t => {
  const p = project(t, false);
  p.write('.claude-carry.json', '{"mode":"PRIVATE_INVALID_VALUE"}');
  const result = spawnSync(process.execPath, [script], {
    input: JSON.stringify({ cwd: p.root, session_id: 'config', hook_event_name: 'SessionStart' }),
    encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: p.root }, windowsHide: true,
  });
  assert.equal(result.status, 0);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /unavailable/);
  assert.ok(!result.stderr.includes('PRIVATE_INVALID_VALUE'));
});

test('UTF-8 session IDs survive a multi-byte character split across stdin chunks', async t => {
  const p = project(t, false);
  const session = 'caf\u00e9';
  const input = Buffer.from(JSON.stringify({ cwd: p.root, session_id: session, hook_event_name: 'UserPromptSubmit' }));
  const boundary = input.indexOf(Buffer.from('\u00e9')) + 1;
  const child = spawn(process.execPath, [script], {
    env: { ...process.env, CLAUDE_PROJECT_DIR: p.root }, windowsHide: true,
  });
  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', chunk => { stderr += chunk; });
  const finished = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', resolve);
  });
  child.stdin.write(input.subarray(0, boundary));
  await new Promise(resolve => setTimeout(resolve, 150));
  child.stdin.end(input.subarray(boundary));
  assert.equal(await finished, 0);
  assert.equal(stderr, '');
  const filename = createHash('sha256').update(session).digest('hex').slice(0, 24) + '.json';
  assert.ok(fs.existsSync(path.join(p.root, '.claude-carry', filename)));
});
