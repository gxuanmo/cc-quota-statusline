# cc-quota-statusline

Claude Code statusline with **subscription quota** (5h / 7d), built on top of [`ccusage`](https://github.com/ryoppippi/ccusage).

[简体中文](./README.zh-CN.md)

## Why

`ccusage statusline` shows cost figures — useful if you pay per token, less useful if you're on a Claude Max / Pro subscription where the real constraint is the 5-hour and 7-day quota windows.

Claude Code v1.2.80+ already injects a `rate_limits` field into the statusline hook stdin payload. **This wrapper surfaces it.**

```
🤖 Opus 4.7 (1M context) | 💰 $0.13 session / $161.90 today / $34.94 block (4h 10m left) | 🔥 $128.20/hr (Moderate) | 🧠 40,631 (4%)
📦 5h: 27.0% (resets 05/11 10:20) | 7d: 78.0% (resets 05/12 03:00)
```

The first line is `ccusage` (untouched). The second line is what this wrapper adds.

Color coding on the quota line: <50% green / 50–80% yellow / ≥80% red + 🚨.

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
2. Pipe it through to `ccusage statusline` and capture the output.
3. Extract `rate_limits.five_hour` / `rate_limits.seven_day` from the payload.
4. Append a formatted quota line with color thresholds and reset timestamps.

The whole implementation is under 100 lines. Read [`bin/cc-quota-statusline.mjs`](./bin/cc-quota-statusline.mjs).

## Relation to upstream

This is an intentionally small wrapper. The underlying capability — rendering `rate_limits` in `ccusage statusline` — would fit naturally in ccusage itself; see [ccusage#658](https://github.com/ryoppippi/ccusage/issues/658). If/when ccusage adds native support, this wrapper becomes redundant and that's a good outcome.

## License

MIT
