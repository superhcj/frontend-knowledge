# REST / GraphQL / tRPC

> API 设计范式的演进：从 REST 的资源导向，到 GraphQL 的灵活查询，再到 tRPC 的全栈类型安全。

## REST

表述性状态转移，以**资源**为中心，用 HTTP 方法表达操作。

### RESTful 设计原则

```
资源使用名词，不用动词
/users          ✅   /getUsers      ❌
/users/1        ✅   /getUserById   ❌
/users/1/posts  ✅   /getUserPosts  ❌

HTTP 方法语义化
GET    /users         获取列表
GET    /users/1       获取单个
POST   /users         创建
PUT    /users/1       完整替换
PATCH  /users/1       部分更新
DELETE /users/1       删除

状态码语义化（见网络/HTTP 章节）
```

### 请求/响应示例

```http
# 创建用户
POST /api/v1/users
Content-Type: application/json
Authorization: Bearer eyJhb...

{
  "name": "张三",
  "email": "zhangsan@example.com",
  "role": "user"
}

# 响应
HTTP/2 201 Created
Location: /api/v1/users/123

{
  "id": 123,
  "name": "张三",
  "email": "zhangsan@example.com",
  "role": "user",
  "createdAt": "2026-03-17T10:00:00Z"
}
```

### 分页、过滤、排序

```http
# 分页
GET /api/users?page=2&pageSize=20

# 过滤
GET /api/users?role=admin&status=active

# 排序
GET /api/users?sort=createdAt&order=desc

# 字段选择（减少传输量）
GET /api/users?fields=id,name,email

# 响应中包含分页信息
{
  "data": [...],
  "pagination": {
    "page": 2,
    "pageSize": 20,
    "total": 145,
    "totalPages": 8
  }
}
```

### REST 的问题

```
过度获取（Over-fetching）：
  GET /users/1 → 返回所有字段，但我只需要 name

获取不足（Under-fetching）：
  GET /users/1       → 获取用户
  GET /users/1/posts → 获取文章（N+1 问题）
  GET /users/1/followers → 获取关注者
  需要 3 次请求
```

## GraphQL

用查询语言精确描述所需数据，一次请求获取所有需要的字段。

### 基本查询

```graphql
# 查询（精确获取所需字段）
query GetUser($id: ID!) {
  user(id: $id) {
    id
    name
    email
    posts(first: 5) {    # 关联数据，一次请求搞定
      title
      createdAt
    }
    followers {
      count
    }
  }
}

# 变量
{
  "id": "123"
}
```

### Mutation（数据变更）

```graphql
mutation CreatePost($input: CreatePostInput!) {
  createPost(input: $input) {
    id
    title
    slug
    createdAt
  }
}

# 变量
{
  "input": {
    "title": "Hello World",
    "content": "...",
    "tags": ["javascript", "react"]
  }
}
```

### Subscription（实时订阅）

```graphql
subscription OnNewMessage($chatId: ID!) {
  messageSent(chatId: $chatId) {
    id
    content
    sender { name avatar }
    createdAt
  }
}
```

### 客户端：Apollo Client

```typescript
import { ApolloClient, InMemoryCache, gql, useQuery } from '@apollo/client'

const client = new ApolloClient({
  uri: '/graphql',
  cache: new InMemoryCache(),
  headers: { Authorization: `Bearer ${token}` },
})

// React Hook 使用
const GET_USER = gql`
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      name
      posts { title }
    }
  }
`

function UserProfile({ userId }: { userId: string }) {
  const { loading, error, data } = useQuery(GET_USER, {
    variables: { id: userId },
  })

  if (loading) return <Skeleton />
  if (error) return <Error message={error.message} />
  return <div>{data.user.name}</div>
}
```

## tRPC

全栈 TypeScript 方案：**端到端类型安全**，无需写 API 文档，无需代码生成。

### 服务端定义

```typescript
// server/router.ts
import { initTRPC, TRPCError } from '@trpc/server'
import { z } from 'zod'

const t = initTRPC.context<Context>().create()

export const router = t.router
export const publicProcedure = t.procedure
export const protectedProcedure = t.procedure.use(authMiddleware)

export const appRouter = router({
  user: router({
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const user = await ctx.db.user.findUnique({ where: { id: input.id } })
        if (!user) throw new TRPCError({ code: 'NOT_FOUND' })
        return user
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1).max(100),
        email: z.string().email(),
      }))
      .mutation(async ({ input, ctx }) => {
        return ctx.db.user.create({ data: input })
      }),

    list: publicProcedure
      .input(z.object({
        page: z.number().default(1),
        pageSize: z.number().max(100).default(20),
      }))
      .query(async ({ input, ctx }) => {
        const [items, total] = await Promise.all([
          ctx.db.user.findMany({
            skip: (input.page - 1) * input.pageSize,
            take: input.pageSize,
          }),
          ctx.db.user.count(),
        ])
        return { items, total, page: input.page }
      }),
  }),
})

export type AppRouter = typeof appRouter
```

### 客户端使用

```typescript
// client/trpc.ts
import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '../server/router'

export const trpc = createTRPCReact<AppRouter>()

// 组件中使用（完整的类型推断！）
function UserProfile({ userId }: { userId: number }) {
  // data 的类型自动推断为 User
  const { data: user, isLoading } = trpc.user.getById.useQuery({ id: userId })

  const createUser = trpc.user.create.useMutation({
    onSuccess: () => utils.user.list.invalidate(),
  })

  if (isLoading) return <Skeleton />

  return (
    <div>
      {/* user.name 有完整的类型补全 */}
      <h1>{user?.name}</h1>
      <button
        onClick={() => createUser.mutate({ name: '新用户', email: 'new@example.com' })}
      >
        创建用户
      </button>
    </div>
  )
}
```

## 选型对比

| 维度 | REST | GraphQL | tRPC |
|------|------|---------|------|
| 学习成本 | 低 | 中 | 低（TypeScript 即文档）|
| 类型安全 | 手动/代码生成 | 代码生成 | 原生 |
| 灵活性 | 低 | 高 | 中 |
| 文件上传 | 原生支持 | 复杂 | 支持 |
| 缓存 | HTTP 缓存 | 需要 Apollo | HTTP 缓存 |
| 适合场景 | 公开 API、第三方 | 复杂数据关系 | 全栈 TypeScript 项目 |
| 客户端限制 | 无 | 无 | 仅 TypeScript |

## 延伸阅读

- [REST API 设计最佳实践](https://restfulapi.net/)
- [GraphQL 官方文档](https://graphql.org/learn/)
- [tRPC 文档](https://trpc.io/)
- [Zod 文档](https://zod.dev/) — tRPC 的验证层
