# Monorepo

> Monorepo 将多个项目放在同一个仓库中管理，解决代码共享、版本协调和跨包重构的痛点。

## Monorepo vs Polyrepo

| 维度 | Monorepo | Polyrepo |
|------|----------|---------|
| 代码共享 | 简单（直接引用）| 需要发包或 npm link |
| 原子提交 | 支持跨包变更 | 需要多次提交 |
| 工具统一 | 容易 | 各自为政 |
| 仓库规模 | 大 | 小 |
| 权限控制 | 粗粒度 | 细粒度 |
| 适合场景 | 组件库、设计系统、全栈项目 | 完全独立的产品线 |

## pnpm workspace（推荐）

最轻量的 Monorepo 方案，零配置依赖提升。

```
my-monorepo/
├── pnpm-workspace.yaml
├── package.json
├── packages/
│   ├── ui/             # 组件库
│   ├── utils/          # 工具函数
│   └── config/         # 共享配置（ESLint、TypeScript）
└── apps/
    ├── web/            # 主站 Next.js
    ├── admin/          # 后台 Vite + React
    └── docs/           # 文档站 VitePress
```

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

```json
// package.json（根）
{
  "name": "my-monorepo",
  "private": true,
  "scripts": {
    "dev": "pnpm --filter './apps/*' run dev --parallel",
    "build": "pnpm --filter './packages/*' run build && pnpm --filter './apps/*' run build",
    "test": "pnpm --filter '*' run test",
    "lint": "pnpm --filter '*' run lint"
  },
  "devDependencies": {
    "turbo": "^2.0.0"
  }
}
```

### 包间引用

```json
// apps/web/package.json
{
  "name": "@myapp/web",
  "dependencies": {
    "@myapp/ui": "workspace:*",      // 引用本地包
    "@myapp/utils": "workspace:*"
  }
}
```

```typescript
// apps/web/src/pages/Home.tsx
import { Button, Card } from '@myapp/ui'
import { formatDate } from '@myapp/utils'
```

## Turborepo

构建缓存 + 任务编排工具，让 Monorepo 的构建飞起来。

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],       // 先构建依赖包
      "outputs": ["dist/**", ".next/**"],
      "cache": true
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "outputs": []
    }
  }
}
```

```bash
# 构建所有包（自动并行 + 缓存）
pnpm turbo build

# 只构建 @myapp/web 及其依赖
pnpm turbo build --filter=@myapp/web

# 查看任务图
pnpm turbo build --graph
```

### Remote Cache（远程缓存）

```bash
# 登录 Vercel Remote Cache（免费）
npx turbo login
npx turbo link

# CI 中使用远程缓存
TURBO_TOKEN=xxx turbo build
# 第一次构建：慢（计算+上传缓存）
# 后续构建：极快（命中缓存，直接下载结果）
```

## 共享配置包

```json
// packages/config/package.json
{
  "name": "@myapp/config",
  "version": "1.0.0",
  "exports": {
    "./eslint": "./eslint.config.js",
    "./tsconfig/base": "./tsconfig.base.json",
    "./tsconfig/react": "./tsconfig.react.json"
  }
}
```

```json
// packages/config/tsconfig.base.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true
  }
}
```

```json
// apps/web/tsconfig.json
{
  "extends": "@myapp/config/tsconfig/react",
  "compilerOptions": {
    "outDir": "dist",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

## 版本管理：Changesets

管理包版本和 CHANGELOG 发布。

```bash
npm install -D @changesets/cli
npx changeset init

# 开发完成后：记录变更
npx changeset
# 选择变更的包、版本类型（major/minor/patch）、描述变更

# CI/CD 中发布
npx changeset version  # 更新版本号和 CHANGELOG
npx changeset publish  # 发布到 npm
```

```yaml
# .github/workflows/release.yml
- name: Create Release PR or Publish
  uses: changesets/action@v1
  with:
    publish: pnpm changeset publish
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## 延伸阅读

- [Turborepo 文档](https://turbo.build/repo/docs)
- [pnpm workspace 文档](https://pnpm.io/workspaces)
- [Changesets 文档](https://github.com/changesets/changesets)
- [Nx - 另一个 Monorepo 工具](https://nx.dev/)
