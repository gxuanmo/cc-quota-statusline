# cc-quota-statusline — Project Conventions

## 项目目的

ccusage 的轻量 statusline wrapper。cc v1.2.80+ 在 stdin 注入了 `rate_limits` 字段，ccusage 没读，我们读了贴在 ccusage 输出后面。

## 关键决策

- **不重写 ccusage**：只做 wrapper，依赖 ccusage 本体输出。理由：ccusage 本身就是这个生态的事实标准，重写会分流社区。
- **不内置 disk caching**：作者本地的 `usage-cache.json` 落盘逻辑是个人需求（给其他脚本读），不属于公共 wrapper 职责，发布时已删除。
- **未发 npm**：作者没 npm 账号，分发走 GitHub clone + 绝对路径配置。
- **依赖 ccusage 全局安装**：wrapper 直接 `spawnSync('ccusage', ...)`，不走 `npx`（statusline 频繁调用，npx 启动成本高）。用户需要 `npm install -g ccusage`。

## 文件结构

```
bin/cc-quota-statusline.mjs   主程序，单文件
package.json                  保留以便未来上 npm
README.md / README.zh-CN.md   双语，README 是英文优先
LICENSE                       MIT
```

新功能尽量单文件维护；只有当主文件超过 200 行才考虑拆。

## 测试

`npm test` 只跑 `node --check`（语法验证）。端到端测试依赖 ccusage 已装 + 真实 cc payload，本地手动跑：

```bash
echo '<payload>' | node bin/cc-quota-statusline.mjs
```

样本 payload 参考 `~/.claude/usage-cache.json`。

## 发布流程

当前：只发 GitHub，无 npm 包。

未来上 npm 的话：
1. `package.json` 里 author/repo 已就位
2. 必须 `npm publish --registry https://registry.npmjs.org`（本机默认 registry 是淘宝镜像，只读）
3. 发布前 `npm view cc-quota-statusline` 确认包名未被占

## 边界 / 不做的事

- 不加 disk caching（这是 wrapper 调用方的事）
- 不加配置文件支持（出参格式固定，要改直接改源码 fork）
- 不做多语言输出（保持单一英文输出，国际化交给上游 ccusage 处理）
- 不内置 ESLint/Prettier（单文件项目，过度工程）
