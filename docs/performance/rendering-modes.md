# 渲染模式

> CSR、SSR、SSG、ISR、Streaming——不是哪个最好，而是哪个最适合你的场景。

## 渲染模式全景

```
                    数据获取位置
                    ─────────────────
服务端渲染          │ SSR  │  SSG  │
                    │ ISR  │  RSC  │
                    ─────────────────
客户端渲染          │ CSR  │  SPA  │
                    ─────────────────
混合               │ Islands Architecture │
                    │ Partial Hydration    │
```

## CSR（客户端渲染）

浏览器下载空 HTML，JS 执行后渲染内容。

```
Browser → Server: GET /
Server → Browser: <html><body><div id="root"></div><script src="app.js"></script></body></html>

Browser: 下载并执行 app.js
Browser: React/Vue 渲染组件树 → DOM
Browser → API: GET /api/data
API → Browser: JSON 数据
Browser: 更新 UI
```

**适合场景：**
- 管理后台、内部工具（不需要 SEO）
- 高度交互的 Web App（SaaS 产品）
- 登录后的个性化页面

**优点：**
- 服务器压力小，静态托管成本低
- 路由切换快（无页面刷新）

**缺点：**
- 首屏白屏时间长
- SEO 不友好（爬虫看到空 HTML）
- LCP 指标差

## SSR（服务端渲染）

服务器生成完整 HTML，发送给浏览器，然后在客户端注水（Hydration）。

```
Browser → Server: GET /products/123
Server: 获取数据 + 渲染 React 组件 → HTML
Server → Browser: <html>...完整内容...</html>

Browser: 显示 HTML（快！）
Browser: 下载 JS → Hydration（绑定事件）
```

```typescript
// Next.js App Router（默认 SSR）
// app/products/[id]/page.tsx
interface Props {
  params: { id: string }
}

export default async function ProductPage({ params }: Props) {
  // 在服务器端获取数据
  const product = await fetch(`/api/products/${params.id}`).then(r => r.json())

  return (
    <div>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <AddToCartButton productId={product.id} /> {/* 客户端组件 */}
    </div>
  )
}
```

**适合场景：**
- 需要 SEO 的内容页（电商、博客、新闻）
- 首屏性能要求高
- 数据随请求变化（个性化、实时数据）

**缺点：**
- 服务器成本高
- TTFB 较高（服务器需要先获取数据）
- Hydration 开销（客户端需要重新创建事件监听）

## SSG（静态站点生成）

构建时预渲染所有页面，生成静态 HTML 文件。

```
构建时：
  - 获取所有数据
  - 渲染所有路由 → HTML 文件
  - 上传到 CDN

运行时：
Browser → CDN: GET /blog/my-post
CDN → Browser: 预生成的 HTML（极快！）
```

```typescript
// Next.js：generateStaticParams 指定静态路由
export async function generateStaticParams() {
  const posts = await getPosts()
  return posts.map(post => ({ slug: post.slug }))
}

export default async function BlogPost({ params }) {
  const post = await getPost(params.slug)
  return <article>{post.content}</article>
}
```

**适合场景：**
- 博客、文档站、营销页面
- 内容不频繁变化
- 极致性能需求（CDN 直出）

**缺点：**
- 数据过时（构建时快照）
- 大量页面时构建时间长

## ISR（增量静态再生）

SSG 的升级版：静态页面 + 按需重新生成。

```typescript
// Next.js ISR
export const revalidate = 60 // 每 60 秒重新生成一次

export default async function ProductPage({ params }) {
  const product = await getProduct(params.id)
  return <ProductDetail product={product} />
}

// 按需重新验证（数据更新时主动触发）
// app/api/revalidate/route.ts
import { revalidatePath } from 'next/cache'

export async function POST(request: Request) {
  const { path, secret } = await request.json()
  if (secret !== process.env.REVALIDATE_SECRET) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  revalidatePath(path)
  return Response.json({ revalidated: true })
}
```

**适合场景：**
- 商品详情页（高流量 + 需要新鲜数据）
- 新闻、博客（发布后即时更新）
- 数据量大但变化频率中等的场景

## Streaming SSR

将 SSR 从"一次性渲染"变成"流式输出"，提升 TTFB 和感知性能。

```typescript
// Next.js App Router 原生支持 Streaming
// app/page.tsx

import { Suspense } from 'react'

// 慢组件（需要等待数据）
async function SlowComponent() {
  const data = await slowFetch() // 慢接口
  return <DataDisplay data={data} />
}

export default function Page() {
  return (
    <div>
      {/* 快速内容立即显示 */}
      <Header />
      <HeroSection />

      {/* 慢内容显示骨架屏，数据准备好后流式替换 */}
      <Suspense fallback={<Skeleton />}>
        <SlowComponent />
      </Suspense>

      <Suspense fallback={<Skeleton />}>
        <AnotherSlowComponent />
      </Suspense>
    </div>
  )
}
```

```
时间线：
0ms    → Server 开始发送 HTML
10ms   → Header、Hero 内容到达浏览器并渲染
200ms  → SlowComponent 数据准备好，流式发送并替换骨架屏
800ms  → AnotherSlowComponent 数据准备好，替换骨架屏
```

## Islands Architecture

仅对需要交互的"岛屿"进行 Hydration，静态部分保持纯 HTML。

```
┌─────────────────────────────────────────┐
│  静态 Header（纯 HTML，零 JS）          │
├─────────────────────────────────────────┤
│  静态文章内容（纯 HTML）                │
│                                         │
│  ┌───────────────┐  ┌────────────────┐  │
│  │ 🏝 交互组件   │  │ 🏝 搜索框      │  │
│  │ (Hydrated)   │  │ (Hydrated)    │  │
│  └───────────────┘  └────────────────┘  │
│                                         │
│  静态 Footer（纯 HTML，零 JS）          │
└─────────────────────────────────────────┘
```

代表框架：**Astro**（`client:load`、`client:idle`、`client:visible`）

```astro
---
// Astro 组件
import ReactCounter from './Counter.jsx'
import VueSearch from './Search.vue'
---

<html>
  <body>
    <!-- 静态内容：零 JS -->
    <article>静态文章内容</article>

    <!-- 立即 Hydrate -->
    <ReactCounter client:load />

    <!-- 浏览器空闲时 Hydrate -->
    <VueSearch client:idle />

    <!-- 进入视口时 Hydrate -->
    <HeavyComponent client:visible />
  </body>
</html>
```

## 选型决策树

```
你的页面需要 SEO 或首屏快？
  否 → CSR（SPA）
  是 ↓

数据是否实时变化？
  否（内容相对静态）→ SSG 或 ISR
  是 ↓

数据是否高度个性化（依赖用户 session）？
  是 → SSR（不可缓存）
  否 → SSR（可 CDN 缓存）或 ISR

页面交互是否复杂？
  是 → Next.js / Remix（混合渲染）
  否（内容为主）→ Astro（Islands）
```

## 延伸阅读

- [Patterns.dev - 渲染模式](https://www.patterns.dev/react/rendering-patterns)
- [Next.js 文档](https://nextjs.org/docs)
- [Astro 文档](https://docs.astro.build/)
- [web.dev - SSR 与 CSR](https://web.dev/rendering-on-the-web/)
