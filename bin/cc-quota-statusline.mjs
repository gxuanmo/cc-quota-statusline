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

const rl = data?.rate_limits;

const fmtNum = (n) =>
  n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + 'M'
  : n >= 1000 ? (n / 1000).toFixed(1) + 'K'
  : String(n);

if (rl) {
  // Anthropic subscription: delegate cost/rate display to ccusage, then
  // append our own quota line (5h / 7d) on top.
  const result = spawnSync(
    'ccusage',
    ['statusline', '--visual-burn-rate', 'emoji-text'],
    { input, encoding: 'utf8', shell: true },
  );

  let out = result.stdout ?? '';

  const fmtBlock = (block, label) => {
    if (!block || typeof block.used_percentage !== 'number') return null;
    const pct = block.used_percentage;
    const reset = '\x1b[0m';

    // Parse resets_at: cc sends unix seconds, but also accept ms or ISO string.
    let resetDate = null;
    const ts = block.resets_at;
    if (ts != null) {
      const d =
        typeof ts === 'number'
          ? new Date(ts < 1e12 ? ts * 1000 : ts)
          : new Date(ts);
      if (!isNaN(d.getTime())) resetDate = d;
    }

    // Stale window: cc only updates rate_limits on API response, so the
    // percentage can be leftover from a past window if the clock rolled over.
    if (resetDate && resetDate.getTime() < Date.now()) {
      const dim = '\x1b[90m';
      return `${dim}${label}: expired (send a message to refresh)${reset}`;
    }

    const color = pct >= 80 ? '\x1b[31m' : pct >= 50 ? '\x1b[33m' : '\x1b[32m';
    const alarm = pct >= 80 ? ' 🚨' : '';
    let resetTxt = '';
    if (resetDate) {
      const mm = String(resetDate.getMonth() + 1).padStart(2, '0');
      const dd = String(resetDate.getDate()).padStart(2, '0');
      const hh = String(resetDate.getHours()).padStart(2, '0');
      const mi = String(resetDate.getMinutes()).padStart(2, '0');
      resetTxt = ` (resets ${mm}/${dd} ${hh}:${mi})`;
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

  if (out) process.stdout.write(out);
  if (result.stderr) process.stderr.write(result.stderr);
  process.exit(result.status ?? 0);
}

// Third-party / non-Anthropic API — rate_limits is missing.
// ccusage costs would be wrong (priced for Anthropic), so skip it.
// Fall back to token stats from the transcript file.
const modelName = data?.model?.display_name || data?.model?.id || 'unknown';
const tokens = countTokens(data?.transcript_path);
const ctxWindow = parseContextWindow(data?.model?.id || '');

const tokenParts = [`📊 ${fmtNum(tokens.in)} in / ${fmtNum(tokens.out)} out`];
if (tokens.cacheRead) tokenParts.push(`cache: ${fmtNum(tokens.cacheRead)} read`);
if (tokens.cacheCreate) tokenParts.push(`${fmtNum(tokens.cacheCreate)} created`);

if (tokens.context > 0) {
  const label = ctxWindow > 0
    ? `🧠 ${fmtNum(tokens.context)}/${fmtNum(ctxWindow)} (${((tokens.context / ctxWindow) * 100).toFixed(1)}%)`
    : `🧠 ${fmtNum(tokens.context)}`;
  tokenParts.push(label);
}

process.stdout.write(`🤖 ${modelName}\n${tokenParts.join(' | ')}`);

function parseContextWindow(modelId) {
  // Extract context hint from model name: deepseek-v4-pro[1m] → 1M
  const m = modelId.match(/\[(\d+)([km])\]/i);
  if (!m) return 0;
  const n = parseInt(m[1], 10);
  return m[2].toLowerCase() === 'm' ? n * 1_000_000 : n * 1000;
}

function countTokens(transcriptPath) {
  const stats = { in: 0, out: 0, cacheRead: 0, cacheCreate: 0, context: 0 };
  if (!transcriptPath) return stats;
  try {
    const text = readFileSync(transcriptPath, 'utf8');
    for (const line of text.split('\n')) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line);
        const u = msg?.message?.usage;
        if (!u) continue;
        stats.in += u.input_tokens ?? 0;
        stats.out += u.output_tokens ?? 0;
        stats.cacheRead += u.cache_read_input_tokens ?? 0;
        stats.cacheCreate += u.cache_creation_input_tokens ?? 0;
        // Last assistant message total tokens ≈ current context size.
        // input_tokens only counts non-cached; add cache reads for true total.
        if (msg.type === 'assistant') {
          stats.context =
            (u.input_tokens ?? 0) +
            (u.cache_read_input_tokens ?? 0) +
            (u.cache_creation_input_tokens ?? 0);
        }
      } catch {}
    }
  } catch {}
  return stats;
}
