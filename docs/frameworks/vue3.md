# Vue 3

> Vue 3 的 Composition API 不只是换了写法，它彻底改变了逻辑复用的方式。

## Composition API 核心

### setup() 与 `<script setup>`

```vue
<!-- 推荐：<script setup> 语法糖，更简洁 -->
<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// Props
const props = defineProps<{
  title: string
  count?: number
}>()

// Emits
const emit = defineEmits<{
  update: [value: number]
  close: []
}>()

// 响应式状态
const localCount = ref(props.count ?? 0)

// 计算属性
const doubled = computed(() => localCount.value * 2)

// 生命周期
onMounted(() => {
  console.log('组件已挂载')
})

// 方法
function increment() {
  localCount.value++
  emit('update', localCount.value)
}
</script>

<template>
  <div>
    <h2>{{ title }}</h2>
    <p>{{ localCount }} × 2 = {{ doubled }}</p>
    <button @click="increment">+1</button>
  </div>
</template>
```

### ref vs reactive

```typescript
import { ref, reactive, toRefs } from 'vue'

// ref：任意类型，通过 .value 访问
const count = ref(0)
const name = ref('Alice')
const user = ref<User | null>(null)
count.value++                    // JS 中需要 .value
// 模板中自动解包，不需要 .value

// reactive：对象专用，直接访问属性
const state = reactive({
  count: 0,
  name: 'Alice',
  items: [] as string[],
})
state.count++                    // 直接访问，无需 .value

// ⚠️ reactive 的解构陷阱：解构后失去响应性
const { count } = state          // ❌ count 不再响应
const { count } = toRefs(state)  // ✅ 转成 ref，保持响应性

// 推荐：统一用 ref（Vue 3.5+ 的 Reactivity Transform 进一步简化）
```

### watch & watchEffect

```typescript
import { watch, watchEffect, ref } from 'vue'

const userId = ref(1)
const user = ref<User | null>(null)

// watch：明确指定监听源
watch(userId, async (newId, oldId) => {
  user.value = await fetchUser(newId)
}, {
  immediate: true,   // 立即执行一次
  deep: true,        // 深度监听
})

// 监听多个源
watch([userId, pageSize], ([newId, newSize]) => {
  fetchData(newId, newSize)
})

// watchEffect：自动追踪依赖（类似 React 的 useEffect 但自动）
watchEffect(async (onCleanup) => {
  const controller = new AbortController()
  onCleanup(() => controller.abort())

  // 自动追踪：userId.value 变化时自动重新执行
  user.value = await fetchUser(userId.value, { signal: controller.signal })
})
```

## 组合式函数（Composables）

Vue 3 的逻辑复用方案，替代 Vue 2 的 Mixins。

```typescript
// composables/useAsync.ts
import { ref, type Ref } from 'vue'

export function useAsync<T>(fn: () => Promise<T>) {
  const data = ref<T | null>(null) as Ref<T | null>
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function execute() {
    loading.value = true
    error.value = null
    try {
      data.value = await fn()
    } catch (e) {
      error.value = e instanceof Error ? e : new Error(String(e))
    } finally {
      loading.value = false
    }
  }

  return { data, loading, error, execute }
}

// composables/useFetch.ts
export function useFetch<T>(url: MaybeRef<string>) {
  const { data, loading, error, execute } = useAsync<T>(
    () => fetch(toValue(url)).then(r => r.json())
  )

  // URL 变化时自动重新请求
  watchEffect(() => {
    toValue(url) // 触发追踪
    execute()
  })

  return { data, loading, error, refresh: execute }
}

// 使用
const { data: user, loading } = useFetch<User>(`/api/users/${userId.value}`)
```

## 响应式原理

Vue 3 使用 **Proxy** 实现响应式（替代 Vue 2 的 Object.defineProperty）：

```javascript
// 简化版响应式原理
function reactive(target) {
  return new Proxy(target, {
    get(target, key, receiver) {
      track(target, key)              // 收集依赖
      return Reflect.get(target, key, receiver)
    },
    set(target, key, value, receiver) {
      const result = Reflect.set(target, key, value, receiver)
      trigger(target, key)            // 触发更新
      return result
    },
  })
}
```

**Proxy vs defineProperty 的优势：**
- 可以拦截数组索引赋值、`length` 变化
- 可以拦截新增/删除属性（Vue 2 需要 `Vue.set`）
- 支持 Map、Set 等数据结构

## 模板编译优化

Vue 3 编译器会对模板做**静态提升（Static Hoisting）**和**补丁标志（Patch Flags）**优化：

```vue
<template>
  <!-- 静态节点：编译后提升到 render 函数外，不参与 diff -->
  <h1>不变的标题</h1>

  <!-- 动态节点：Patch Flag 标记只有文本变化，跳过属性 diff -->
  <p>{{ dynamicText }}</p>

  <!-- v-memo：手动记忆化子树 -->
  <div v-memo="[item.id, item.selected]">
    <ExpensiveComponent :data="item" />
  </div>
</template>
```

## 状态管理：Pinia

```typescript
// stores/user.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserStore = defineStore('user', () => {
  // State
  const user = ref<User | null>(null)
  const token = ref<string | null>(localStorage.getItem('token'))

  // Getters
  const isLoggedIn = computed(() => !!token.value)
  const displayName = computed(() => user.value?.name ?? '游客')

  // Actions
  async function login(credentials: LoginCredentials) {
    const { user: userData, token: newToken } = await authApi.login(credentials)
    user.value = userData
    token.value = newToken
    localStorage.setItem('token', newToken)
  }

  function logout() {
    user.value = null
    token.value = null
    localStorage.removeItem('token')
  }

  return { user, token, isLoggedIn, displayName, login, logout }
})

// 组件中使用
const userStore = useUserStore()
const { isLoggedIn, displayName } = storeToRefs(userStore) // 保持响应性
await userStore.login({ email, password })
```

## 延伸阅读

- [Vue 3 官方文档](https://cn.vuejs.org/)
- [Pinia 文档](https://pinia.vuejs.org/zh/)
- [VueUse - 组合式工具库](https://vueuse.org/)
- [Vue 3 迁移指南](https://v3-migration.vuejs.org/zh/)
