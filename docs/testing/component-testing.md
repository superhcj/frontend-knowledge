# 组件测试

> 组件测试介于单元测试和 E2E 之间：在真实 DOM 环境中测试组件行为，而非实现细节。

## Testing Library 哲学

> "测试越像软件的使用方式，就越能给你信心。" — Kent C. Dodds

**核心原则：**
- 不测试实现细节（不查找类名、state、内部方法）
- 像用户一样交互（点击、输入、等待）
- 通过语义化查询定位元素（role、label、text）

## 安装

```bash
# React
npm install -D @testing-library/react @testing-library/user-event

# Vue
npm install -D @testing-library/vue

# Svelte
npm install -D @testing-library/svelte
```

## React 组件测试

```typescript
// components/Button.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

describe('Button', () => {
  it('渲染按钮文本', () => {
    render(<Button>点击我</Button>)
    expect(screen.getByRole('button', { name: '点击我' })).toBeInTheDocument()
  })

  it('点击时触发 onClick', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(<Button onClick={handleClick}>点击我</Button>)
    await user.click(screen.getByRole('button'))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('disabled 时不触发点击', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(<Button disabled onClick={handleClick}>点击我</Button>)
    await user.click(screen.getByRole('button'))

    expect(handleClick).not.toHaveBeenCalled()
  })

  it('loading 状态显示加载文本', () => {
    render(<Button loading>提交</Button>)
    expect(screen.getByText('加载中...')).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

### 表单测试

```typescript
// components/LoginForm.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LoginForm } from './LoginForm'

describe('LoginForm', () => {
  it('提交正确数据', async () => {
    const onSubmit = vi.fn()
    const user = userEvent.setup()

    render(<LoginForm onSubmit={onSubmit} />)

    // 填写表单
    await user.type(screen.getByLabelText('邮箱'), 'user@example.com')
    await user.type(screen.getByLabelText('密码'), 'password123')
    await user.click(screen.getByRole('button', { name: '登录' }))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password123',
      })
    })
  })

  it('邮箱格式错误时显示错误', async () => {
    const user = userEvent.setup()
    render(<LoginForm onSubmit={vi.fn()} />)

    await user.type(screen.getByLabelText('邮箱'), 'notanemail')
    await user.click(screen.getByRole('button', { name: '登录' }))

    expect(await screen.findByText('请输入有效的邮箱地址')).toBeInTheDocument()
  })
})
```

### 异步组件测试

```typescript
// components/UserList.test.tsx
import { render, screen, waitForElementToBeRemoved } from '@testing-library/react'
import { vi } from 'vitest'
import { UserList } from './UserList'
import * as api from '../api'

describe('UserList', () => {
  it('加载后显示用户列表', async () => {
    vi.spyOn(api, 'fetchUsers').mockResolvedValue([
      { id: 1, name: '张三' },
      { id: 2, name: '李四' },
    ])

    render(<UserList />)

    // 等待加载状态消失
    await waitForElementToBeRemoved(() => screen.queryByText('加载中...'))

    // 验证数据显示
    expect(screen.getByText('张三')).toBeInTheDocument()
    expect(screen.getByText('李四')).toBeInTheDocument()
  })

  it('加载失败显示错误', async () => {
    vi.spyOn(api, 'fetchUsers').mockRejectedValue(new Error('网络错误'))

    render(<UserList />)

    expect(await screen.findByRole('alert')).toHaveTextContent('网络错误')
  })
})
```

### 测试带 Context 的组件

```typescript
// test-utils.tsx（自定义 render 工厂）
import { render, type RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '../providers/ThemeProvider'
import { RouterProvider } from '../providers/RouterProvider'

function AllProviders({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RouterProvider>
          {children}
        </RouterProvider>
      </ThemeProvider>
    </QueryClientProvider>
  )
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: RenderOptions
) {
  return render(ui, { wrapper: AllProviders, ...options })
}

// 使用
import { renderWithProviders } from '../test-utils'

test('组件在完整环境中正常运行', () => {
  renderWithProviders(<MyComponent />)
  // ...
})
```

## 查询优先级

```typescript
// 按推荐优先级排序：

// 1. 可访问性查询（最推荐）
screen.getByRole('button', { name: '提交' })
screen.getByLabelText('邮箱地址')
screen.getByPlaceholderText('请输入邮箱')
screen.getByText('欢迎回来')
screen.getByDisplayValue('selected-value')

// 2. 语义化查询
screen.getByAltText('用户头像')
screen.getByTitle('关闭对话框')

// 3. 测试 ID（最后手段）
screen.getByTestId('submit-btn')
```

## 延伸阅读

- [Testing Library 文档](https://testing-library.com/docs/)
- [userEvent v14 文档](https://testing-library.com/docs/user-event/intro)
- [Kent C. Dodds - 避免测试实现细节](https://kentcdodds.com/blog/testing-implementation-details)
