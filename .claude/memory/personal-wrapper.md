---
name: personal-wrapper
description: Personal statusline wrapper at ~/.claude/statusline-wrapper.mjs exists separately from the project version
metadata:
  type: project
---

This repository is the public/community version. The personal wrapper at `~/.claude/statusline-wrapper.mjs` is the local version actually wired into settings.json.

**Key differences (intentional):**
- Personal: disk caching (`usage-cache.json`) + Chinese text
- Project: no caching, English-only
- Settings.json `statusLine.command` points to personal wrapper, NOT project version

**Why:** The project CLAUDE.md explicitly excludes disk caching as a design boundary. The personal wrapper adds it for local scripting needs.

**How to apply:** Changes to the project version (e.g., new features) must be manually synced to the personal wrapper. They are separate files, not linked.
