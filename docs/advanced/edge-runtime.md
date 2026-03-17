# Edge Runtime

> 把计算推向离用户最近的节点，延迟从 100ms 降到 10ms。Edge Runtime 正在重塑全栈架构。

## 什么是 Edge Runtime

传统部署：用户 → CDN（静态资源）→ 源站服务器（动态计算，单地区）

Edge 部署：用户 → Edge Node（动态计算，全球 300+ 节点，离用户最近）

```
传统 SSR 请求链路（典型）：
用户（上海）→ CDN → 源站（美国西部）= 200ms+

Edge Runtime 请求链路：
用户（上海）→ Edge Node（上海/香港）= 20ms 以内
```

## 主流 Edge 平台

| 平台 | 底层技术 | 集成框架 |
|------|---------|---------|
| Cloudflare Workers | V8 isolates | Next.js, Remix, Hono |
| Vercel Edge Functions | V8 isolates | Next.js, SvelteKit |
| Deno Deploy | Deno runtime | Fresh |
| Netlify Edge Functions | Deno runtime | Next.js, Astro |

**Edge Runtime 的限制（与 Node.js 的区别）：**
- ❌ 不支持 Node.js 内置模块（`fs`, `path`, `crypto` 等 Node 特有 API）
- ❌ 不能运行长时任务（超时限制，通常 30 秒以内）
- ✅ Web 标准 API（`fetch`, `Request`, `Response`, `crypto`）
- ✅ 冷启动极快（微秒级，vs Node.js 的数百毫秒）

## Next.js Edge Runtime

```typescript
// app/api/hello/route.ts
export const runtime = 'edge'  // 声明使用 Edge Runtime

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const name = searchParams.get('name') ?? 'World'

  return Response.json({
    message: `Hello, ${name}!`,
    region: process.env.VERCEL_REGION,  // 当前 Edge 节点地区
  })
}
```

### 中间件（Middleware）

Next.js Middleware 默认运行在 Edge Runtime，在请求到达页面前拦截处理：

```typescript
// middleware.ts（项目根目录）
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. 认证守卫
  const token = request.cookies.get('token')?.value
  if (pathname.startsWith('/dashboard') && !token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 2. 地区重定向
  const country = request.geo?.country ?? 'US'
  if (pathname === '/' && country === 'CN') {
    return NextResponse.redirect(new URL('/zh', request.url))
  }

  // 3. A/B 测试（灰度发布）
  const bucket = request.cookies.get('ab-bucket')?.value
  if (!bucket) {
    const response = NextResponse.next()
    const newBucket = Math.random() < 0.5 ? 'a' : 'b'
    response.cookies.set('ab-bucket', newBucket)
    return response
  }

  // 4. 添加安全响应头
  const response = NextResponse.next()
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')

  return response
}

// 配置哪些路径经过 Middleware
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
```

## Cloudflare Workers

```typescript
// worker.ts
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)

    // 路由
    if (url.pathname === '/api/users') {
      return handleUsers(request, env)
    }

    if (url.pathname.startsWith('/api/')) {
      return new Response('Not Found', { status: 404 })
    }

    // 从 KV 读取静态内容
    const asset = await env.ASSETS.fetch(request)
    return asset
  },
}

async function handleUsers(request: Request, env: Env) {
  // 使用 Cloudflare KV 存储
  const users = await env.USERS_KV.get('users', 'json')

  // 使用 Cloudflare D1（SQLite at Edge）
  const stmt = env.DB.prepare('SELECT * FROM users LIMIT 10')
  const { results } = await stmt.all()

  return Response.json(results)
}

// wrangler.toml
// name = "my-worker"
// main = "src/worker.ts"
// compatibility_date = "2024-01-01"
//
// [[kv_namespaces]]
// binding = "USERS_KV"
// id = "xxxx"
//
// [[d1_databases]]
// binding = "DB"
// database_id = "xxxx"
```

## Hono（Edge 原生框架）

专为 Edge Runtime 设计的轻量 Web 框架，运行在所有 Edge 平台：

```typescript
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { jwt } from 'hono/jwt'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

const app = new Hono<{ Bindings: Env }>()

// 中间件
app.use('/api/*', cors())
app.use('/api/protected/*', jwt({ secret: 'secret' }))

// 路由
app.get('/api/users', async c => {
  const { results } = await c.env.DB.prepare('SELECT * FROM users').all()
  return c.json(results)
})

app.post(
  '/api/users',
  zValidator('json', z.object({
    name: z.string().min(1),
    email: z.string().email(),
  })),
  async c => {
    const { name, email } = c.req.valid('json')
    await c.env.DB.prepare('INSERT INTO users (name, email) VALUES (?, ?)')
      .bind(name, email)
      .run()
    return c.json({ success: true }, 201)
  }
)

export default app

// 同一套代码，部署到不同平台：
// Cloudflare Workers: wrangler deploy
// Vercel: vercel deploy
// Deno Deploy: deployctl deploy
// Node.js: node server.js（开发时）
```

## Edge 数据库

```typescript
// Cloudflare D1（SQLite）
const { results } = await env.DB
  .prepare('SELECT * FROM users WHERE id = ?')
  .bind(userId)
  .all()

// Turso（分布式 libSQL，全球复制）
import { createClient } from '@libsql/client/http'

const db = createClient({
  url: 'https://mydb-org.turso.io',
  authToken: process.env.TURSO_TOKEN,
})

const result = await db.execute({
  sql: 'SELECT * FROM users WHERE id = ?',
  args: [userId],
})

// Upstash Redis（Serverless Redis，HTTP API）
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_URL,
  token: process.env.UPSTASH_TOKEN,
})

await redis.set('user:1', JSON.stringify(user), { ex: 3600 })
const cached = await redis.get<User>('user:1')
```

## 什么时候用 Edge Runtime

```
✅ 适合 Edge 的场景：
- 认证/权限检查（Middleware）
- 地理位置路由和个性化
- A/B 测试
- 请求改写和代理
- 轻量 API（CRUD、缓存读取）
- 实时数据（WebSocket via Durable Objects）

❌ 不适合 Edge 的场景：
- CPU 密集型计算（编解码、加解密）
- 需要 Node.js 生态（使用特定 npm 包）
- 长时任务（视频处理、大文件操作）
- 需要文件系统访问
```

## 延伸阅读

- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Vercel Edge Functions 文档](https://vercel.com/docs/functions/edge-functions)
- [Hono 文档](https://hono.dev/)
- [Next.js Edge Runtime 文档](https://nextjs.org/docs/app/api-reference/edge)
