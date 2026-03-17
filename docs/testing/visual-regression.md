# 视觉回归测试

> 像素级捕获 UI 变化，防止样式改动悄悄破坏页面外观。

## 什么是视觉回归测试

视觉回归测试通过截图对比来检测 UI 变化：
1. 运行基准测试，保存**参考截图**
2. 每次代码变更后重新截图
3. 对比两张图，超过阈值则报告差异

```
场景：修复了一个 padding Bug → 意外影响了 5 个其他组件的布局
→ 视觉回归测试立即发现，不会流入生产
```

## Playwright 视觉对比

Playwright 内置截图对比功能，无需额外工具：

```typescript
// visual/homepage.spec.ts
import { test, expect } from '@playwright/test'

test('首页视觉回归', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // 整页截图对比
  await expect(page).toHaveScreenshot('homepage.png', {
    fullPage: true,
    threshold: 0.1,       // 允许 10% 像素差异（抗锯齿）
    maxDiffPixelRatio: 0.01,  // 最多 1% 的像素可以不同
  })
})

test('按钮组件状态', async ({ page }) => {
  await page.goto('/components/button')

  // 元素级截图对比
  const primaryBtn = page.getByRole('button', { name: '主按钮' })
  await expect(primaryBtn).toHaveScreenshot('button-primary.png')

  // 悬停状态
  await primaryBtn.hover()
  await expect(primaryBtn).toHaveScreenshot('button-primary-hover.png')
})

test('响应式布局', async ({ page }) => {
  // 移动端
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto('/')
  await expect(page).toHaveScreenshot('homepage-mobile.png')

  // 平板
  await page.setViewportSize({ width: 768, height: 1024 })
  await expect(page).toHaveScreenshot('homepage-tablet.png')
})
```

```bash
# 首次运行：生成参考截图
npx playwright test --update-snapshots

# 日常运行：对比截图
npx playwright test visual/

# 查看差异报告
npx playwright show-report
```

### 参考截图管理

```
# 截图存储位置
visual/
  __screenshots__/
    homepage.spec.ts-snapshots/
      homepage-chromium-darwin.png   ← 按平台区分
      homepage-firefox-darwin.png
      homepage-webkit-darwin.png
```

```yaml
# .gitignore
# 提交参考截图到 git（版本控制 UI 的"标准外观"）
!visual/__screenshots__/
```

## Storybook + Chromatic

最完整的组件视觉回归方案，适合组件库：

```bash
# 安装 Storybook
npx storybook@latest init

# 安装 Chromatic（CI 云端对比服务）
npm install -D chromatic
```

```typescript
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'

const meta: Meta<typeof Button> = {
  component: Button,
  parameters: {
    chromatic: { delay: 300 },  // 等待动画完成
  },
}
export default meta

type Story = StoryObj<typeof Button>

export const Primary: Story = {
  args: { variant: 'primary', children: '主按钮' },
}

export const Danger: Story = {
  args: { variant: 'danger', children: '危险按钮' },
}

export const Loading: Story = {
  args: { loading: true, children: '加载中' },
}

export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 8 }}>
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="danger">Danger</Button>
      <Button disabled>Disabled</Button>
    </div>
  ),
}
```

```yaml
# .github/workflows/chromatic.yml
name: Chromatic

on: [push]

jobs:
  chromatic:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }        # 完整历史，用于 diff
      - run: npm ci
      - name: Publish to Chromatic
        uses: chromaui/action@latest
        with:
          projectToken: ${{ secrets.CHROMATIC_PROJECT_TOKEN }}
          exitZeroOnChanges: true       # 有变化时不标记 CI 失败，等人工审核
```

**Chromatic 工作流：**
1. 推送代码 → Chromatic 构建 Storybook → 截图所有 Story
2. 检测到视觉变化 → PR 中显示 diff 预览
3. 开发者审核：接受变化（更新基准）或拒绝（修复 Bug）

## Percy（另一个选项）

```bash
npm install -D @percy/cli @percy/playwright
```

```typescript
import { percySnapshot } from '@percy/playwright'

test('首页快照', async ({ page }) => {
  await page.goto('/')
  await percySnapshot(page, 'Homepage')
  await percySnapshot(page, 'Homepage - Mobile', {
    widths: [375],
  })
})
```

```bash
npx percy exec -- npx playwright test
```

## 最佳实践

```typescript
// 1. 隔离动态内容（时间、随机数等）
test('含动态内容的页面', async ({ page }) => {
  await page.goto('/dashboard')

  // 遮罩动态元素
  await expect(page).toHaveScreenshot('dashboard.png', {
    mask: [
      page.locator('.timestamp'),
      page.locator('.user-greeting'),
    ],
  })
})

// 2. 等待内容稳定
test('图表渲染', async ({ page }) => {
  await page.goto('/analytics')

  // 等待图表渲染完成
  await page.waitForSelector('.chart-loaded')
  await page.waitForTimeout(500)  // 等待动画完成

  await expect(page).toHaveScreenshot('analytics.png')
})

// 3. 关闭动画（消除不确定性）
// playwright.config.ts
use: {
  reducedMotion: 'reduce',    // 禁用动画
  colorScheme: 'light',       // 固定配色方案
}
```

## 延伸阅读

- [Playwright 视觉对比文档](https://playwright.dev/docs/test-snapshots)
- [Chromatic 文档](https://www.chromatic.com/docs)
- [Storybook 文档](https://storybook.js.org/)
- [Percy 文档](https://docs.percy.io/)
