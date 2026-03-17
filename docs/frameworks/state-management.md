# 状态管理

> 状态管理不是银弹——小应用用 Context/Provide，中型用轻量状态库，大型才考虑复杂方案。

## 选型原则

```
应用规模    推荐方案
────────────────────────────────────
组件内      useState / ref
跨层级      Context / Provide-Inject
中小型应用  Zustand / Pinia / Jotai
大型复杂    Redux Toolkit / XState
服务端数据  TanStack Query / SWR（不算状态管理，但解决 80% 的"状态"问题）
```

:::tip 先问自己
大多数"需要全局状态"的场景，其实是**服务端缓存状态**（API 数据），用 TanStack Query/SWR 管理远比手写 store 好。只有真正的客户端全局状态（主题、语言、用户偏好）才需要状态管理库。
:::

## Zustand（React）

最流行的 React 轻量状态库，API 极简，无 Provider 包裹。

```typescript
// store/useCounterStore.ts
import { create } from 'zustand'
import { persist, devtools } from 'zustand/middleware'

interface CounterState {
  count: number
  increment: () => void
  decrement: () => void
  reset: () => void
  incrementBy: (delta: number) => void
}

export const useCounterStore = create<CounterState>()(
  devtools(                       // Redux DevTools 支持
    persist(                      // 持久化到 localStorage
      (set, get) => ({
        count: 0,
        increment: () => set(state => ({ count: state.count + 1 })),
        decrement: () => set(state => ({ count: state.count - 1 })),
        reset: () => set({ count: 0 }),
        incrementBy: (delta) => set(state => ({ count: state.count + delta })),
      }),
      { name: 'counter-storage' }
    )
  )
)

// 组件中使用
function Counter() {
  // ✅ 只订阅需要的字段，精确更新
  const count = useCounterStore(state => state.count)
  const increment = useCounterStore(state => state.increment)

  return <button onClick={increment}>{count}</button>
}
```

### 复杂 Store 实践

```typescript
// store/useUserStore.ts
interface UserStore {
  user: User | null
  loading: boolean
  error: string | null
  fetchUser: (id: number) => Promise<void>
  updateUser: (updates: Partial<User>) => Promise<void>
  logout: () => void
}

export const useUserStore = create<UserStore>()(
  devtools((set, get) => ({
    user: null,
    loading: false,
    error: null,

    fetchUser: async (id) => {
      set({ loading: true, error: null })
      try {
        const user = await userApi.getUser(id)
        set({ user, loading: false })
      } catch (e) {
        set({ error: e.message, loading: false })
      }
    },

    updateUser: async (updates) => {
      const { user } = get()
      if (!user) return
      const updated = await userApi.updateUser(user.id, updates)
      set({ user: updated })
    },

    logout: () => set({ user: null }),
  }))
)

// 选择器组合（避免过多订阅）
export const useUserName = () => useUserStore(s => s.user?.name)
export const useIsAdmin = () => useUserStore(s => s.user?.role === 'admin')
```

## Pinia（Vue）

Vue 3 官方推荐的状态管理库，完美集成 DevTools。

```typescript
// 见 Vue 3 章节的详细示例
// stores/cart.ts
import { defineStore } from 'pinia'

export const useCartStore = defineStore('cart', () => {
  const items = ref<CartItem[]>([])

  const totalPrice = computed(() =>
    items.value.reduce((sum, item) => sum + item.price * item.quantity, 0)
  )

  const totalCount = computed(() =>
    items.value.reduce((sum, item) => sum + item.quantity, 0)
  )

  function addItem(product: Product) {
    const existing = items.value.find(i => i.id === product.id)
    if (existing) {
      existing.quantity++
    } else {
      items.value.push({ ...product, quantity: 1 })
    }
  }

  function removeItem(id: number) {
    items.value = items.value.filter(i => i.id !== id)
  }

  function clear() {
    items.value = []
  }

  return { items, totalPrice, totalCount, addItem, removeItem, clear }
}, {
  persist: true  // pinia-plugin-persistedstate
})
```

## Jotai（React 原子化）

基于原子（Atom）的状态管理，适合细粒度状态。

```typescript
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

// 基础原子
const countAtom = atom(0)
const nameAtom = atom('Alice')

// 派生原子（只读）
const doubleCountAtom = atom(get => get(countAtom) * 2)

// 可写派生原子
const countWithLogAtom = atom(
  get => get(countAtom),
  (get, set, update: number) => {
    console.log('count 变为', update)
    set(countAtom, update)
  }
)

// 持久化原子
const themeAtom = atomWithStorage<'light' | 'dark'>('theme', 'light')

// 异步原子
const userAtom = atom(async () => {
  const res = await fetch('/api/user')
  return res.json() as Promise<User>
})

// 组件使用
function Counter() {
  const [count, setCount] = useAtom(countAtom)
  const double = useAtomValue(doubleCountAtom)
  const setName = useSetAtom(nameAtom) // 只需要 setter，不订阅 name

  return (
    <div>
      <p>{count} × 2 = {double}</p>
      <button onClick={() => setCount(c => c + 1)}>+1</button>
    </div>
  )
}
```

## Signals（跨框架趋势）

Signals 是一种基于细粒度响应式的状态原语，是 2023-2024 年的重要趋势：

```typescript
// @preact/signals-react
import { signal, computed, effect } from '@preact/signals-react'

// 全局信号（无需 Provider）
const count = signal(0)
const doubled = computed(() => count.value * 2)

// 副作用
effect(() => {
  document.title = `Count: ${count.value}`
})

// 组件直接使用（精确更新，只有用到信号的 DOM 更新）
function Counter() {
  return (
    <div>
      <p>{count} × 2 = {doubled}</p>
      <button onClick={() => count.value++}>+1</button>
    </div>
  )
}

// 不需要 useSelector、memo、useCallback——信号天然精确
```

## TanStack Query（服务端状态）

管理**异步数据获取、缓存、同步**，解决大部分"全局状态"问题。

```typescript
// React Query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// 数据查询
function UserProfile({ userId }: { userId: number }) {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user', userId],   // 缓存键
    queryFn: () => fetchUser(userId),
    staleTime: 5 * 60 * 1000,    // 5分钟内认为数据新鲜
    gcTime: 10 * 60 * 1000,      // 10分钟后清除缓存
  })

  if (isLoading) return <Skeleton />
  if (error) return <Error message={error.message} />
  return <div>{user.name}</div>
}

// 数据变更
function UpdateProfile() {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: updateUser,
    onSuccess: (updatedUser) => {
      // 直接更新缓存，无需重新请求
      queryClient.setQueryData(['user', updatedUser.id], updatedUser)
    },
  })

  return (
    <button onClick={() => mutation.mutate({ name: '新名字' })}>
      {mutation.isPending ? '保存中...' : '保存'}
    </button>
  )
}
```

## 延伸阅读

- [Zustand 文档](https://zustand.docs.pmnd.rs/)
- [Pinia 文档](https://pinia.vuejs.org/)
- [TanStack Query 文档](https://tanstack.com/query)
- [Jotai 文档](https://jotai.org/)
- [Signals 提案（TC39）](https://github.com/tc39/proposal-signals)
