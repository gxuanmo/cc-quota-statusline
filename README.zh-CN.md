# cc-quota-statusline

给 Claude Code 状态栏加一行**订阅配额**（5h / 7d），基于 [`ccusage`](https://github.com/ryoppippi/ccusage)。

[English](./README.md)

## 为什么需要它

`ccusage statusline` 只显示按 token 折算的「假设走 API」成本。但你订阅了 Claude Max / Pro，真正卡你的是 5 小时和 7 天的配额，不是钱。

Claude Code v1.2.80+ 其实已经在 statusline hook 的 stdin 里塞了 `rate_limits` 字段，**这个 wrapper 就是把它捞出来显示**。

```
🤖 Opus 4.7 (1M context) | 💰 $0.13 session / $161.90 today / $34.94 block (4h 10m left) | 🔥 $128.20/hr (Moderate) | 🧠 40,631 (4%)
📦 5h: 27.0% (resets 05/11 10:20) | 7d: 78.0% (resets 05/12 03:00)
```

第一行来自 `ccusage`，原样透传。第二行是这个 wrapper 加的。

颜色阈值：<50% 绿 / 50–80% 黄 / ≥80% 红 + 🚨。

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
2. 透传给 `ccusage statusline`，拿到原始输出
3. 从 payload 里取 `rate_limits.five_hour` / `rate_limits.seven_day`
4. 按颜色阈值 + 重置时间格式化，追加一行

整个实现不到 100 行，看 [`bin/cc-quota-statusline.mjs`](./bin/cc-quota-statusline.mjs) 就懂。

## 和上游的关系

这是个故意做得很小的 wrapper。「在 `ccusage statusline` 里渲染 `rate_limits`」本来就该是 ccusage 自己的功能，见 [ccusage#658](https://github.com/ryoppippi/ccusage/issues/658)。如果哪天 ccusage 原生支持了，这个 wrapper 就该退役 —— 那是好事。

## License

MIT
