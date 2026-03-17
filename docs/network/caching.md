# 缓存策略

> 缓存是性能优化的最大杠杆——正确的缓存可以让页面加载速度提升 10 倍。

## HTTP 缓存

### 强缓存

浏览器直接使用本地缓存，**不发送请求**到服务器。

```http
# Cache-Control（优先级高于 Expires）
Cache-Control: max-age=31536000, immutable
# max-age=31536000：缓存 1 年
# immutable：告诉浏览器资源不会改变，不用发条件请求

Cache-Control: no-store          # 完全不缓存（敏感数据）
Cache-Control: no-cache          # 每次使用前必须验证（协商缓存）
Cache-Control: private           # 只允许浏览器缓存（不能 CDN 缓存）
Cache-Control: public            # 允许代理/CDN 缓存
Cache-Control: max-age=0, must-revalidate  # 过期必须重新验证
```

### 协商缓存

浏览器发送请求询问资源是否更新，服务器返回 **304** 表示"用缓存"。

```http
# 方式 1：ETag（推荐，基于内容哈希）
# 服务端响应：
ETag: "abc123def456"

# 浏览器下次请求：
If-None-Match: "abc123def456"

# 资源未变化时服务端返回：
HTTP/2 304 Not Modified

# 方式 2：Last-Modified（基于时间，精度 1 秒）
# 服务端响应：
Last-Modified: Tue, 17 Mar 2026 10:00:00 GMT

# 浏览器下次请求：
If-Modified-Since: Tue, 17 Mar 2026 10:00:00 GMT
```

### 缓存策略最佳实践

```
资源类型               缓存策略
─────────────────────────────────────────────────
HTML 入口文件         no-cache（每次验证）
JS/CSS（带 hash）     max-age=31536000, immutable
图片/字体（带 hash）  max-age=31536000, immutable
API 响应（动态数据）  no-store 或 no-cache
```

**关键：内容 hash 文件名**

```
app.abc123.js    ← 内容变 → app.xyz789.js（新文件名）
# HTML 始终 no-cache，更新后引用新 hash 文件
# 旧 JS 永久缓存，新 JS 立即生效
```

```javascript
// Vite 生产构建默认输出带 hash 的文件名
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      },
    },
  },
})
```

### Nginx 缓存配置

```nginx
server {
  # HTML：不缓存
  location ~* \.html$ {
    add_header Cache-Control "no-cache, no-store, must-revalidate";
  }

  # 带 hash 的静态资源：永久缓存
  location ~* \.(js|css|woff2|webp|avif)$ {
    add_header Cache-Control "public, max-age=31536000, immutable";
  }

  # 图片：缓存 30 天
  location ~* \.(jpg|jpeg|png|gif|ico|svg)$ {
    add_header Cache-Control "public, max-age=2592000";
  }
}
```

## Service Worker 缓存

Service Worker 拦截网络请求，实现离线缓存和精细控制。

```javascript
// public/sw.js

const CACHE_NAME = 'v1'
const STATIC_ASSETS = [
  '/',
  '/assets/main.abc123.js',
  '/assets/style.xyz789.css',
]

// 安装：预缓存静态资源
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  )
  self.skipWaiting()
})

// 激活：清除旧缓存
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

// 拦截请求
self.addEventListener('fetch', event => {
  const { request } = event
  const url = new URL(request.url)

  // API 请求：网络优先，失败时用缓存
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request))
    return
  }

  // 静态资源：缓存优先
  event.respondWith(cacheFirst(request))
})

// 缓存优先策略
async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  const response = await fetch(request)
  const cache = await caches.open(CACHE_NAME)
  cache.put(request, response.clone())
  return response
}

// 网络优先策略
async function networkFirst(request) {
  try {
    const response = await fetch(request)
    const cache = await caches.open(CACHE_NAME)
    cache.put(request, response.clone())
    return response
  } catch {
    return caches.match(request)
  }
}
```

```javascript
// 注册 Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg => console.log('SW registered:', reg.scope))
      .catch(err => console.error('SW failed:', err))
  })
}
```

## 内存缓存（前端）

```typescript
// 简单的内存缓存（带 TTL）
class MemoryCache<T> {
  private cache = new Map<string, { value: T; expiresAt: number }>()

  set(key: string, value: T, ttlMs: number) {
    this.cache.set(key, { value, expiresAt: Date.now() + ttlMs })
  }

  get(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }
    return entry.value
  }

  delete(key: string) { this.cache.delete(key) }
  clear() { this.cache.clear() }
}

// 带缓存的 fetch（单次会话去重）
const pendingRequests = new Map<string, Promise<any>>()

async function cachedFetch<T>(url: string, ttlMs = 60_000): Promise<T> {
  const memCache = globalThis.__memCache as MemoryCache<T>

  const cached = memCache?.get(url)
  if (cached) return cached

  // 防止并发重复请求
  if (pendingRequests.has(url)) return pendingRequests.get(url)

  const promise = fetch(url).then(r => r.json() as T)
  pendingRequests.set(url, promise)

  try {
    const data = await promise
    memCache?.set(url, data, ttlMs)
    return data
  } finally {
    pendingRequests.delete(url)
  }
}
```

## TanStack Query 缓存

用 TanStack Query 管理服务端数据缓存，是目前最优雅的方案：

```typescript
// 配置全局缓存时间
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // 5分钟内不重新请求
      gcTime: 10 * 60 * 1000,     // 10分钟后清除内存缓存
      retry: 2,                   // 失败重试 2 次
      refetchOnWindowFocus: true, // 窗口聚焦时重新验证
    },
  },
})

// 预取数据（提前加载）
await queryClient.prefetchQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
})

// 手动失效缓存
queryClient.invalidateQueries({ queryKey: ['users'] })
```

## 延伸阅读

- [MDN - HTTP 缓存](https://developer.mozilla.org/zh-CN/docs/Web/HTTP/Caching)
- [web.dev - 缓存最佳实践](https://web.dev/articles/http-cache)
- [Jake Archibald - Service Worker 指南](https://jakearchibald.com/2014/offline-cookbook/)
- [Workbox - Service Worker 工具库](https://developer.chrome.com/docs/workbox)
