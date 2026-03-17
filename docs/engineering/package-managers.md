# 包管理

> 包管理器不只是装包的工具，它决定了你的依赖一致性、磁盘占用和安装速度。

## npm、pnpm、yarn 对比

| 维度 | npm | yarn (classic) | yarn (berry) | pnpm |
|------|-----|----------------|--------------|------|
| 磁盘占用 | 高（重复安装）| 高 | 较高 | **最低（硬链接）**|
| 安装速度 | 中 | 快 | 快 | **最快** |
| 幽灵依赖 | 有 | 有 | 无 | **无** |
| Monorepo | workspace | workspace | workspace | **workspace（最好）**|
| 推荐度 | 兼容性最好 | 老项目 | 少数 | **新项目首选** |

**推荐：新项目用 pnpm，老项目保持现有工具。**

## pnpm

### 核心优势

pnpm 使用**内容寻址存储 + 硬链接**：
- 所有包存储在全局 `~/.pnpm-store/`（仅一份）
- 项目 `node_modules` 通过硬链接引用，极省磁盘
- 严格的 `node_modules` 结构，消灭幽灵依赖

```bash
# 安装
npm install -g pnpm

# 常用命令
pnpm install          # 安装所有依赖
pnpm add react        # 添加生产依赖
pnpm add -D vite      # 添加开发依赖
pnpm add -g pnpm      # 全局安装
pnpm remove react     # 移除依赖
pnpm update           # 更新依赖
pnpm update react     # 更新指定包
pnpm outdated         # 查看过时的包

# 执行脚本
pnpm dev
pnpm run build

# 查看依赖树
pnpm list
pnpm why react        # 为什么安装了某个包
```

### .npmrc 推荐配置

```ini
# .npmrc
shamefully-hoist=false    # 保持严格模式（默认）
strict-peer-dependencies=false
auto-install-peers=true   # 自动安装 peer dependencies
```

### pnpm workspace（Monorepo）

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'apps/*'
  - '!**/__tests__/**'
```

```bash
# 在指定 workspace 中安装
pnpm --filter @myapp/ui add react

# 添加内部包依赖
pnpm --filter @myapp/web add @myapp/ui

# 在所有 workspace 中执行命令
pnpm --filter '*' run build

# 并行执行（更快）
pnpm --filter '*' run build --parallel
```

## npm

### 核心命令

```bash
# 初始化
npm init -y

# 安装
npm install              # 根据 package.json 安装
npm install react        # 安装到 dependencies
npm install -D vite      # 安装到 devDependencies
npm install -g pnpm      # 全局安装
npm ci                   # 严格按 package-lock.json 安装（CI 推荐）

# 更新
npm update
npm update react
npm outdated             # 查看可更新的包

# 审计
npm audit                # 检查安全漏洞
npm audit fix            # 自动修复

# 发布
npm publish
npm publish --tag beta
```

### package.json 关键字段

```json
{
  "name": "my-package",
  "version": "1.2.3",
  "description": "...",
  "type": "module",

  "main": "./dist/index.cjs",        // CommonJS 入口
  "module": "./dist/index.esm.js",   // ESM 入口（非标准，但广泛支持）
  "exports": {                        // 现代入口（覆盖 main/module）
    ".": {
      "import": "./dist/index.esm.js",
      "require": "./dist/index.cjs",
      "types": "./dist/index.d.ts"
    },
    "./utils": "./dist/utils.js"
  },
  "types": "./dist/index.d.ts",

  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "lint": "eslint . --ext .ts,.tsx",
    "typecheck": "tsc --noEmit",
    "prepare": "husky"               // install 后自动执行
  },

  "engines": {
    "node": ">=18",
    "pnpm": ">=9"
  },

  "dependencies": { ... },
  "devDependencies": { ... },
  "peerDependencies": {              // 宿主环境需要提供的依赖
    "react": ">=18"
  }
}
```

## 版本号规范（SemVer）

```
主版本.次版本.修订版本
MAJOR.MINOR.PATCH

1.0.0  →  2.0.0   破坏性变更（Breaking Change）
1.0.0  →  1.1.0   新功能（向下兼容）
1.0.0  →  1.0.1   bug 修复

预发布版本：
1.0.0-alpha.1     内部测试
1.0.0-beta.1      公开测试
1.0.0-rc.1        发布候选
```

### 版本范围

```json
{
  "react": "^18.0.0",   // ^：允许次版本更新（>=18.0.0 <19.0.0）
  "lodash": "~4.17.0",  // ~：只允许修订版本更新（>=4.17.0 <4.18.0）
  "axios": "1.6.0",     // 精确版本（不推荐，太死板）
  "vite": ">=5.0.0",    // 大于等于
  "react-dom": "*"      // 任意版本（危险，不推荐）
}
```

## lock 文件

lock 文件（`package-lock.json` / `pnpm-lock.yaml` / `yarn.lock`）保证了**每个人安装的版本完全一致**。

```bash
# ✅ 正确做法
git add package-lock.json  # 一定要提交到 git！

# ❌ 错误做法
echo "package-lock.json" >> .gitignore  # 永远不要这样做
```

**CI 环境使用锁定安装：**
```bash
npm ci           # 严格按 package-lock.json，更快更安全
pnpm install --frozen-lockfile
yarn install --immutable
```

## 延伸阅读

- [pnpm 官方文档](https://pnpm.io/zh/)
- [npm 文档](https://docs.npmjs.com/)
- [SemVer 规范](https://semver.org/lang/zh-CN/)
- [Node.js 包的 exports 字段](https://nodejs.org/api/packages.html#exports)
