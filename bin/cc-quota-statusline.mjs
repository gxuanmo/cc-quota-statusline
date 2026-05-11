#!/usr/bin/env node
// cc-quota-statusline — Claude Code statusline with subscription quota (5h / 7d).
// Wraps `ccusage statusline` and appends a line showing the subscription
// rate limits that Claude Code (v1.2.80+) injects into the statusline hook
// stdin payload as `rate_limits`.
//
// Usage in ~/.claude/settings.json:
//   "statusLine": {
//     "type": "command",
//     "command": "npx -y cc-quota-statusline"
//   }
//
// Windows note: if you bypass `npx` and reference a script by absolute path
// in settings.json, use FORWARD slashes — backslashes are swallowed by the
// shell layer Claude Code uses on Windows.

import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { homedir } from 'node:os';
import { join } from 'node:path';

let input = readFileSync(0, 'utf8');
if (input.charCodeAt(0) === 0xFEFF) input = input.slice(1);

let data = null;
try {
  data = JSON.parse(input);

  // Defensive: cc normally sends transcript_path, but synthesize one from
  // cwd + session_id if missing so ccusage can still compute costs.
  if (!data.transcript_path && data.session_id && data.cwd) {
    const encoded = data.cwd.replace(/[:\\/]/g, '-');
    const candidate = join(
      homedir(),
      '.claude',
      'projects',
      encoded,
      data.session_id + '.jsonl',
    );
    if (existsSync(candidate)) {
      data.transcript_path = candidate;
      input = JSON.stringify(data);
    }
  }
} catch {
  // Pass through to ccusage even if we can't parse — it has its own fallbacks.
}

const result = spawnSync(
  'ccusage',
  ['statusline', '--visual-burn-rate', 'emoji-text'],
  { input, encoding: 'utf8', shell: true },
);

let out = result.stdout ?? '';

const rl = data?.rate_limits;
if (rl) {
  const fmtBlock = (block, label) => {
    if (!block || typeof block.used_percentage !== 'number') return null;
    const pct = block.used_percentage;
    // <50% green, 50-80% yellow, >=80% red + alarm
    const color = pct >= 80 ? '\x1b[31m' : pct >= 50 ? '\x1b[33m' : '\x1b[32m';
    const reset = '\x1b[0m';
    const alarm = pct >= 80 ? ' 🚨' : '';
    let resetTxt = '';
    const ts = block.resets_at;
    if (ts != null) {
      // Accept unix seconds (cc actually sends this), unix ms, or ISO string.
      const d =
        typeof ts === 'number'
          ? new Date(ts < 1e12 ? ts * 1000 : ts)
          : new Date(ts);
      if (!isNaN(d.getTime())) {
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const mi = String(d.getMinutes()).padStart(2, '0');
        resetTxt = ` (resets ${mm}/${dd} ${hh}:${mi})`;
      }
    }
    return `${color}${label}: ${pct.toFixed(1)}%${alarm}${reset}${resetTxt}`;
  };
  const parts = [
    fmtBlock(rl.five_hour, '5h'),
    fmtBlock(rl.seven_day, '7d'),
  ].filter(Boolean);
  if (parts.length) {
    out = out.replace(/\s+$/, '') + '\n📦 ' + parts.join(' | ');
  }
}

if (out) process.stdout.write(out);
if (result.stderr) process.stderr.write(result.stderr);
process.exit(result.status ?? 0);
