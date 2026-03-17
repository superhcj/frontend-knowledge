# CI/CD 流水线

> 好的 CI/CD 让每次提交都自动经过质量检查和部署，把人从重复劳动中解放出来。

## 核心概念

```
CI（持续集成）：代码合并 → 自动构建 + 测试
CD（持续交付）：CI 通过 → 自动部署到测试/预发环境
CD（持续部署）：自动部署到生产环境（需要高度自动化的测试保障）
```

## GitHub Actions

### 基础工作流

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v3
        with: { version: 9 }

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm          # 缓存 pnpm store

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check
        run: pnpm tsc --noEmit

      - name: Lint
        run: pnpm lint

      - name: Unit tests
        run: pnpm test --coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}

      - name: Build
        run: pnpm build
```

### 完整前端 CI/CD 流水线

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  # 第一阶段：质量检查（并行）
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm tsc --noEmit
      - run: pnpm lint
      - run: pnpm test --run

  # 第二阶段：构建
  build:
    runs-on: ubuntu-latest
    needs: quality        # 等质量检查通过
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
        env:
          VITE_API_URL: ${{ secrets.PROD_API_URL }}

      - name: Upload build artifact
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
          retention-days: 1

  # 第三阶段：E2E 测试
  e2e:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: npx playwright install --with-deps chromium

      - name: Download build
        uses: actions/download-artifact@v4
        with: { name: dist, path: dist }

      - run: npx playwright test
        env:
          BASE_URL: http://localhost:4173

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/

  # 第四阶段：生产部署
  deploy-prod:
    runs-on: ubuntu-latest
    needs: [build, e2e]
    environment:
      name: production
      url: https://app.example.com
    steps:
      - name: Download build
        uses: actions/download-artifact@v4
        with: { name: dist, path: dist }

      - name: Deploy to Vercel
        run: npx vercel deploy dist --prod --token=${{ secrets.VERCEL_TOKEN }}
```

### 环境变量与 Secrets

```yaml
# 使用 GitHub Secrets（Settings → Secrets and variables）
env:
  DATABASE_URL: ${{ secrets.DATABASE_URL }}
  API_KEY: ${{ secrets.API_KEY }}

# 区分环境
env:
  API_URL: ${{ github.ref == 'refs/heads/main' && secrets.PROD_API_URL || secrets.STAGING_API_URL }}
```

### PR 自动化

```yaml
# .github/workflows/pr-check.yml
name: PR Checks

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  size-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install && pnpm build

      # Bundle 大小检测（超过阈值自动评论告警）
      - uses: preactjs/compressed-size-action@v2
        with:
          repo-token: ${{ secrets.GITHUB_TOKEN }}

  preview-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pnpm install && pnpm build

      # 部署预览环境，PR 中自动评论预览链接
      - uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

## 部署平台对比

| 平台 | 适合场景 | 特点 |
|------|---------|------|
| **Vercel** | Next.js / 前端项目 | 零配置、全球 CDN、Preview 部署 |
| **Netlify** | 静态站点 | 表单、Functions、Split Testing |
| **GitHub Pages** | 开源项目文档 | 免费、简单 |
| **Cloudflare Pages** | 高性能需求 | 最快的 CDN、Workers 集成 |
| **腾讯云 CODING** | 国内企业 | 内网访问、合规 |

## 发布策略

```yaml
# 蓝绿部署（Zero-downtime deployment）
# 同时运行两个生产环境，切换流量

# 金丝雀发布（Canary Release）
# 先把 5% 流量切到新版本，监控无问题后全量

# 功能开关（Feature Flags）
# 代码已部署但通过配置控制是否开启
import { useFeatureFlag } from '@/flags'

function NewFeature() {
  const enabled = useFeatureFlag('new-checkout-flow')
  if (!enabled) return <OldCheckout />
  return <NewCheckout />
}
```

## 延伸阅读

- [GitHub Actions 文档](https://docs.github.com/actions)
- [Vercel 文档](https://vercel.com/docs)
- [DORA 指标](https://dora.dev/) — 衡量 DevOps 效能的四个关键指标
