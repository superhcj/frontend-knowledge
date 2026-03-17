# Svelte & SolidJS

> Svelte 和 Solid 代表了框架设计的两条新思路：无虚拟 DOM、编译时优化、极致性能。

## Svelte

Svelte 不是运行时框架——它是**编译器**。组件在构建时被编译为原生 DOM 操作，运行时几乎没有框架代码。

### 基础语法

```svelte
<!-- Counter.svelte -->
<script lang="ts">
  let count = $state(0)           // Svelte 5: Runes 语法
  let doubled = $derived(count * 2)

  function increment() {
    count++
  }
</script>

<button onclick={increment}>
  点击了 {count} 次，doubled = {doubled}
</button>

<style>
  /* 样式自动作用域化，不会污染全局 */
  button {
    background: #ff3e00;
    color: white;
    border-radius: 8px;
    padding: 0.5rem 1rem;
  }
</style>
```

### Svelte 5 Runes（最新特性）

```svelte
<script lang="ts">
  // $state：响应式状态
  let count = $state(0)
  let user = $state({ name: 'Alice', age: 25 })

  // $derived：派生值（自动追踪依赖）
  let doubled = $derived(count * 2)
  let greeting = $derived(`Hello, ${user.name}!`)

  // $effect：副作用（类似 React useEffect，但自动追踪依赖）
  $effect(() => {
    document.title = `Count: ${count}`
    // 返回清理函数
    return () => { document.title = 'App' }
  })

  // $props：组件属性
  let { title, onClose } = $props<{
    title: string
    onClose: () => void
  }>()
</script>
```

### 双向绑定

```svelte
<script>
  let name = $state('')
  let selected = $state('option1')
  let checked = $state(false)
</script>

<!-- bind: 实现双向绑定 -->
<input bind:value={name} placeholder="输入名字">
<select bind:value={selected}>
  <option value="option1">选项 1</option>
  <option value="option2">选项 2</option>
</select>
<input type="checkbox" bind:checked={checked}>

<p>你好，{name}！选择了：{selected}</p>
```

### 控制流

```svelte
<!-- Svelte 5 使用新的 snippet 和 #if 语法 -->
{#if user}
  <p>欢迎，{user.name}</p>
{:else}
  <p>请登录</p>
{/if}

{#each items as item, index (item.id)}
  <li>{index + 1}. {item.name}</li>
{:else}
  <li>暂无数据</li>
{/each}

{#await fetchData()}
  <p>加载中...</p>
{:then data}
  <p>{data.message}</p>
{:catch error}
  <p>错误：{error.message}</p>
{/await}
```

### Store（全局状态）

```typescript
// stores/counter.ts
import { writable, derived, get } from 'svelte/store'

// writable：可读写
export const count = writable(0)

// derived：派生 store
export const doubled = derived(count, $count => $count * 2)

// 组件中使用
// Counter.svelte
<script>
  import { count, doubled } from './stores/counter'
</script>

<!-- $ 前缀自动订阅和取消订阅 -->
<p>{$count} × 2 = {$doubled}</p>
<button onclick={() => count.update(n => n + 1)}>+1</button>
```

### SvelteKit（全栈框架）

```typescript
// src/routes/users/[id]/+page.server.ts（服务端数据加载）
export async function load({ params, fetch }) {
  const user = await fetch(`/api/users/${params.id}`).then(r => r.json())
  return { user }  // 自动传给页面组件
}

// src/routes/users/[id]/+page.svelte
<script lang="ts">
  let { data } = $props()  // data.user 有完整类型推断
</script>

<h1>{data.user.name}</h1>
```

## SolidJS

Solid 保留了 JSX 和 Hooks 风格的 API，但底层完全不同——**真正的细粒度响应式**，没有虚拟 DOM。

### 核心响应式原语

```typescript
import { createSignal, createMemo, createEffect, onCleanup } from 'solid-js'

// createSignal：类似 React useState，但更新时只重新运行用到它的代码
const [count, setCount] = createSignal(0)
const [user, setUser] = createSignal<User | null>(null)

// 读取：调用函数
console.log(count())          // 不是 count，是 count()

// 更新
setCount(1)                   // 直接设置
setCount(prev => prev + 1)    // 函数形式

// createMemo：缓存的派生值（类似 useMemo，但自动追踪依赖）
const doubled = createMemo(() => count() * 2)
console.log(doubled())

// createEffect：副作用，自动追踪依赖
createEffect(() => {
  document.title = `Count: ${count()}`
  onCleanup(() => { document.title = 'App' })
})
```

### Solid 组件

```tsx
import { createSignal, For, Show, Suspense } from 'solid-js'

function Counter() {
  const [count, setCount] = createSignal(0)

  return (
    <button onClick={() => setCount(c => c + 1)}>
      {count()}
    </button>
  )
}

// 控制流组件（比 JSX 条件渲染更高效，避免不必要的重新创建）
function UserList({ users }) {
  return (
    <Show when={users().length > 0} fallback={<p>暂无用户</p>}>
      <For each={users()}>
        {(user, index) => (
          <div>
            {index() + 1}. {user.name}
          </div>
        )}
      </For>
    </Show>
  )
}
```

## 性能对比

| 框架 | 运行时大小 | 更新机制 | JS 执行速度 |
|------|-----------|---------|------------|
| React 18 | ~45KB | 虚拟 DOM + Fiber | 快 |
| Vue 3 | ~34KB | 虚拟 DOM + Proxy | 很快 |
| **Svelte** | **~2KB** | **编译为 DOM 操作** | **极快** |
| **SolidJS** | **~7KB** | **细粒度响应式** | **极快** |

## 选型建议

```
Svelte / SvelteKit：
  ✅ 追求极致性能（移动端、低端设备）
  ✅ 模板语法直观，入门容易
  ✅ 全栈需求（SvelteKit）
  ⚠️ 生态系统较小，招聘相对困难

SolidJS：
  ✅ 熟悉 React 但想要更好性能
  ✅ 细粒度更新场景（频繁局部更新）
  ⚠️ 社区比 Svelte 更小

Vue / React：
  ✅ 大型团队、成熟生态、丰富人才
```

## 延伸阅读

- [Svelte 官方文档](https://svelte.dev/)
- [SvelteKit 文档](https://kit.svelte.dev/)
- [SolidJS 文档](https://www.solidjs.com/)
- [JS Framework Benchmark](https://krausest.github.io/js-framework-benchmark/) — 框架性能横向对比
