# 单元测试（Vitest）

> 好的测试不只是验证代码，更是活文档——它告诉你这段代码应该做什么。

## 为什么选 Vitest

- **极快**：基于 Vite，共享配置，HMR 级别的测试速度
- **兼容 Jest API**：几乎零迁移成本
- **原生 ESM 支持**：无需转换
- **内置 TypeScript**：无需额外配置

## 安装与配置

```bash
npm install -D vitest @vitest/ui jsdom @testing-library/jest-dom
```

```typescript
// vite.config.ts（或单独的 vitest.config.ts）
/// <reference types="vitest" />
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    environment: 'jsdom',           // 模拟浏览器环境
    globals: true,                  // 全局 describe/it/expect，无需 import
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: ['node_modules', '*.config.ts'],
    },
  },
})
```

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom'
```

```json
// package.json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

## 测试基础

### 结构

```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('Calculator', () => {
  // 每个测试前执行
  beforeEach(() => { /* setup */ })
  afterEach(() => { /* cleanup */ })

  describe('add()', () => {
    it('应该正确相加两个正数', () => {
      expect(add(1, 2)).toBe(3)
    })

    it('应该处理负数', () => {
      expect(add(-1, 1)).toBe(0)
    })
  })
})
```

### 断言（Assertions）

```typescript
// 基础比较
expect(value).toBe(42)           // 严格相等（===）
expect(value).toEqual({ a: 1 }) // 深度相等（对象/数组）
expect(value).toStrictEqual({}) // 更严格的深度相等（检查 undefined 属性）

// 真值
expect(value).toBeTruthy()
expect(value).toBeFalsy()
expect(value).toBeNull()
expect(value).toBeUndefined()
expect(value).toBeDefined()

// 数字
expect(0.1 + 0.2).toBeCloseTo(0.3) // 浮点数比较
expect(value).toBeGreaterThan(0)
expect(value).toBeLessThanOrEqual(100)

// 字符串
expect(str).toContain('hello')
expect(str).toMatch(/^hello/)

// 数组
expect(arr).toHaveLength(3)
expect(arr).toContain(item)
expect(arr).toEqual(expect.arrayContaining([1, 2]))

// 对象
expect(obj).toHaveProperty('name', 'Alice')
expect(obj).toMatchObject({ id: 1 })  // 部分匹配

// 异常
expect(() => throwError()).toThrow()
expect(() => throwError()).toThrow('错误信息')
expect(() => throwError()).toThrow(TypeError)

// 异步
await expect(asyncFn()).resolves.toBe(42)
await expect(asyncFn()).rejects.toThrow('error')
```

## Mock（模拟）

```typescript
// vi.fn()：创建 mock 函数
const mockFn = vi.fn()
mockFn('arg1', 'arg2')

expect(mockFn).toHaveBeenCalled()
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2')
expect(mockFn).toHaveBeenCalledTimes(1)

// 设置返回值
const mock = vi.fn().mockReturnValue(42)
const asyncMock = vi.fn().mockResolvedValue({ data: [] })
const rejectMock = vi.fn().mockRejectedValue(new Error('失败'))

// 序列返回值
mock
  .mockReturnValueOnce(1)   // 第一次调用返回 1
  .mockReturnValueOnce(2)   // 第二次返回 2
  .mockReturnValue(0)        // 之后都返回 0

// vi.spyOn()：监听真实对象的方法
const spy = vi.spyOn(console, 'log')
console.log('test')
expect(spy).toHaveBeenCalledWith('test')
spy.mockRestore() // 恢复原始实现

// vi.mock()：模拟整个模块
vi.mock('./api', () => ({
  fetchUser: vi.fn().mockResolvedValue({ id: 1, name: 'Alice' }),
  fetchPosts: vi.fn().mockResolvedValue([]),
}))
```

## 实际测试示例

### 工具函数

```typescript
// src/utils/formatDate.ts
export function formatDate(date: Date, locale = 'zh-CN'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date)
}

// src/utils/formatDate.test.ts
describe('formatDate', () => {
  it('应该格式化为中文日期', () => {
    const date = new Date('2026-03-17')
    expect(formatDate(date)).toBe('2026年3月17日')
  })

  it('应该支持英文 locale', () => {
    const date = new Date('2026-03-17')
    expect(formatDate(date, 'en-US')).toMatch(/March 17, 2026/)
  })
})
```

### 异步函数

```typescript
// src/services/userService.ts
export async function getUser(id: number) {
  const res = await fetch(`/api/users/${id}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// src/services/userService.test.ts
describe('getUser', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('应该返回用户数据', async () => {
    const mockUser = { id: 1, name: 'Alice' }
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockUser),
    } as Response)

    const user = await getUser(1)
    expect(user).toEqual(mockUser)
    expect(fetch).toHaveBeenCalledWith('/api/users/1')
  })

  it('当服务器返回错误时应该抛出异常', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 404,
    } as Response)

    await expect(getUser(1)).rejects.toThrow('HTTP 404')
  })
})
```

## 测试覆盖率

```bash
npx vitest run --coverage
```

```
----------|---------|----------|---------|---------|
File      | % Stmts | % Branch | % Funcs | % Lines |
----------|---------|----------|---------|---------|
utils/    |   95.5  |   88.2   |  100.0  |   95.5  |
 format.ts|  100.0  |  100.0   |  100.0  |  100.0  |
 parse.ts |   91.0  |   76.4   |  100.0  |   91.0  |
----------|---------|----------|---------|---------|
```

**覆盖率目标参考：**
- 工具函数、业务逻辑：**90%+**
- UI 组件：**70%+**（用组件测试补充）
- 总体：**80%+**（作为 CI 红线）

## 延伸阅读

- [Vitest 官方文档](https://vitest.dev/)
- [Testing Library 文档](https://testing-library.com/)
- [Kent C. Dodds - Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)
