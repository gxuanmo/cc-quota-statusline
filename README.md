# cc-quota-statusline

Claude Code statusline with **subscription quota** (5h / 7d), built on top of [`ccusage`](https://github.com/ryoppippi/ccusage).

[简体中文](./README.zh-CN.md)

## Why

`ccusage statusline` shows cost figures — useful if you pay per token, less useful if you're on a Claude Max / Pro subscription where the real constraint is the 5-hour and 7-day quota windows. Also supports **third-party APIs** (DeepSeek, etc.) where Anthropic pricing is meaningless — falls back to token consumption stats instead.

Claude Code v1.2.80+ already injects a `rate_limits` field into the statusline hook stdin payload. **This wrapper surfaces it** (or skips to token stats when it's missing).

**Anthropic API:**
```
🤖 Opus 4.7 (1M context) | 💰 $0.13 session / $161.90 today / ... | 🧠 40,631 (4%)
📦 5h: 27.0% (resets 05/11 10:20) | 7d: 78.0% (resets 05/12 03:00)
```

**Third-party API (no rate_limits):**
```
🤖 deepseek-v4-pro[1m]
📊 245.1K in / 50.8K out | cache: 3.6M read | 🧠 71.4K/1.0M (7.1%)
```

Color coding on the quota line: <50% green / 50–80% yellow / ≥80% red + 🚨. Stale windows (resets_at in the past) show dimmed "expired" text.

## Setup

**1. Install ccusage globally** (if you don't have it yet):

```bash
npm install -g ccusage
```

**2. Clone this repo somewhere stable:**

```bash
git clone https://github.com/gxuanmo/cc-quota-statusline.git
```

**3. Wire it into `~/.claude/settings.json`:**

```jsonc
{
  "statusLine": {
    "type": "command",
    "command": "node C:/path/to/cc-quota-statusline/bin/cc-quota-statusline.mjs"
  }
}
```

Restart Claude Code (or open a new session) — the new statusline takes effect.

### Windows path gotcha

Use **forward slashes** in `settings.json`, even on Windows:

```jsonc
"command": "node C:/Users/you/cc-quota-statusline/bin/cc-quota-statusline.mjs"
```

Backslashes get swallowed by the shell layer cc spawns on Windows and the script silently fails to launch.

## How it works

1. Read the JSON payload Claude Code sends on stdin.
2. If `rate_limits` is present (Anthropic API): pipe through to `ccusage statusline`, then append a formatted quota line with color thresholds and reset timestamps.
3. If `rate_limits` is missing (third-party API): skip ccusage, parse the transcript `.jsonl` file to compute token I/O, cache stats, context window fill, and model name.
4. Detect stale quota windows — if `resets_at` is in the past, show dimmed "expired" instead of a leftover percentage.

The whole implementation is ~175 lines. Read [`bin/cc-quota-statusline.mjs`](./bin/cc-quota-statusline.mjs).

## Relation to upstream

This is an intentionally small wrapper. The underlying capability — rendering `rate_limits` in `ccusage statusline` — would fit naturally in ccusage itself; see [ccusage#658](https://github.com/ryoppippi/ccusage/issues/658). If/when ccusage adds native support, this wrapper becomes redundant and that's a good outcome.

## License

MIT
