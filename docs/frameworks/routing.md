# 客户端路由

> 路由是单页应用的骨架，决定了 URL 如何映射到界面。

## 路由模式

### Hash 路由 vs History 路由

```
Hash 路由：
  URL：https://example.com/#/users/1
  原理：浏览器不发送 # 后的内容到服务器
  优点：无需服务端配置
  缺点：URL 不美观，SEO 不友好

History 路由（推荐）：
  URL：https://example.com/users/1
  原理：使用 History API（pushState / replaceState）
  优点：URL 美观，支持 SSR
  缺点：服务端需要配置 fallback（所有路由返回 index.html）
```

```nginx
# Nginx 配置 History 路由 fallback
location / {
  try_files $uri $uri/ /index.html;
}
```

## React Router v7

```typescript
// 使用 createBrowserRouter（推荐，支持 Data API）
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    errorElement: <ErrorPage />,   // 错误边界
    children: [
      {
        index: true,               // 默认子路由
        element: <Home />,
      },
      {
        path: 'users',
        element: <Users />,
        // 数据加载（在路由层面，不在组件层面）
        loader: async () => {
          return fetch('/api/users').then(r => r.json())
        },
      },
      {
        path: 'users/:id',
        element: <UserDetail />,
        loader: async ({ params }) => {
          return fetch(`/api/users/${params.id}`).then(r => r.json())
        },
        action: async ({ request, params }) => {
          // 处理表单提交
          const formData = await request.formData()
          await updateUser(params.id, Object.fromEntries(formData))
          return redirect('/users')
        },
      },
      {
        path: 'settings/*',
        element: <Settings />,     // 嵌套子路由
        children: [
          { path: 'profile', element: <Profile /> },
          { path: 'security', element: <Security /> },
        ],
      },
    ],
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '*',
    element: <NotFound />,         // 404 页面
  },
])

function App() {
  return <RouterProvider router={router} />
}
```

### 组件中使用路由

```typescript
import {
  useNavigate,
  useParams,
  useSearchParams,
  useLocation,
  useLoaderData,
  Link,
  NavLink,
} from 'react-router-dom'

function UserDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useLoaderData() as User  // 来自 loader

  // 编程式导航
  function goBack() { navigate(-1) }
  function goToEdit() { navigate(`/users/${id}/edit`, { state: { user } }) }

  return (
    <div>
      <h1>{user.name}</h1>
      <button onClick={goBack}>返回</button>
      <button onClick={goToEdit}>编辑</button>
    </div>
  )
}

// 导航链接（自动添加 active 样式）
function Nav() {
  return (
    <nav>
      <NavLink
        to="/users"
        className={({ isActive }) => isActive ? 'active' : ''}
      >
        用户
      </NavLink>
    </nav>
  )
}

// 查询参数
function UserList() {
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Number(searchParams.get('page') ?? 1)

  return (
    <button onClick={() => setSearchParams({ page: String(page + 1) })}>
      下一页
    </button>
  )
}
```

### 路由守卫（鉴权）

```typescript
// 保护路由的高阶组件
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  const location = useLocation()

  if (!user) {
    // 重定向到登录页，记录来源
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

// 使用
{
  path: 'admin',
  element: (
    <RequireAuth>
      <AdminDashboard />
    </RequireAuth>
  ),
}

// 登录成功后跳回原页面
function Login() {
  const location = useLocation()
  const from = (location.state as any)?.from?.pathname ?? '/'
  const navigate = useNavigate()

  async function handleLogin(data) {
    await login(data)
    navigate(from, { replace: true })
  }
}
```

## Vue Router 4

```typescript
// router/index.ts
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('@/layouts/DefaultLayout.vue'),
      children: [
        { path: '', component: () => import('@/pages/Home.vue') },
        {
          path: 'users/:id',
          component: () => import('@/pages/UserDetail.vue'),
          props: true,             // 将 params 作为 props 传入组件
          meta: { requiresAuth: true },
        },
      ],
    },
    { path: '/login', component: () => import('@/pages/Login.vue') },
    { path: '/:pathMatch(.*)*', component: () => import('@/pages/NotFound.vue') },
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    return { top: 0, behavior: 'smooth' }
  },
})

// 全局导航守卫
router.beforeEach((to, from, next) => {
  const { user } = useUserStore()

  if (to.meta.requiresAuth && !user) {
    next({ path: '/login', query: { redirect: to.fullPath } })
  } else {
    next()
  }
})

export default router
```

```vue
<!-- 组件中使用 -->
<script setup>
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

// 读取参数
const userId = computed(() => route.params.id)
const page = computed(() => Number(route.query.page ?? 1))

// 编程式导航
function goToUser(id: number) {
  router.push({ name: 'user-detail', params: { id } })
}
</script>

<template>
  <!-- 声明式导航 -->
  <RouterLink :to="{ name: 'home' }">首页</RouterLink>
  <RouterView />   <!-- 路由出口 -->
</template>
```

## TanStack Router（新兴选项）

完全类型安全的路由，路由参数和搜索参数都有类型推断：

```typescript
import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router'

const rootRoute = createRootRoute({
  component: RootLayout,
})

const usersRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/users',
  validateSearch: (search: Record<string, unknown>) => ({
    page: Number(search.page ?? 1),
    filter: (search.filter as string) ?? '',
  }),
  component: UsersPage,
})

// 类型安全的 Link
<Link to="/users" search={{ page: 2, filter: 'admin' }}>
  用户列表
</Link>
// 自动补全 search 参数，错误类型编译报错
```

## 延伸阅读

- [React Router v7 文档](https://reactrouter.com/)
- [Vue Router 4 文档](https://router.vuejs.org/zh/)
- [TanStack Router 文档](https://tanstack.com/router)
