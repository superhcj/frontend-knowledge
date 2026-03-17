# React

> React 18 + 19 重新定义了前端渲染模型。理解并发模式和 Server Components，才能用好现代 React。

## 核心 Hooks

### useState & useReducer

```typescript
// useState：简单状态
const [count, setCount] = useState(0)
const [user, setUser] = useState<User | null>(null)

// 函数式更新（当新值依赖旧值时必须用这种方式）
setCount(prev => prev + 1)

// 对象状态：合并更新
const [form, setForm] = useState({ name: '', email: '' })
setForm(prev => ({ ...prev, email: 'new@email.com' }))

// useReducer：复杂状态逻辑
type Action =
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'reset'; payload: number }

function counterReducer(state: number, action: Action): number {
  switch (action.type) {
    case 'increment': return state + 1
    case 'decrement': return state - 1
    case 'reset':     return action.payload
    default:          return state
  }
}

const [count, dispatch] = useReducer(counterReducer, 0)
dispatch({ type: 'increment' })
dispatch({ type: 'reset', payload: 10 })
```

### useEffect

```typescript
useEffect(() => {
  // 副作用逻辑
  const controller = new AbortController()

  fetch('/api/data', { signal: controller.signal })
    .then(r => r.json())
    .then(setData)
    .catch(err => {
      if (err.name !== 'AbortError') setError(err)
    })

  // 清理函数（组件卸载或依赖变化时执行）
  return () => controller.abort()
}, [userId]) // 依赖数组

// 常见陷阱
useEffect(() => {
  // ❌ 每次渲染都执行（遗漏依赖）
  fetchUser(userId).then(setUser)
}, []) // 缺少 userId

// ✅ 加上依赖
useEffect(() => {
  fetchUser(userId).then(setUser)
}, [userId])
```

### useMemo & useCallback

```typescript
// useMemo：缓存计算结果
const sortedList = useMemo(
  () => [...items].sort((a, b) => a.name.localeCompare(b.name)),
  [items] // 只有 items 变化才重新计算
)

// useCallback：缓存函数引用
const handleSubmit = useCallback(
  async (data: FormData) => {
    await submitForm(data)
    onSuccess?.()
  },
  [onSuccess] // 依赖
)

// ⚠️ 不要过度使用：
// - 计算开销小的，不需要 useMemo
// - 不传给子组件的函数，不需要 useCallback
// - React 19 引入编译器，大多数情况自动优化
```

### useRef

```typescript
// 1. 访问 DOM 元素
const inputRef = useRef<HTMLInputElement>(null)
const focus = () => inputRef.current?.focus()

// 2. 存储不触发重渲染的可变值
const timerRef = useRef<NodeJS.Timeout>()
const startTimer = () => {
  timerRef.current = setInterval(() => {}, 1000)
}
const stopTimer = () => clearInterval(timerRef.current)

// 3. 存储上一次的值
function usePrevious<T>(value: T): T | undefined {
  const ref = useRef<T>()
  useEffect(() => { ref.current = value })
  return ref.current
}
```

### useContext

```typescript
// 创建 Context
interface ThemeContextValue {
  theme: 'light' | 'dark'
  toggle: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

// Provider
function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const toggle = useCallback(() => {
    setTheme(t => t === 'light' ? 'dark' : 'light')
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  )
}

// 自定义 Hook（防止 null 检查）
function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider')
  return ctx
}

// 使用
function Header() {
  const { theme, toggle } = useTheme()
  return <button onClick={toggle}>当前: {theme}</button>
}
```

## 自定义 Hook

