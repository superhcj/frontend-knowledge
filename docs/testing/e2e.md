# E2E 测试（Playwright）

> E2E 测试模拟真实用户行为，是质量保障的最后防线。Playwright 是目前最强大的 E2E 测试工具。

## 为什么选 Playwright

- **跨浏览器**：Chromium、Firefox、WebKit（Safari 引擎）
- **自动等待**：智能等待元素可交互，告别 `sleep()`
- **强大的调试工具**：UI 模式、Trace Viewer、录制器
- **并行执行**：多浏览器、多 worker 并行，速度快
- **网络拦截**：Mock API 响应，无需依赖后端

## 安装与配置

```bash
npm init playwright@latest
# 选择 TypeScript、测试目录、CI 配置
```

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,           // 单个测试超时
  expect: { timeout: 5000 }, // 断言超时
  fullyParallel: true,        // 并行执行
  retries: process.env.CI ? 2 : 0,  // CI 环境重试
  workers: process.env.CI ? 1 : undefined,

  reporter: [
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/results.json' }],
  ],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',         // 失败时记录 trace
    screenshot: 'only-on-failure',   // 失败时截图
    video: 'on-first-retry',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
    { name: 'mobile',   use: { ...devices['iPhone 13'] } },
  ],

  // 运行测试前启动开发服务器
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
})
```

## 基础用法

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

test.describe('登录流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
  })

  test('使用正确凭据登录成功', async ({ page }) => {
    // 填写表单
    await page.fill('[data-testid="email"]', 'user@example.com')
    await page.fill('[data-testid="password"]', 'password123')
    await page.click('[data-testid="submit"]')

    // 等待跳转
    await page.waitForURL('/dashboard')

    // 断言
    await expect(page).toHaveURL('/dashboard')
    await expect(page.getByRole('heading', { name: '欢迎回来' })).toBeVisible()
    await expect(page.getByTestId('user-avatar')).toBeVisible()
  })

  test('密码错误显示错误信息', async ({ page }) => {
    await page.fill('[data-testid="email"]', 'user@example.com')
    await page.fill('[data-testid="password"]', 'wrongpassword')
    await page.click('[data-testid="submit"]')

    await expect(page.getByRole('alert')).toContainText('邮箱或密码错误')
    await expect(page).toHaveURL('/login') // 没有跳转
  })
})
```

## 定位器（Locators）

```typescript
// 推荐：语义化定位（用户视角）
page.getByRole('button', { name: '提交' })        // 按 ARIA role
page.getByLabel('邮箱地址')                         // 按 label 文本
page.getByPlaceholder('请输入邮箱')                 // 按 placeholder
page.getByText('登录成功')                          // 按文本内容
page.getByAltText('用户头像')                       // 按 alt 文本（图片）
page.getByTitle('查看详情')                         // 按 title 属性

// data-testid（不推荐过度依赖，但稳定）
page.getByTestId('submit-button')

// CSS / XPath（最后手段）
page.locator('.submit-btn')
page.locator('//button[contains(@class,"primary")]')

// 链式组合
page.getByRole('dialog').getByRole('button', { name: '确认' })
```

## Mock API

```typescript
// 拦截 API 请求，无需依赖真实后端
test('显示用户列表', async ({ page }) => {
  // 拦截并 Mock 响应
  await page.route('**/api/users', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, name: '张三', email: 'zhangsan@example.com' },
        { id: 2, name: '李四', email: 'lisi@example.com' },
      ]),
    })
  })

  await page.goto('/users')

  await expect(page.getByRole('list')).toBeVisible()
  await expect(page.getByText('张三')).toBeVisible()
  await expect(page.getByText('李四')).toBeVisible()
})

// Mock 错误状态
test('API 错误时显示错误信息', async ({ page }) => {
  await page.route('**/api/users', route => {
    route.fulfill({ status: 500, body: '服务器错误' })
  })

  await page.goto('/users')
  await expect(page.getByRole('alert')).toContainText('加载失败')
})
```

## Page Object Model（POM）

抽象页面操作，测试代码更易维护：

```typescript
// e2e/pages/LoginPage.ts
import { type Page, type Locator, expect } from '@playwright/test'

export class LoginPage {
  readonly page: Page
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly submitButton: Locator
  readonly errorMessage: Locator

  constructor(page: Page) {
    this.page = page
    this.emailInput = page.getByLabel('邮箱')
    this.passwordInput = page.getByLabel('密码')
    this.submitButton = page.getByRole('button', { name: '登录' })
    this.errorMessage = page.getByRole('alert')
  }

  async goto() {
    await this.page.goto('/login')
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.submitButton.click()
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toContainText(message)
  }
}

// 测试文件使用
test('登录', async ({ page }) => {
  const loginPage = new LoginPage(page)
  await loginPage.goto()
  await loginPage.login('user@example.com', 'password123')
  await page.waitForURL('/dashboard')
})
```

## CI 集成

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run E2E tests
        run: npx playwright test

      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7
```

## 常用调试命令

```bash
# 运行所有测试
npx playwright test

# 打开 UI 模式（交互式调试）
npx playwright test --ui

# 只运行指定文件
npx playwright test e2e/auth.spec.ts

# 只运行指定测试（按名称过滤）
npx playwright test -g "登录成功"

# 查看测试报告
npx playwright show-report

# 录制新测试
npx playwright codegen http://localhost:3000

# 调试模式（单步执行）
npx playwright test --debug
```

## 延伸阅读

- [Playwright 官方文档](https://playwright.dev/)
- [Playwright 最佳实践](https://playwright.dev/docs/best-practices)
- [Testing Library 思想](https://testing-library.com/docs/guiding-principles)
