# cc-quota-statusline

给 Claude Code 状态栏加一行**订阅配额**（5h / 7d），基于 [`ccusage`](https://github.com/ryoppippi/ccusage)。

[English](./README.md)

## 为什么需要它

`ccusage statusline` 只显示按 token 折算的「假设走 API」成本。但如果你订阅了 Claude Max / Pro，真正卡你的是 5 小时和 7 天的配额，不是钱。**也支持第三方 API**（DeepSeek 等）—— `rate_limits` 不存在时自动切换为 token 消耗统计。

Claude Code v1.2.80+ 其实已经在 statusline hook 的 stdin 里塞了 `rate_limits` 字段，**这个 wrapper 就是把它捞出来显示**（没有就自动切 token 统计）。

**Anthropic API：**
```
🤖 Opus 4.7 (1M context) | 💰 $0.13 session / $161.90 today / ... | 🧠 40,631 (4%)
📦 5h: 27.0% (resets 05/11 10:20) | 7d: 78.0% (resets 05/12 03:00)
```

**第三方 API（无 rate_limits）：**
```
🤖 deepseek-v4-pro[1m]
📊 245.1K in / 50.8K out | cache: 3.6M read | 🧠 71.4K/1.0M (7.1%)
```

颜色阈值：<50% 绿 / 50–80% 黄 / ≥80% 红 + 🚨。过期窗口（resets_at 已过）灰字提示"已失效"。

## 安装

**1. 先确保 ccusage 全局装好**（没装的话跑一下）：

```bash
npm install -g ccusage
```

**2. 把这个仓库 clone 到一个稳定位置：**

```bash
git clone https://github.com/gxuanmo/cc-quota-statusline.git
```

**3. 配到 `~/.claude/settings.json`：**

```jsonc
{
  "statusLine": {
    "type": "command",
    "command": "node C:/path/to/cc-quota-statusline/bin/cc-quota-statusline.mjs"
  }
}
```

重启 Claude Code（或开个新会话），新状态栏立即生效。

### Windows 路径的坑

`settings.json` 里**必须用正斜杠**，即使在 Windows 上：

```jsonc
"command": "node C:/Users/you/cc-quota-statusline/bin/cc-quota-statusline.mjs"
```

反斜杠会被 cc 在 Windows 下调起脚本时的 shell 层吃掉，脚本静默启动失败，状态栏什么都不显示。

## 原理

1. 读 cc 通过 stdin 发的 JSON payload
2. 如果有 `rate_limits`（Anthropic API）：透传给 `ccusage statusline`，追加配额行（颜色阈值 + 重置时间）
3. 如果没有 `rate_limits`（第三方 API）：跳过 ccusage，解析 transcript `.jsonl` 文件，统计 token 输入/输出、缓存命中、上下文窗口填充率、模型名
4. 过期检测：`resets_at` 已过 → 灰字显示"已失效"而非残留百分比

整个实现约 175 行，看 [`bin/cc-quota-statusline.mjs`](./bin/cc-quota-statusline.mjs) 就懂。

## 和上游的关系

这是个故意做得很小的 wrapper。「在 `ccusage statusline` 里渲染 `rate_limits`」本来就该是 ccusage 自己的功能，见 [ccusage#658](https://github.com/ryoppippi/ccusage/issues/658)。如果哪天 ccusage 原生支持了，这个 wrapper 就该退役 —— 那是好事。

## License

MIT
