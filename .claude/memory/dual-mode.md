---
name: dual-mode-statusline
description: The project runs in two mutually exclusive modes depending on rate_limits presence
metadata:
  type: project
---

The wrapper silently switches between two modes based on whether `rate_limits` exists in the stdin payload:

- **Anthropic API** (`rate_limits` present): delegates to `ccusage statusline` for cost display, appends 5h/7d quota line
- **Third-party API** (`rate_limits` null/absent): skips ccusage entirely, reads transcript JSONL to compute token I/O, cache stats, context window fill

**Why:** ccusage costs are priced for Anthropic and are meaningless for third-party APIs (DeepSeek, etc.). The fallback gives third-party users useful token/cache/context stats instead of wrong dollar amounts.

**How to apply:** When modifying the statusline code, always test both paths. The split is at `const rl = data?.rate_limits; if (rl) { ... process.exit(); }` — the Anthropic path exits early, the third-party path runs the rest.