```typescript
// 数据请求 Hook
function useAsync<T>(asyncFn: () => Promise<T>, deps: DependencyList) {
  const [state, setState] = useState<{
    data: T | null
    loading: boolean
    error: Error | null
  }>({ data: null, loading: true, error: null })

  useEffect(() => {
    let cancelled = false

    setState(s => ({ ...s, loading: true, error: null }))
    asyncFn()
      .then(data => {
        if (!cancelled) setState({ data, loading: false, error: null })
      })
      .catch(error => {
        if (!cancelled) setState({ data: null, loading: false, error })
      })

    return () => { cancelled = true }
  }, deps)

  return state
}

// 本地存储 Hook
function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  const setStoredValue = useCallback((newValue: T | ((prev: T) => T)) => {
    setValue(prev => {
      const next = typeof newValue === 'function'
        ? (newValue as (prev: T) => T)(prev)
        : newValue
      localStorage.setItem(key, JSON.stringify(next))
      return next
    })
  }, [key])

  return [value, setStoredValue] as const
}
```

## 并发模式（React 18+）

```typescript
// useTransition：将状态更新标记为"非紧急"
function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isPending, startTransition] = useTransition()

  const handleSearch = (value: string) => {
    setQuery(value) // 立即更新输入框（紧急）
    startTransition(() => {
      setResults(searchData(value)) // 延迟更新列表（非紧急）
    })
  }

  return (
    <>
      <input value={query} onChange={e => handleSearch(e.target.value)} />
      {isPending && <Spinner />}
      <ResultList results={results} />
    </>
  )
}

// useDeferredValue：延迟非紧急值的更新
function List({ query }: { query: string }) {
  const deferredQuery = useDeferredValue(query)
  const isStale = query !== deferredQuery

  return (
    <div style={{ opacity: isStale ? 0.5 : 1 }}>
      <ExpensiveList filter={deferredQuery} />
    </div>
  )
}
```

## React Server Components（RSC）

React 19 的核心特性，组件在服务器端运行，零客户端 JS。

```typescript
// app/page.tsx（服务器组件，默认）
// ✅ 可以直接访问数据库、文件系统
// ✅ 不发送组件代码到客户端
// ❌ 不能用 useState、useEffect、事件处理

async function UsersPage() {
  // 直接在组件中 fetch，无需 API 路由
  const users = await db.user.findMany()

  return (
    <div>
      {users.map(user => <UserCard key={user.id} user={user} />)}
    </div>
  )
}

// 'use client' 标记客户端组件
'use client'
import { useState } from 'react'

function Counter() {
  const [count, setCount] = useState(0)
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>
}
```

## 性能优化

```typescript
// React.memo：跳过不必要的重渲染
const UserCard = memo(function UserCard({ user }: { user: User }) {
  return <div>{user.name}</div>
})

// 自定义比较函数
const ExpensiveList = memo(
  function ExpensiveList({ items }: { items: Item[] }) {
    return <ul>{items.map(i => <li key={i.id}>{i.name}</li>)}</ul>
  },
  (prev, next) => prev.items.length === next.items.length
)

// 代码分割（懒加载）
const HeavyChart = lazy(() => import('./HeavyChart'))

function Dashboard() {
  return (
    <Suspense fallback={<Skeleton />}>
      <HeavyChart />
    </Suspense>
  )
}

// 虚拟列表（渲染大量数据）
// npm install @tanstack/react-virtual
import { useVirtualizer } from '@tanstack/react-virtual'

function VirtualList({ items }: { items: string[] }) {
  const parentRef = useRef<HTMLDivElement>(null)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
  })

  return (
    <div ref={parentRef} style={{ height: '400px', overflow: 'auto' }}>
      <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
        {virtualizer.getVirtualItems().map(item => (
          <div
            key={item.key}
            style={{ position: 'absolute', top: item.start, height: item.size }}
          >
            {items[item.index]}
          </div>
        ))}
      </div>
    </div>
  )
}
```

## 延伸阅读

- [React 官方文档](https://react.dev/)
- [React 19 发布说明](https://react.dev/blog/2024/12/05/react-19)
- [Tanner Linsley - TanStack 系列](https://tanstack.com/)
- [patterns.dev - React 设计模式](https://www.patterns.dev/)
