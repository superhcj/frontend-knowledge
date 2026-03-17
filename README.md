# 前端知识框架

一份全面、系统、持续更新的前端工程师知识体系，基于 [VitePress](https://vitepress.dev/) 构建。

## 本地开发

```bash
# 安装依赖（推荐 pnpm）
pnpm install

# 启动开发服务器
pnpm docs:dev

# 构建静态文件
pnpm docs:build

# 预览构建结果
pnpm docs:preview
```

## 部署

推送到 `main` 分支后，GitHub Actions 自动构建并部署到 GitHub Pages。

## 内容模块

| 模块 | 路径 |
|------|------|
| 语言基础 | `docs/basics/` |
| 工程化体系 | `docs/engineering/` |
| 框架与库 | `docs/frameworks/` |
| 网络与协议 | `docs/network/` |
| 性能与体验 | `docs/performance/` |
| 测试与质量 | `docs/testing/` |
| 前沿技术 | `docs/advanced/` |

## License

MIT
