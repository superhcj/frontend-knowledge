# PWA（渐进式 Web 应用）

> PWA 让 Web 应用拥有接近原生 App 的体验：可安装、离线可用、后台推送。

## PWA 三要素

```
1. HTTPS（安全连接）
2. Service Worker（离线能力、后台同步）
3. Web App Manifest（可安装性）
```

## Web App Manifest

```json
// public/manifest.json
{
  "name": "我的应用",
  "short_name": "应用",
  "description": "一个渐进式 Web 应用",
  "start_url": "/",
  "display": "standalone",         // standalone | fullscreen | minimal-ui | browser
  "orientation": "portrait",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    {
      "src": "/icons/icon-512-maskable.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"         // 适配圆角图标
    }
  ],
  "screenshots": [
    { "src": "/screenshots/desktop.png", "sizes": "1280x800", "form_factor": "wide" },
    { "src": "/screenshots/mobile.png",  "sizes": "390x844",  "form_factor": "narrow" }
  ],
  "shortcuts": [
    {
      "name": "新建任务",
      "url": "/tasks/new",
      "icons": [{ "src": "/icons/new-task.png", "sizes": "96x96" }]
    }
  ]
}
```

```html
<!-- index.html 中引入 -->
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#3b82f6">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<link rel="apple-touch-icon" href="/icons/icon-192.png">
```

## Service Worker 完整实现

```javascript
// public/sw.js
const CACHE_VERSION = 'v2'
const STATIC_CACHE = `static-${CACHE_VERSION}`
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`

// 需要预缓存的核心资源
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/icons/icon-192.png',
]

// ===== 生命周期 =====

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(k => ![STATIC_CACHE, DYNAMIC_CACHE].includes(k))
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

// ===== 请求拦截 =====

self.addEventListener('fetch', event => {
  const { request } = event

  // 只处理 GET 请求
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // API 请求：网络优先，超时后用缓存
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirstWithTimeout(request, 3000))
    return
  }

  // 页面导航：网络优先，离线时返回 offline.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/offline.html'))
    )
    return
  }

  // 静态资源：缓存优先
  event.respondWith(cacheFirst(request))
})

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  const response = await fetch(request)
  if (response.ok) {
    const cache = await caches.open(DYNAMIC_CACHE)
    cache.put(request, response.clone())
  }
  return response
}

async function networkFirstWithTimeout(request, timeout) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(request, { signal: controller.signal })
    clearTimeout(timeoutId)

    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    clearTimeout(timeoutId)
    const cached = await caches.match(request)
    return cached ?? new Response(JSON.stringify({ error: '离线' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
```

## Vite PWA 插件（推荐）

自动生成 Service Worker，配置简单：

```bash
npm install -D vite-plugin-pwa
```

```typescript
// vite.config.ts
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',  // 自动更新 SW
      workbox: {
        // 预缓存 Vite 构建的所有资源
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // API 请求：网络优先
            urlPattern: /^https:\/\/api\.example\.com\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxAgeSeconds: 60 * 60 },  // 1小时
            },
          },
          {
            // 图片：缓存优先
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
        ],
      },
      manifest: {
        name: '我的 PWA',
        short_name: 'PWA',
        theme_color: '#3b82f6',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
```

## 安装提示（A2HS）

```typescript
// 自定义安装按钮
function InstallPWA() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setInstalled(true))

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (installed || !installPrompt) return null

  return (
    <button
      onClick={async () => {
        installPrompt.prompt()
        const { outcome } = await installPrompt.userChoice
        if (outcome === 'accepted') setInstalled(true)
        setInstallPrompt(null)
      }}
    >
      安装应用
    </button>
  )
}
```

## 推送通知

```javascript
// 请求通知权限
async function requestNotificationPermission() {
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return

  // 订阅推送
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  })

  // 把订阅信息发给服务器
  await fetch('/api/push/subscribe', {
    method: 'POST',
    body: JSON.stringify(subscription),
    headers: { 'Content-Type': 'application/json' },
  })
}

// SW 中接收推送
self.addEventListener('push', event => {
  const data = event.data?.json()
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/badge.png',
      data: { url: data.url },
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  )
})
```

## 延伸阅读

- [web.dev - PWA 系列](https://web.dev/progressive-web-apps/)
- [Vite PWA 插件文档](https://vite-pwa-org.netlify.app/)
- [Workbox 文档](https://developer.chrome.com/docs/workbox)
- [PWA Stats](https://www.pwastats.com/) — PWA 成效案例
